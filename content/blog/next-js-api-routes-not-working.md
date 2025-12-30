---
title: "Fix Next.js API Routes Not Working"
description: "Troubleshoot and resolve Next.js API route issues with practical examples and solutions."
date: "2024-01-25"
author: "DevFixPro"
category: "Error Fixes"
tags: ["Next.js", "API Routes", "React", "Error Handling"]
---

# What Does This Error Mean?

When Next.js API routes aren't working, you might see:

- **404 Not Found** - API route not being recognized
- **405 Method Not Allowed** - Wrong HTTP method
- **500 Internal Server Error** - Server-side error in API route
- **API route returns empty response** or unexpected data
- **CORS errors** when calling from external domains

```
GET http://localhost:3000/api/users 404 (Not Found)
Error: API resolved without sending a response
```

This usually means the API route isn't configured correctly or there's an issue with how it's being called.

## Common Causes & Fixes

### 1. Incorrect File Location or Naming

**Problem:**
```
❌ Wrong structure:
pages/
  api.js          // Wrong - should be a folder
  api-users.js    // Wrong - not in api folder
  api/
    user.js       // Works but inconsistent naming
```

**Fix:**
```
✅ Correct structure:
pages/
  api/
    hello.js           // /api/hello
    users.js           // /api/users
    posts/
      index.js         // /api/posts
      [id].js          // /api/posts/:id
    auth/
      login.js         // /api/auth/login
      [...auth].js     // Catch-all: /api/auth/*
```

```javascript
// pages/api/hello.js
export default function handler(req, res) {
  res.status(200).json({ message: 'Hello from API' });
}

// pages/api/users/[id].js
export default function handler(req, res) {
  const { id } = req.query;
  res.status(200).json({ userId: id });
}
```

### 2. Using App Router Instead of Pages Router

**Problem (Next.js 13+ App Router):**
```
❌ Wrong location for App Router:
app/
  api/
    users.js        // Won't work - wrong structure
pages/
  api/
    users.js        // This is for Pages Router only
```

**Fix for App Router (Next.js 13+):**
```
✅ Correct App Router structure:
app/
  api/
    users/
      route.js      // /api/users endpoint
    posts/
      [id]/
        route.js    // /api/posts/:id endpoint
```

```javascript
// app/api/users/route.js (App Router)
import { NextResponse } from 'next/server';

// GET /api/users
export async function GET(request) {
  const users = [
    { id: 1, name: 'John' },
    { id: 2, name: 'Jane' }
  ];
  
  return NextResponse.json(users);
}

// POST /api/users
export async function POST(request) {
  const body = await request.json();
  
  return NextResponse.json(
    { message: 'User created', data: body },
    { status: 201 }
  );
}

// app/api/posts/[id]/route.js
export async function GET(request, { params }) {
  const { id } = params;
  
  return NextResponse.json({ postId: id });
}
```

### 3. Not Exporting Default Function

**Problem:**
```javascript
// ❌ Named export won't work
export const handler = (req, res) => {
  res.status(200).json({ message: 'Hello' });
};

// ❌ No export at all
function handler(req, res) {
  res.status(200).json({ message: 'Hello' });
}
```

**Fix:**
```javascript
// ✅ Default export (Pages Router)
export default function handler(req, res) {
  res.status(200).json({ message: 'Hello' });
}

// ✅ Or with arrow function
const handler = (req, res) => {
  res.status(200).json({ message: 'Hello' });
};

export default handler;

// ✅ Named exports for App Router
export async function GET(request) {
  return NextResponse.json({ message: 'Hello' });
}
```

### 4. Wrong HTTP Method Handling

**Problem:**
```javascript
// ❌ Not handling specific HTTP methods
export default function handler(req, res) {
  // Always runs for GET, POST, PUT, DELETE, etc.
  const data = req.body; // Undefined for GET requests
  res.status(200).json(data);
}
```

**Fix (Pages Router):**
```javascript
// ✅ Check HTTP method
export default function handler(req, res) {
  const { method } = req;
  
  switch (method) {
    case 'GET':
      return res.status(200).json({ message: 'GET request' });
      
    case 'POST':
      const data = req.body;
      return res.status(201).json({ message: 'Created', data });
      
    case 'PUT':
      return res.status(200).json({ message: 'Updated' });
      
    case 'DELETE':
      return res.status(200).json({ message: 'Deleted' });
      
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).json({ error: `Method ${method} not allowed` });
  }
}

// ✅ Cleaner approach with early returns
export default async function handler(req, res) {
  if (req.method === 'GET') {
    const users = await getUsers();
    return res.status(200).json(users);
  }
  
  if (req.method === 'POST') {
    const newUser = await createUser(req.body);
    return res.status(201).json(newUser);
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
```

**Fix (App Router):**
```javascript
// ✅ Separate named exports for each method
import { NextResponse } from 'next/server';

export async function GET(request) {
  return NextResponse.json({ message: 'GET request' });
}

export async function POST(request) {
  const body = await request.json();
  return NextResponse.json({ message: 'Created', data: body }, { status: 201 });
}

export async function PUT(request) {
  const body = await request.json();
  return NextResponse.json({ message: 'Updated', data: body });
}

export async function DELETE(request) {
  return NextResponse.json({ message: 'Deleted' });
}
```

### 5. Not Sending Response

**Problem:**
```javascript
// ❌ Forgot to send response
export default function handler(req, res) {
  const data = { message: 'Hello' };
  // Missing res.json() or res.send()
}
// Error: API resolved without sending a response

// ❌ Async function without return
export default async function handler(req, res) {
  const data = await fetchData();
  res.json(data); // Should use return
}
```

**Fix:**
```javascript
// ✅ Always send a response
export default function handler(req, res) {
  const data = { message: 'Hello' };
  return res.status(200).json(data);
}

// ✅ With async/await
export default async function handler(req, res) {
  try {
    const data = await fetchData();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// ✅ App Router - always return NextResponse
export async function GET(request) {
  const data = await fetchData();
  return NextResponse.json(data);
}
```

### 6. CORS Issues

**Problem:**
```javascript
// ❌ External domains blocked by CORS
// Frontend at https://example.com calls API at https://yourapp.com
fetch('https://yourapp.com/api/data')
  .then(res => res.json());
// Error: CORS policy blocked
```

**Fix (Pages Router):**
```javascript
// ✅ Add CORS headers
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*'); // Or specific domain
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Handle actual request
  if (req.method === 'GET') {
    return res.status(200).json({ message: 'Success' });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

// ✅ Or use a middleware helper
function withCORS(handler) {
  return async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    return handler(req, res);
  };
}

export default withCORS(async (req, res) => {
  return res.status(200).json({ message: 'Hello with CORS' });
});
```

**Fix (App Router):**
```javascript
// ✅ Add CORS headers to NextResponse
import { NextResponse } from 'next/server';

export async function GET(request) {
  const data = { message: 'Hello' };
  
  return NextResponse.json(data, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
```

## Best Practices for Next.js API Routes

### 1. Complete CRUD API Example (Pages Router)

```javascript
// pages/api/users/index.js
export default async function handler(req, res) {
  const { method } = req;
  
  try {
    switch (method) {
      case 'GET':
        // Get all users
        const users = await getUsers();
        return res.status(200).json(users);
        
      case 'POST':
        // Create user
        const { name, email } = req.body;
        
        if (!name || !email) {
          return res.status(400).json({ 
            error: 'Name and email are required' 
          });
        }
        
        const newUser = await createUser({ name, email });
        return res.status(201).json(newUser);
        
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ 
          error: `Method ${method} not allowed` 
        });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

// pages/api/users/[id].js
export default async function handler(req, res) {
  const { method, query } = req;
  const { id } = query;
  
  try {
    switch (method) {
      case 'GET':
        // Get single user
        const user = await getUserById(id);
        
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        return res.status(200).json(user);
        
      case 'PUT':
        // Update user
        const updates = req.body;
        const updatedUser = await updateUser(id, updates);
        
        if (!updatedUser) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        return res.status(200).json(updatedUser);
        
      case 'DELETE':
        // Delete user
        const deleted = await deleteUser(id);
        
        if (!deleted) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        return res.status(200).json({ message: 'User deleted' });
        
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ 
          error: `Method ${method} not allowed` 
        });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
```

### 2. Complete CRUD API Example (App Router)

```javascript
// app/api/users/route.js
import { NextResponse } from 'next/server';
import { getUsers, createUser } from '@/lib/db';

export async function GET(request) {
  try {
    const users = await getUsers();
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email } = body;
    
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }
    
    const newUser = await createUser({ name, email });
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

// app/api/users/[id]/route.js
import { NextResponse } from 'next/server';
import { getUserById, updateUser, deleteUser } from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const user = await getUserById(id);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    
    const updatedUser = await updateUser(id, body);
    
    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedUser);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const deleted = await deleteUser(id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'User deleted' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
```

### 3. Middleware for API Routes

```javascript
// lib/middleware.js

// Authentication middleware
export function withAuth(handler) {
  return async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
      const user = await verifyToken(token);
      req.user = user;
      return handler(req, res);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

// Validation middleware
export function withValidation(schema) {
  return (handler) => async (req, res) => {
    try {
      await schema.validate(req.body);
      return handler(req, res);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  };
}

// Error handling middleware
export function withErrorHandler(handler) {
  return async (req, res) => {
    try {
      return await handler(req, res);
    } catch (error) {
      console.error('API Error:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };
}

// Compose middlewares
export function compose(...middlewares) {
  return (handler) => {
    return middlewares.reduceRight((acc, middleware) => {
      return middleware(acc);
    }, handler);
  };
}

// Usage
import { compose, withAuth, withErrorHandler } from '@/lib/middleware';

const handler = async (req, res) => {
  // Your API logic here
  return res.status(200).json({ user: req.user });
};

export default compose(
  withErrorHandler,
  withAuth
)(handler);
```

### 4. Environment Variables

```javascript
// .env.local
DATABASE_URL=mongodb://localhost:27017/myapp
JWT_SECRET=your-secret-key
API_KEY=your-api-key

// pages/api/protected.js
export default function handler(req, res) {
  // Access environment variables
  const dbUrl = process.env.DATABASE_URL;
  const jwtSecret = process.env.JWT_SECRET;
  
  // Never expose secrets to client
  res.status(200).json({ 
    message: 'Success',
    // Don't do this: secret: process.env.JWT_SECRET
  });
}

// Only variables prefixed with NEXT_PUBLIC_ are exposed to browser
// NEXT_PUBLIC_API_URL=https://api.example.com
```

### 5. API Route Configuration

```javascript
// pages/api/upload.js

// Disable body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
    // Limit payload size (default: 1mb)
    responseLimit: '10mb',
    // Maximum duration for serverless function
    externalResolver: true,
  },
};

export default async function handler(req, res) {
  // Handle file upload
  return res.status(200).json({ message: 'File uploaded' });
}

// pages/api/large-data.js
export const config = {
  api: {
    // Increase body size limit
    bodyParser: {
      sizeLimit: '10mb',
    },
    // Set response size limit
    responseLimit: '10mb',
  },
};
```

### 6. Testing API Routes

```javascript
// __tests__/api/users.test.js
import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/users';

describe('/api/users', () => {
  test('GET returns list of users', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String),
        }),
      ])
    );
  });

  test('POST creates a new user', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        name: 'John Doe',
        email: 'john@example.com',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(201);
    expect(JSON.parse(res._getData())).toEqual(
      expect.objectContaining({
        name: 'John Doe',
        email: 'john@example.com',
      })
    );
  });

  test('POST returns 400 for invalid data', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        name: 'John Doe',
        // Missing email
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
  });
});
```

## Quick Debug Checklist

When API routes aren't working:

1. ✅ Check file is in `pages/api/` folder (Pages Router) or `app/api/*/route.js` (App Router)
2. ✅ Verify default export for Pages Router or named exports for App Router
3. ✅ Confirm HTTP method is handled correctly
4. ✅ Ensure response is being sent (res.json() or return NextResponse)
5. ✅ Check for TypeScript errors if using TypeScript
6. ✅ Verify API route URL matches file structure
7. ✅ Check Next.js dev server is running
8. ✅ Look for errors in terminal/console
9. ✅ Test with API client (Postman/Insomnia) to isolate frontend issues
10. ✅ Check CORS headers if calling from external domain

## Common Error Messages & Solutions

```javascript
// Error: "API resolved without sending a response"
// Solution: Always return a response
export default function handler(req, res) {
  return res.status(200).json({ message: 'Success' });
  // Must use 'return'
}

// Error: "405 Method Not Allowed"
// Solution: Handle the HTTP method
export default function handler(req, res) {
  if (req.method === 'POST') {
    return res.status(200).json({ message: 'POST received' });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

// Error: "Cannot read property of undefined"
// Solution: Check if data exists before accessing
export default function handler(req, res) {
  const { name } = req.body || {};
  
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  
  return res.status(200).json({ name });
}

// Error: "CORS policy blocked"
// Solution: Add CORS headers
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  return res.status(200).json({ message: 'Success' });
}
```

## Summary

Next.js API routes not working is usually due to incorrect file structure or missing exports.

**Key solutions:**
- Place files in `pages/api/` (Pages Router) or `app/api/*/route.js` (App Router)
- Use default export for Pages Router, named exports for App Router
- Always handle HTTP methods explicitly
- Always send a response with return statement
- Add CORS headers for cross-origin requests
- Use proper error handling with try-catch
- Test with proper HTTP methods and payloads
- Check Next.js version for Router compatibility

## Related Problems

- [Fix CORS Error in React](/problems/cors-error-react)
- [Fix 401 Unauthorized Error in Axios](/problems/401-unauthorized-axios)
- [Fix Cannot Read Property of Undefined in NestJS](/problems/cannot-read-property-undefined-nes