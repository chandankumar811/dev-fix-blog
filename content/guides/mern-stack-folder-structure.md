---
title: "MERN Stack: Best Folder Structure for Production Apps"
description: "Setup guide for scalable, production-ready MERN stack applications with proper folder organization."
date: "2024-01-18"
category: "Architecture"
---

# MERN Stack: Best Folder Structure

Learn how to organize your MERN (MongoDB, Express, React, Node.js) stack application for scalability and maintainability.

## Why Folder Structure Matters

A well-organized folder structure:
- Makes code easier to navigate
- Improves team collaboration
- Scales better as your app grows
- Follows industry best practices
- Reduces technical debt

## Complete MERN Project Structure

```
mern-app/
├── client/                 # Frontend React application
│   ├── public/
│   │   ├── index.html
│   │   └── favicon.ico
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   │   ├── common/
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Input.jsx
│   │   │   │   └── Modal.jsx
│   │   │   └── layout/
│   │   │       ├── Header.jsx
│   │   │       ├── Footer.jsx
│   │   │       └── Sidebar.jsx
│   │   ├── pages/          # Page components
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── Profile.jsx
│   │   ├── hooks/          # Custom React hooks
│   │   │   ├── useAuth.js
│   │   │   ├── useFetch.js
│   │   │   └── useForm.js
│   │   ├── context/        # React Context providers
│   │   │   ├── AuthContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   ├── services/       # API calls
│   │   │   ├── api.js
│   │   │   ├── authService.js
│   │   │   └── userService.js
│   │   ├── utils/          # Helper functions
│   │   │   ├── validators.js
│   │   │   └── formatters.js
│   │   ├── styles/         # Global styles
│   │   │   ├── globals.css
│   │   │   └── variables.css
│   │   ├── App.jsx
│   │   └── index.js
│   ├── package.json
│   └── .env
│
├── server/                 # Backend Node.js application
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   │   ├── database.js
│   │   │   ├── jwt.js
│   │   │   └── cors.js
│   │   ├── controllers/    # Route controllers
│   │   │   ├── authController.js
│   │   │   ├── userController.js
│   │   │   └── postController.js
│   │   ├── models/         # Database models
│   │   │   ├── User.js
│   │   │   ├── Post.js
│   │   │   └── Comment.js
│   │   ├── routes/         # API routes
│   │   │   ├── auth.js
│   │   │   ├── users.js
│   │   │   └── posts.js
│   │   ├── middleware/     # Custom middleware
│   │   │   ├── auth.js
│   │   │   ├── errorHandler.js
│   │   │   └── validator.js
│   │   ├── utils/          # Helper functions
│   │   │   ├── logger.js
│   │   │   └── emailService.js
│   │   ├── validators/     # Request validation
│   │   │   ├── userValidator.js
│   │   │   └── postValidator.js
│   │   ├── app.js          # Express app setup
│   │   └── server.js       # Server entry point
│   ├── package.json
│   └── .env
│
├── shared/                 # Shared code between client/server
│   ├── constants.js
│   └── types.js
│
├── docker-compose.yml      # Docker configuration
├── .gitignore
└── README.md
```

## Backend Setup (Server)

### 1. Install Dependencies

```bash
cd server
npm init -y
npm install express mongoose dotenv cors bcryptjs jsonwebtoken
npm install -D nodemon
```

### 2. Create server.js

```javascript
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 3. Create User Model (models/User.js)

```javascript
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('User', userSchema);
```

### 4. Create Auth Controller (controllers/authController.js)

```javascript
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
```

## Frontend Setup (Client)

### 1. Create React App

```bash
npx create-react-app client
cd client
npm install axios react-router-dom
```

### 2. Create API Service (services/api.js)

```javascript
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
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

export default api;
```

### 3. Create Auth Service (services/authService.js)

```javascript
import api from './api';

export const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  register: async (name, email, password) => {
    const response = await api.post('/auth/register', { name, email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    return JSON.parse(localStorage.getItem('user'));
  },
};
```

## Environment Variables

### Server .env

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/mern-app
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=development
```

### Client .env

```env
REACT_APP_API_URL=http://localhost:5000/api
```

## Running the Application

### Development Mode

```bash
# Terminal 1 - Start Backend
cd server
npm run dev

# Terminal 2 - Start Frontend
cd client
npm start
```

### Production Build

```bash
# Build frontend
cd client
npm run build

# Serve frontend from backend
cd ../server
# Add this to your server.js:
# app.use(express.static(path.join(__dirname, '../client/build')));
```

## Best Practices

1. **Separation of Concerns** - Keep frontend and backend separate
2. **Environment Variables** - Never commit sensitive data
3. **Error Handling** - Implement proper error handling on both sides
4. **Validation** - Validate data on both frontend and backend
5. **Security** - Use JWT for authentication, bcrypt for passwords
6. **Code Organization** - Keep files small and focused
7. **Naming Conventions** - Use consistent naming across the project
8. **Documentation** - Comment complex logic

## Docker Setup (Optional)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    ports:
      - '27017:27017'
    volumes:
      - mongo-data:/data/db

  server:
    build: ./server
    ports:
      - '5000:5000'
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/mern-app
    depends_on:
      - mongodb

  client:
    build: ./client
    ports:
      - '3000:3000'
    depends_on:
      - server

volumes:
  mongo-data:
```

## Conclusion

This MERN stack structure is scalable, maintainable, and follows industry best practices. Adjust it based on your project needs!

## Related Guides

- [JWT Authentication in NestJS](./jwt-authentication-nestjs)
- [Deploy NestJS to VPS](./deploy-nestjs-to-vps)
- [MongoDB Best Practices](./mongodb-best-practices)