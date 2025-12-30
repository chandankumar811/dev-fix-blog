---
title: "Fix 401 Unauthorized Error in Axios"
description: "Troubleshoot and resolve 401 Unauthorized errors in Axios with practical examples and solutions."
date: "2024-01-25"
author: "DevFixPro"
category: "Error Fixes"
tags: ["Axios", "HTTP", "Authentication", "Error Handling"]
---

# What Does This Error Mean?

A **401 Unauthorized** error means the server rejected your request because:

- **No authentication credentials** were provided
- **Invalid or expired** authentication token
- **Incorrect credentials** (username/password)
- **Missing authorization headers**

```typescript
// ❌ Error response
{
  status: 401,
  message: "Unauthorized",
  error: "Invalid or missing authentication token"
}
```

The server is telling you: "I need to verify who you are before I can process this request."

## Common Causes & Fixes

### 1. Missing Authorization Header

**Problem:**
```typescript
// ❌ No auth header sent
const response = await axios.get('https://api.example.com/user/profile');
```

**Fix:**
```typescript
// ✅ Add Bearer token to headers
const response = await axios.get('https://api.example.com/user/profile', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

// Or use axios defaults
axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
```

### 2. Expired or Invalid Token

**Problem:**
```typescript
// ❌ Using old/expired token
const token = localStorage.getItem('token'); // Token expired
const response = await axios.get('/api/data', {
  headers: { Authorization: `Bearer ${token}` }
});
```

**Fix:**
```typescript
// ✅ Refresh token before request
async function getValidToken() {
  const token = localStorage.getItem('token');
  const expiry = localStorage.getItem('tokenExpiry');
  
  if (!token || Date.now() >= expiry) {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await axios.post('/auth/refresh', { refreshToken });
    
    localStorage.setItem('token', response.data.accessToken);
    localStorage.setItem('tokenExpiry', response.data.expiresAt);
    
    return response.data.accessToken;
  }
  
  return token;
}

// Use the valid token
const token = await getValidToken();
const response = await axios.get('/api/data', {
  headers: { Authorization: `Bearer ${token}` }
});
```

### 3. Wrong Token Format

**Problem:**
```typescript
// ❌ Missing "Bearer" prefix or wrong format
headers: {
  'Authorization': accessToken  // Wrong
}

// ❌ Extra spaces
headers: {
  'Authorization': `Bearer  ${accessToken}`  // Double space
}
```

**Fix:**
```typescript
// ✅ Correct format
headers: {
  'Authorization': `Bearer ${accessToken}`
}

// For Basic Auth
const credentials = btoa(`${username}:${password}`);
headers: {
  'Authorization': `Basic ${credentials}`
}

// For API Keys
headers: {
  'X-API-Key': apiKey,
  // or
  'Authorization': `ApiKey ${apiKey}`
}
```

### 4. Token Not Persisted After Login

**Problem:**
```typescript
// ❌ Token not saved after login
async function login(email, password) {
  const response = await axios.post('/auth/login', { email, password });
  console.log(response.data.token); // Token received but not stored
}

// Later request fails
const response = await axios.get('/api/profile'); // 401 error
```

**Fix:**
```typescript
// ✅ Save token after successful login
async function login(email, password) {
  try {
    const response = await axios.post('/auth/login', { email, password });
    
    // Store token
    localStorage.setItem('token', response.data.accessToken);
    localStorage.setItem('refreshToken', response.data.refreshToken);
    localStorage.setItem('tokenExpiry', response.data.expiresAt);
    
    // Set default header for future requests
    axios.defaults.headers.common['Authorization'] = 
      `Bearer ${response.data.accessToken}`;
    
    return response.data;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}
```

### 5. CORS and Credentials Not Sent

**Problem:**
```typescript
// ❌ Cookies not sent with cross-origin requests
const response = await axios.get('https://api.example.com/data');
```

**Fix:**
```typescript
// ✅ Enable credentials for cross-origin requests
const response = await axios.get('https://api.example.com/data', {
  withCredentials: true // Send cookies
});

// Or set globally
axios.defaults.withCredentials = true;

// Backend must also allow credentials (Express example)
app.use(cors({
  origin: 'https://yourfrontend.com',
  credentials: true
}));
```

### 6. Interceptor Not Configured

**Problem:**
```typescript
// ❌ Manually adding headers to every request
axios.get('/api/users', { headers: { Authorization: `Bearer ${token}` }});
axios.post('/api/posts', data, { headers: { Authorization: `Bearer ${token}` }});
```

**Fix:**
```typescript
// ✅ Use axios interceptor to add headers automatically
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Now all requests include the token automatically
axios.get('/api/users');
axios.post('/api/posts', data);
```

## Best Practices to Avoid This Error

### 1. Implement Automatic Token Refresh

```typescript
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axios(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      
      try {
        const response = await axios.post('/auth/refresh', { refreshToken });
        const { accessToken } = response.data;
        
        localStorage.setItem('token', accessToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        
        processQueue(null, accessToken);
        
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return axios(originalRequest);
      } catch (err) {
        processQueue(err, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

### 2. Create an Axios Instance with Default Config

```typescript
// api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
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
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth data and redirect to login
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 3. Secure Token Storage

```typescript
// ✅ Better: Use httpOnly cookies (backend sets them)
// Frontend automatically sends them with requests

// If using localStorage, implement encryption
import CryptoJS from 'crypto-js';

const SECRET_KEY = process.env.REACT_APP_SECRET_KEY;

export const secureStorage = {
  setItem: (key: string, value: string) => {
    const encrypted = CryptoJS.AES.encrypt(value, SECRET_KEY).toString();
    localStorage.setItem(key, encrypted);
  },
  
  getItem: (key: string) => {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;
    
    const decrypted = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
    return decrypted.toString(CryptoJS.enc.Utf8);
  },
  
  removeItem: (key: string) => {
    localStorage.removeItem(key);
  }
};

// Usage
secureStorage.setItem('token', accessToken);
const token = secureStorage.getItem('token');
```

### 4. Handle Authentication Errors Gracefully

```typescript
async function makeAuthenticatedRequest(url: string, options = {}) {
  try {
    const response = await axios.get(url, options);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        // Handle unauthorized
        console.error('Authentication required. Please log in.');
        // Redirect to login or show login modal
        window.location.href = '/login';
      } else if (error.response?.status === 403) {
        // Handle forbidden
        console.error('Access denied. Insufficient permissions.');
      } else {
        console.error('Request failed:', error.message);
      }
    }
    throw error;
  }
}
```

### 5. Implement Proper Logout

```typescript
export const logout = async () => {
  try {
    // Call logout endpoint to invalidate token on server
    await axios.post('/auth/logout', {}, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiry');
    
    // Clear axios defaults
    delete axios.defaults.headers.common['Authorization'];
    
    // Redirect to login
    window.location.href = '/login';
  }
};
```

## Quick Debug Checklist

When you get a 401 error:

1. ✅ Check if token exists in storage
2. ✅ Verify token is not expired
3. ✅ Ensure Authorization header is properly formatted
4. ✅ Check if "Bearer" prefix is included (if required)
5. ✅ Verify token is sent with the request (check Network tab)
6. ✅ Test token with API testing tool (Postman/Insomnia)
7. ✅ Check if credentials need to be included (`withCredentials`)
8. ✅ Verify backend CORS settings allow credentials
9. ✅ Check if API endpoint requires specific auth type
10. ✅ Ensure backend auth middleware is working correctly

## Example: Complete Authentication Setup

```typescript
// auth.service.ts
import axios from 'axios';

const API_URL = 'https://api.example.com';

export class AuthService {
  private static tokenKey = 'accessToken';
  private static refreshTokenKey = 'refreshToken';

  static async login(email: string, password: string) {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });

      const { accessToken, refreshToken } = response.data;
      
      localStorage.setItem(this.tokenKey, accessToken);
      localStorage.setItem(this.refreshTokenKey, refreshToken);
      
      this.setAuthHeader(accessToken);
      
      return response.data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  static async refreshAccessToken() {
    const refreshToken = localStorage.getItem(this.refreshTokenKey);
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post(`${API_URL}/auth/refresh`, {
        refreshToken
      });

      const { accessToken } = response.data;
      
      localStorage.setItem(this.tokenKey, accessToken);
      this.setAuthHeader(accessToken);
      
      return accessToken;
    } catch (error) {
      this.logout();
      throw error;
    }
  }

  static logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    delete axios.defaults.headers.common['Authorization'];
    window.location.href = '/login';
  }

  static setAuthHeader(token: string) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  static getAccessToken() {
    return localStorage.getItem(this.tokenKey);
  }

  static isAuthenticated() {
    return !!this.getAccessToken();
  }
}

// Setup interceptors
axios.interceptors.request.use(
  (config) => {
    const token = AuthService.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const token = await AuthService.refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return axios(originalRequest);
      } catch (refreshError) {
        AuthService.logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

## Summary

The **401 Unauthorized** error occurs when authentication fails or is missing.

**Key solutions:**
- Always include `Authorization` header with valid token
- Use `Bearer ${token}` format for JWT tokens
- Implement automatic token refresh with interceptors
- Store tokens securely
- Handle token expiration gracefully
- Enable `withCredentials` for cookie-based auth
- Clear tokens on logout
- Test authentication flow thoroughly

## Related Problems

- [Fix CORS Error in Axios](/problems/cors-error-axios)
- [Fix Cannot Read Property of Undefined in NestJS](/problems/cannot-read-property-undefined-nestjs)
- [Handle Network Errors in Axios](/problems/axios-network-error)