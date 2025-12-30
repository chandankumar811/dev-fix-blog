---
title: "Fix CORS Error in React"
description: "Troubleshoot and resolve CORS errors in React applications with practical examples and solutions."
date: "2024-01-25"
author: "DevFixPro"
category: "Error Fixes"
tags: ["React", "CORS", "HTTP", "Error Handling"]
---

# What Does This Error Mean?

A **CORS (Cross-Origin Resource Sharing)** error occurs when your React app tries to make a request to a different domain, and the server blocks it.

```
Access to fetch at 'https://api.example.com/data' from origin 'http://localhost:3000' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present 
on the requested resource.
```

This happens because browsers enforce the **Same-Origin Policy** for security. The server must explicitly allow your React app's domain to access its resources.

## Common Causes & Fixes

### 1. Missing CORS Headers on Backend

**Problem:**
```javascript
// React app (http://localhost:3000)
fetch('https://api.example.com/users')
  .then(res => res.json())
  .then(data => console.log(data));

// ❌ CORS error: Backend doesn't allow localhost:3000
```

**Fix:**
```javascript
// Backend (Express.js example)
const express = require('express');
const cors = require('cors');
const app = express();

// ✅ Enable CORS for all origins (development only)
app.use(cors());

// ✅ Enable CORS for specific origin (production)
app.use(cors({
  origin: 'https://yourfrontend.com',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ Enable CORS for multiple origins
app.use(cors({
  origin: ['https://yourfrontend.com', 'http://localhost:3000'],
  credentials: true
}));

app.get('/users', (req, res) => {
  res.json({ users: [] });
});

app.listen(5000);
```

### 2. Using Proxy in Development

**Problem:**
```javascript
// ❌ Direct API call causes CORS in development
fetch('http://localhost:5000/api/users')
  .then(res => res.json());
```

**Fix (Create React App):**
```json
// package.json
{
  "name": "my-app",
  "version": "1.0.0",
  "proxy": "http://localhost:5000"
}
```

```javascript
// Now use relative URLs - CRA proxies to localhost:5000
// ✅ No CORS error
fetch('/api/users')
  .then(res => res.json())
  .then(data => console.log(data));
```

**Fix (Vite):**
```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
});
```

```javascript
// Use /api prefix in your requests
fetch('/api/users')
  .then(res => res.json())
  .then(data => console.log(data));
```

### 3. Missing Credentials for Cookies

**Problem:**
```javascript
// ❌ Cookies not sent with request
fetch('https://api.example.com/auth/profile')
  .then(res => res.json());

// Backend receives request but no auth cookie
```

**Fix:**
```javascript
// ✅ Frontend: Include credentials
fetch('https://api.example.com/auth/profile', {
  credentials: 'include' // Send cookies
})
  .then(res => res.json());

// With Axios
axios.get('https://api.example.com/auth/profile', {
  withCredentials: true
});

// ✅ Backend: Allow credentials
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true // Must be true
}));
```

### 4. Preflight Request Failing

**Problem:**
```javascript
// ❌ Custom headers trigger preflight OPTIONS request
fetch('https://api.example.com/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token123'
  },
  body: JSON.stringify({ name: 'John' })
});

// Backend doesn't handle OPTIONS request
```

**Fix:**
```javascript
// ✅ Backend: Handle OPTIONS requests
const cors = require('cors');
const express = require('express');
const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Or manually handle OPTIONS
app.options('*', cors());

app.post('/users', (req, res) => {
  res.json({ success: true });
});
```

### 5. Wrong Backend URL

**Problem:**
```javascript
// ❌ Using HTTP instead of HTTPS
const API_URL = 'http://api.example.com'; // Wrong protocol

fetch(`${API_URL}/users`)
  .then(res => res.json());
```

**Fix:**
```javascript
// ✅ Use correct protocol and URL
const API_URL = process.env.REACT_APP_API_URL || 'https://api.example.com';

fetch(`${API_URL}/users`)
  .then(res => res.json());

// .env file
// REACT_APP_API_URL=https://api.example.com

// .env.development
// REACT_APP_API_URL=http://localhost:5000

// .env.production
// REACT_APP_API_URL=https://api.yourapp.com
```

### 6. Third-Party API Without CORS

**Problem:**
```javascript
// ❌ Third-party API doesn't support CORS
fetch('https://some-third-party-api.com/data')
  .then(res => res.json());

// Cannot modify their backend
```

**Fix:**
```javascript
// ✅ Option 1: Use your own backend as proxy
// Backend endpoint
app.get('/api/proxy', async (req, res) => {
  const response = await fetch('https://some-third-party-api.com/data');
  const data = await response.json();
  res.json(data);
});

// Frontend
fetch('/api/proxy')
  .then(res => res.json());

// ✅ Option 2: Use CORS proxy (development only)
const PROXY = 'https://cors-anywhere.herokuapp.com/';
fetch(PROXY + 'https://some-third-party-api.com/data')
  .then(res => res.json());

// ⚠️ Note: Never use public CORS proxies in production
```

## Best Practices to Avoid CORS Errors

### 1. Environment-Based Configuration

```javascript
// config.js
const config = {
  development: {
    apiUrl: 'http://localhost:5000',
  },
  production: {
    apiUrl: 'https://api.yourapp.com',
  }
};

export const API_URL = config[process.env.NODE_ENV].apiUrl;

// Usage
import { API_URL } from './config';

fetch(`${API_URL}/users`)
  .then(res => res.json());
```

### 2. Centralized API Client

```javascript
// api/client.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  timeout: 10000,
  withCredentials: true, // Include cookies
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.message.includes('CORS')) {
      console.error('CORS Error: Check backend configuration');
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// Usage
import apiClient from './api/client';

apiClient.get('/users')
  .then(res => console.log(res.data));
```

### 3. Backend CORS Configuration (Node.js/Express)

```javascript
// server.js
const express = require('express');
const cors = require('cors');
const app = express();

// Development: Allow all origins
if (process.env.NODE_ENV === 'development') {
  app.use(cors());
}

// Production: Specific origins only
if (process.env.NODE_ENV === 'production') {
  const allowedOrigins = [
    'https://yourapp.com',
    'https://www.yourapp.com'
  ];

  app.use(cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) === -1) {
        return callback(new Error('CORS not allowed'), false);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 600 // Cache preflight for 10 minutes
  }));
}

// Manual CORS headers (alternative)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.listen(5000);
```

### 4. Backend CORS Configuration (NestJS)

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: ['http://localhost:3000', 'https://yourapp.com'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(5000);
}
bootstrap();
```

### 5. Backend CORS Configuration (Django)

```python
# settings.py
INSTALLED_APPS = [
    # ...
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Must be before CommonMiddleware
    'django.middleware.common.CommonMiddleware',
    # ...
]

# Development
CORS_ALLOW_ALL_ORIGINS = True

# Production
CORS_ALLOWED_ORIGINS = [
    'https://yourapp.com',
    'http://localhost:3000',
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]
```

## Quick Debug Checklist

When you encounter a CORS error:

1. ✅ Check browser console for exact CORS error message
2. ✅ Verify backend is running and accessible
3. ✅ Check Network tab - look for OPTIONS preflight request
4. ✅ Verify CORS headers in response (Access-Control-Allow-Origin)
5. ✅ Confirm origin matches exactly (including protocol and port)
6. ✅ Check if credentials: true is set on both frontend and backend
7. ✅ Verify backend handles OPTIONS requests
8. ✅ Test API with Postman/Insomnia (no CORS there)
9. ✅ Check for custom headers triggering preflight
10. ✅ Verify environment variables are loaded correctly

## Development vs Production Solutions

### Development Setup

```javascript
// Option 1: Use proxy in package.json (CRA)
{
  "proxy": "http://localhost:5000"
}

// Option 2: Use proxy in vite.config.js (Vite)
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
});

// Option 3: Enable CORS on backend for localhost
app.use(cors({
  origin: 'http://localhost:3000'
}));
```

### Production Setup

```javascript
// Frontend: Use environment variables
const API_URL = process.env.REACT_APP_API_URL;

// Backend: Whitelist production domains only
app.use(cors({
  origin: ['https://yourapp.com', 'https://www.yourapp.com'],
  credentials: true
}));
```

## Example: Complete Setup

### Frontend (React)

```javascript
// .env.development
REACT_APP_API_URL=http://localhost:5000

// .env.production
REACT_APP_API_URL=https://api.yourapp.com

// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const fetchUsers = () => api.get('/users');
export const createUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);

export default api;

// src/components/Users.jsx
import React, { useEffect, useState } from 'react';
import { fetchUsers } from '../services/api';

function Users() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUsers()
      .then(response => setUsers(response.data))
      .catch(err => {
        console.error('Error fetching users:', err);
        setError('Failed to load users');
      });
  }, []);

  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Users</h1>
      {users.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}

export default Users;
```

### Backend (Express)

```javascript
// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(express.json());

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'https://yourapp.com'
    ];

    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Routes
app.get('/users', (req, res) => {
  res.json([
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Jane Smith' }
  ]);
});

app.post('/users', (req, res) => {
  const newUser = req.body;
  res.status(201).json({ id: 3, ...newUser });
});

// Error handling
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({ error: 'CORS not allowed' });
  } else {
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Summary

CORS errors occur when browsers block cross-origin requests for security.

**Key solutions:**
- Configure CORS headers on your backend
- Use development proxy in package.json or vite.config.js
- Set `credentials: true` for cookie-based auth
- Handle OPTIONS preflight requests
- Use environment variables for different environments
- Whitelist specific origins in production
- Never use `*` (all origins) in production with credentials

## Related Problems

- [Fix 401 Unauthorized Error in Axios](/problems/401-unauthorized-axios)
- [Fix Cannot Read Property of Undefined in NestJS](/problems/cannot-read-property-undefined-nestjs)
- [Handle Network Errors in Axios](/problems/axios-network-error)