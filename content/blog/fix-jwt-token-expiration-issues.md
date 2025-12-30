---
title: "Fix JWT Token Expiration Issues"
description: "Troubleshoot and resolve JWT token expiration problems with practical examples and solutions."
date: "2024-01-25"
author: "DevFixPro"
category: "Error Fixes"
tags: ["JWT", "Authentication", "Token", "Security", "Node.js"]
---

# What Does This Error Mean?

JWT (JSON Web Token) expiration issues occur when:

- **Token has expired** and user gets logged out unexpectedly
- **Token expires too quickly** causing poor user experience
- **Refresh token not working** properly
- **Token validation fails** due to expiration

```
Error: jwt expired
TokenExpiredError: jwt expired
401 Unauthorized: Token has expired
```

This means the token's expiration time (`exp` claim) has passed, and the server rejects authentication.

## Common Causes & Fixes

### 1. Token Expires Too Quickly

**Problem:**
```javascript
// ❌ Token expires in 5 minutes - too short
const token = jwt.sign(
  { userId: user.id },
  process.env.JWT_SECRET,
  { expiresIn: '5m' }
);

// User gets logged out while using the app
```

**Fix:**
```javascript
// ✅ Use appropriate expiration times
const accessToken = jwt.sign(
  { userId: user.id, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: '15m' } // 15 minutes for access token
);

const refreshToken = jwt.sign(
  { userId: user.id },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: '7d' } // 7 days for refresh token
);

// Return both tokens
return {
  accessToken,
  refreshToken,
  expiresIn: 900 // 15 minutes in seconds
};

// Common expiration formats:
// '15m' = 15 minutes
// '1h' = 1 hour
// '1d' = 1 day
// '7d' = 7 days
// 900 = 900 seconds (15 minutes)
```

### 2. No Refresh Token Implementation

**Problem:**
```javascript
// ❌ Only using access token, no refresh mechanism
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: '15m'
  });
  
  res.json({ token });
  // User will be logged out after 15 minutes with no way to refresh
});
```

**Fix:**
```javascript
// ✅ Implement refresh token flow
// login endpoint
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Generate access token (short-lived)
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  // Generate refresh token (long-lived)
  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  
  // Store refresh token in database
  await RefreshToken.create({
    userId: user.id,
    token: refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });
  
  res.json({
    accessToken,
    refreshToken,
    expiresIn: 900
  });
});

// refresh endpoint
app.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }
  
  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Check if refresh token exists in database
    const storedToken = await RefreshToken.findOne({
      userId: decoded.userId,
      token: refreshToken
    });
    
    if (!storedToken) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    // Generate new access token
    const newAccessToken = jwt.sign(
      { userId: decoded.userId },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    res.json({
      accessToken: newAccessToken,
      expiresIn: 900
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});
```

### 3. Not Handling Expired Token on Frontend

**Problem:**
```javascript
// ❌ No handling for expired tokens
const fetchData = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/data', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!response.ok) {
    // User sees error, doesn't know token expired
    throw new Error('Request failed');
  }
  
  return response.json();
};
```

**Fix:**
```javascript
// ✅ Implement automatic token refresh on frontend
import axios from 'axios';

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

// Axios interceptor for automatic refresh
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is due to expired token
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      if (isRefreshing) {
        // If already refreshing, queue this request
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
      
      if (!refreshToken) {
        // No refresh token, redirect to login
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post('/auth/refresh', { refreshToken });
        const { accessToken } = response.data;
        
        // Save new access token
        localStorage.setItem('token', accessToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        
        // Retry all queued requests
        processQueue(null, accessToken);
        
        // Retry original request
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

### 4. Clock Skew Between Client and Server

**Problem:**
```javascript
// ❌ Server and client clocks out of sync
const token = jwt.sign(payload, secret, { expiresIn: '15m' });
// Server time: 2024-01-25 10:00:00
// Client time: 2024-01-25 10:20:00 (20 minutes ahead)
// Token appears expired immediately on client
```

**Fix:**
```javascript
// ✅ Add clock tolerance when verifying tokens
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      clockTolerance: 60 // Allow 60 seconds clock skew
    });
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
    throw error;
  }
};

// ✅ Or check expiration manually with buffer
const isTokenExpired = (token) => {
  try {
    const decoded = jwt.decode(token);
    const currentTime = Math.floor(Date.now() / 1000);
    const bufferTime = 60; // 60 second buffer
    
    return decoded.exp < (currentTime + bufferTime);
  } catch (error) {
    return true;
  }
};
```

### 5. Tokens Not Invalidated on Logout

**Problem:**
```javascript
// ❌ Token still valid after logout
app.post('/logout', (req, res) => {
  // Just clear from client, token still works if intercepted
  res.json({ message: 'Logged out' });
});

// Old token can still be used to access protected routes
```

**Fix:**
```javascript
// ✅ Implement token blacklist or database tracking
// Using Redis for blacklist
const redis = require('redis');
const client = redis.createClient();

app.post('/logout', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(400).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.decode(token);
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
    
    // Add token to blacklist (expires when token would expire)
    await client.setex(`blacklist_${token}`, expiresIn, 'true');
    
    // Delete refresh token from database
    await RefreshToken.deleteOne({ userId: decoded.userId });
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Middleware to check blacklist
const checkBlacklist = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const isBlacklisted = await client.get(`blacklist_${token}`);
  
  if (isBlacklisted) {
    return res.status(401).json({ error: 'Token has been revoked' });
  }
  
  next();
};

// Apply to protected routes
app.get('/protected', checkBlacklist, authMiddleware, (req, res) => {
  res.json({ data: 'Protected data' });
});
```

### 6. Refresh Token Rotation Not Implemented

**Problem:**
```javascript
// ❌ Reusing same refresh token forever
app.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  
  const newAccessToken = jwt.sign(
    { userId: decoded.userId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  res.json({ accessToken: newAccessToken });
  // Same refresh token can be reused indefinitely
});
```

**Fix:**
```javascript
// ✅ Implement refresh token rotation
app.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }
  
  try {
    // Verify old refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Check if refresh token exists and hasn't been used
    const storedToken = await RefreshToken.findOne({
      userId: decoded.userId,
      token: refreshToken,
      used: false
    });
    
    if (!storedToken) {
      // Token reuse detected - possible attack
      await RefreshToken.deleteMany({ userId: decoded.userId });
      return res.status(401).json({ error: 'Token reuse detected' });
    }
    
    // Mark old token as used
    storedToken.used = true;
    await storedToken.save();
    
    // Generate new access token
    const newAccessToken = jwt.sign(
      { userId: decoded.userId },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    // Generate new refresh token
    const newRefreshToken = jwt.sign(
      { userId: decoded.userId },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    
    // Store new refresh token
    await RefreshToken.create({
      userId: decoded.userId,
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      used: false
    });
    
    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});
```

## Best Practices for JWT Token Management

### 1. Complete Authentication Service

```javascript
// auth.service.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const RefreshToken = require('./models/RefreshToken');

class AuthService {
  // Generate token pair
  generateTokens(userId, email) {
    const accessToken = jwt.sign(
      { userId, email },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    const refreshToken = jwt.sign(
      { userId },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    
    return { accessToken, refreshToken };
  }
  
  // Login
  async login(email, password) {
    const user = await User.findOne({ email });
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      throw new Error('Invalid credentials');
    }
    
    const { accessToken, refreshToken } = this.generateTokens(user.id, user.email);
    
    // Store refresh token
    await RefreshToken.create({
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      accessToken,
      refreshToken,
      expiresIn: 900
    };
  }
  
  // Refresh access token
  async refreshAccessToken(refreshToken) {
    if (!refreshToken) {
      throw new Error('Refresh token required');
    }
    
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      
      const storedToken = await RefreshToken.findOne({
        userId: decoded.userId,
        token: refreshToken
      });
      
      if (!storedToken) {
        throw new Error('Invalid refresh token');
      }
      
      const user = await User.findById(decoded.userId);
      const { accessToken, refreshToken: newRefreshToken } = this.generateTokens(
        user.id,
        user.email
      );
      
      // Delete old refresh token
      await RefreshToken.deleteOne({ token: refreshToken });
      
      // Store new refresh token
      await RefreshToken.create({
        userId: user.id,
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
      
      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: 900
      };
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }
  
  // Logout
  async logout(userId, refreshToken) {
    await RefreshToken.deleteMany({
      $or: [
        { userId },
        { token: refreshToken }
      ]
    });
  }
  
  // Verify access token
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET, {
        clockTolerance: 60
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      }
      throw new Error('Invalid token');
    }
  }
}

module.exports = new AuthService();
```

### 2. Auth Middleware with Proper Error Handling

```javascript
// middleware/auth.js
const authService = require('../services/auth.service');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'No token provided',
        code: 'NO_TOKEN'
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    try {
      const decoded = authService.verifyAccessToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      if (error.message === 'Token expired') {
        return res.status(401).json({ 
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

module.exports = authMiddleware;
```

### 3. Frontend Token Management Hook (React)

```javascript
// hooks/useAuth.js
import { useState, useEffect } from 'react';
import axios from 'axios';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem('accessToken');
    if (token) {
      // Validate token or refresh if needed
      validateToken(token);
    } else {
      setLoading(false);
    }
  }, []);

  const validateToken = async (token) => {
    try {
      const response = await axios.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      // Token invalid, try to refresh
      await refreshToken();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user } = response.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      setUser(user);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const refreshToken = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      logout();
      return;
    }

    try {
      const response = await axios.post('/auth/refresh', { refreshToken });
      const { accessToken, refreshToken: newRefreshToken } = response.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      
      return accessToken;
    } catch (error) {
      logout();
      throw error;
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    
    try {
      await axios.post('/auth/logout', { refreshToken });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  return { user, loading, login, logout, refreshToken };
};
```

### 4. Refresh Token Model (Mongoose)

```javascript
// models/RefreshToken.js
const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  used: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for automatic cleanup
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Clean up expired tokens periodically
refreshTokenSchema.statics.cleanup = async function() {
  await this.deleteMany({ expiresAt: { $lt: new Date() } });
};

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
```

### 5. Environment Configuration

```bash
# .env
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-different-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Production values
# JWT_EXPIRES_IN=30m
# JWT_REFRESH_EXPIRES_IN=30d
```

## Quick Debug Checklist

When dealing with JWT expiration issues:

1. ✅ Check token expiration time is appropriate (15m-1h for access, 7-30d for refresh)
2. ✅ Verify refresh token endpoint is implemented
3. ✅ Confirm frontend handles 401 errors and refreshes token
4. ✅ Check server and client clock sync
5. ✅ Verify tokens are being stored correctly (localStorage/cookies)
6. ✅ Ensure refresh token is rotated on use
7. ✅ Check tokens are invalidated on logout
8. ✅ Verify JWT secret is properly set in environment
9. ✅ Check token format and structure with jwt.io
10. ✅ Confirm middleware is checking expiration correctly

## Security Best Practices

```javascript
// 1. Use strong secrets
// Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

// 2. Store refresh tokens securely
// - Use httpOnly cookies for web apps
// - Encrypt in database if possible

// 3. Implement rate limiting on refresh endpoint
const rateLimit = require('express-rate-limit');

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many refresh attempts'
});

app.post('/auth/refresh', refreshLimiter, async (req, res) => {
  // ...refresh logic
});

// 4. Set appropriate expiration times
const expirationConfig = {
  development: {
    access: '1h',
    refresh: '7d'
  },
  production: {
    access: '15m',
    refresh: '30d'
  }
};

// 5. Monitor for suspicious activity
const logTokenRefresh = async (userId, ip) => {
  await AuditLog.create({
    userId,
    action: 'TOKEN_REFRESH',
    ip,
    timestamp: new Date()
  });
};
```

## Summary

JWT token expiration issues can disrupt user experience and security.

**Key solutions:**
- Use appropriate expiration times (15m access, 7d refresh)
- Implement refresh token flow with rotation
- Handle token expiration on frontend with automatic refresh
- Add clock tolerance for time skew
- Invalidate tokens on logout with blacklist
- Store refresh tokens securely in database
- Implement proper error handling for expired tokens
- Use dual-token system (access + refresh)

## Related Problems

- [Fix 401 Unauthorized Error in Axios](/problems/401-unauthorized-axios)
- [Fix Cannot Read Property of Undefined in NestJS](/problems/cannot-read-property-undefined-nestjs)
- [Fix CORS Error in React](/problems/cors-error-react)