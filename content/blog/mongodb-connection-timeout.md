---
title: "Fix MongoDB Connection Timeout Error"
description: "Troubleshoot and resolve MongoDB connection timeout errors with practical examples and solutions."
date: "2024-01-25"
author: "DevFixPro"
category: "Error Fixes"
tags: ["MongoDB", "Database", "Connection", "Error Handling"]
---

# What Does This Error Mean?

A **MongoDB Connection Timeout** error occurs when your application cannot establish a connection to the MongoDB server within the specified time limit.

```
MongooseServerSelectionError: connect ETIMEDOUT
MongoNetworkError: connection timed out
MongooseError: Operation `users.find()` buffering timed out after 10000ms
```

This means the database server is either unreachable, too slow to respond, or the connection is being blocked.

## Common Causes & Fixes

### 1. Wrong Connection String

**Problem:**
```javascript
// ❌ Incorrect connection string
mongoose.connect('mongodb://localhost:27017/myapp');
// Server is actually on MongoDB Atlas, not localhost

// ❌ Missing credentials
mongoose.connect('mongodb+srv://cluster0.mongodb.net/myapp');
// Username and password missing
```

**Fix:**
```javascript
// ✅ Correct local connection
mongoose.connect('mongodb://localhost:27017/myapp');

// ✅ Correct MongoDB Atlas connection
const mongoURI = 'mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/myapp?retryWrites=true&w=majority';
mongoose.connect(mongoURI);

// ✅ Using environment variables (recommended)
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI);

// .env file
// MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/myapp?retryWrites=true&w=majority
```

### 2. IP Address Not Whitelisted (MongoDB Atlas)

**Problem:**
```javascript
// ❌ Your IP is not allowed by Atlas
mongoose.connect(process.env.MONGODB_URI);
// Error: connection timed out
```

**Fix:**
```
✅ MongoDB Atlas Dashboard:
1. Go to Network Access
2. Click "Add IP Address"
3. Choose:
   - "Add Current IP Address" (for your IP)
   - "Allow Access from Anywhere" (0.0.0.0/0) for development
   - Add specific IP for production servers

⚠️ Note: Changes take 1-2 minutes to propagate
```

```javascript
// After whitelisting, connection should work
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
```

### 3. Firewall or Network Issues

**Problem:**
```javascript
// ❌ Port 27017 blocked by firewall
mongoose.connect('mongodb://localhost:27017/myapp');
// Local MongoDB running but port blocked
```

**Fix:**
```bash
# ✅ Check if MongoDB is running
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl status mongod
# or
brew services list

# ✅ Check if port 27017 is open
# Windows
netstat -an | findstr "27017"

# macOS/Linux
sudo lsof -i :27017
# or
netstat -an | grep 27017

# ✅ Allow MongoDB through firewall
# Windows Firewall
netsh advfirewall firewall add rule name="MongoDB" dir=in action=allow protocol=TCP localport=27017

# Linux (ufw)
sudo ufw allow 27017

# macOS
# System Preferences → Security & Privacy → Firewall → Firewall Options
```

### 4. Connection Timeout Too Short

**Problem:**
```javascript
// ❌ Default timeout too short for slow networks
mongoose.connect(mongoURI);
// Times out on slow connection
```

**Fix:**
```javascript
// ✅ Increase timeout values
mongoose.connect(mongoURI, {
  serverSelectionTimeoutMS: 30000, // Increase to 30 seconds
  socketTimeoutMS: 45000, // Socket timeout
  connectTimeoutMS: 30000, // Connection timeout
});

// ✅ With additional options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  family: 4, // Use IPv4, skip trying IPv6
  maxPoolSize: 10,
  minPoolSize: 5,
};

mongoose.connect(process.env.MONGODB_URI, options);
```

### 5. MongoDB Service Not Running

**Problem:**
```javascript
// ❌ Trying to connect when MongoDB isn't running
mongoose.connect('mongodb://localhost:27017/myapp');
// Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Fix:**
```bash
# ✅ Start MongoDB service

# Windows
net start MongoDB

# macOS (Homebrew)
brew services start mongodb-community

# Linux (systemd)
sudo systemctl start mongod
sudo systemctl enable mongod  # Start on boot

# Verify MongoDB is running
mongo --eval "db.version()"
# or
mongosh --eval "db.version()"
```

### 6. Wrong MongoDB Version or Deprecated Options

**Problem:**
```javascript
// ❌ Using deprecated options
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true
});
// Warning: These options are no longer needed in Mongoose 6+
```

**Fix:**
```javascript
// ✅ Mongoose 6+ (clean connection)
mongoose.connect(process.env.MONGODB_URI);

// ✅ Mongoose 5.x (with necessary options)
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// ✅ Check your versions
console.log('Mongoose version:', mongoose.version);
// npm list mongoose
// npm list mongodb
```

## Best Practices to Avoid Connection Issues

### 1. Implement Proper Connection Handling

```javascript
// db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const options = {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('Mongoose connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;

// Usage in app.js
const connectDB = require('./db');
connectDB();
```

### 2. Use Connection Retry Logic

```javascript
const mongoose = require('mongoose');

const connectWithRetry = async (maxRetries = 5) => {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 30000,
      });
      
      console.log('MongoDB connected successfully');
      return;
    } catch (error) {
      retries++;
      console.error(`MongoDB connection attempt ${retries} failed:`, error.message);
      
      if (retries === maxRetries) {
        console.error('Max retries reached. Exiting...');
        process.exit(1);
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, retries), 30000);
      console.log(`Retrying in ${delay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

connectWithRetry();
```

### 3. Environment-Based Configuration

```javascript
// config/database.js
const getDatabaseConfig = () => {
  const env = process.env.NODE_ENV || 'development';

  const configs = {
    development: {
      uri: process.env.MONGODB_URI_DEV || 'mongodb://localhost:27017/myapp_dev',
      options: {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
      }
    },
    test: {
      uri: process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/myapp_test',
      options: {
        serverSelectionTimeoutMS: 10000,
      }
    },
    production: {
      uri: process.env.MONGODB_URI,
      options: {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        maxPoolSize: 50,
        minPoolSize: 10,
        retryWrites: true,
      }
    }
  };

  return configs[env];
};

module.exports = getDatabaseConfig;

// Usage
const mongoose = require('mongoose');
const getDatabaseConfig = require('./config/database');

const config = getDatabaseConfig();
mongoose.connect(config.uri, config.options);
```

### 4. Health Check Endpoint

```javascript
// Express route for health check
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    // Check MongoDB connection
    const dbState = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    if (dbState === 1) {
      // Try a simple query to verify connection works
      await mongoose.connection.db.admin().ping();
      
      res.status(200).json({
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        database: states[dbState],
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
```

### 5. Connection Pooling Configuration

```javascript
const mongoose = require('mongoose');

const connectionOptions = {
  // Connection pool settings
  maxPoolSize: 10, // Maximum number of connections
  minPoolSize: 5,  // Minimum number of connections
  
  // Timeout settings
  serverSelectionTimeoutMS: 30000, // Time to wait for server selection
  socketTimeoutMS: 45000,          // Time to wait for socket operations
  connectTimeoutMS: 30000,         // Time to wait for initial connection
  
  // Heartbeat settings
  heartbeatFrequencyMS: 10000,     // Check server status every 10s
  
  // Other options
  maxIdleTimeMS: 300000,           // Close idle connections after 5 min
  retryWrites: true,               // Retry failed writes
  retryReads: true,                // Retry failed reads
  
  // Use IPv4
  family: 4,
};

mongoose.connect(process.env.MONGODB_URI, connectionOptions);
```

## Quick Debug Checklist

When you encounter a MongoDB timeout:

1. ✅ Verify MongoDB is running (`mongosh` or `mongo` command)
2. ✅ Check connection string format and credentials
3. ✅ Confirm IP is whitelisted in MongoDB Atlas
4. ✅ Test network connectivity (`ping` or `telnet`)
5. ✅ Check firewall settings (port 27017)
6. ✅ Verify environment variables are loaded
7. ✅ Check MongoDB Atlas cluster status (paused?)
8. ✅ Review MongoDB logs for errors
9. ✅ Test connection with MongoDB Compass
10. ✅ Increase timeout values if on slow network

## Testing MongoDB Connection

```javascript
// test-connection.js
require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  console.log('Testing MongoDB connection...');
  console.log('URI:', process.env.MONGODB_URI?.replace(/:[^:@]+@/, ':****@')); // Hide password

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log('✅ Connection successful!');
    console.log('Database:', mongoose.connection.name);
    console.log('Host:', mongoose.connection.host);
    console.log('Port:', mongoose.connection.port);

    // Try a simple operation
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name).join(', '));

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    if (error.message.includes('ETIMEDOUT')) {
      console.log('\nPossible causes:');
      console.log('- IP address not whitelisted (MongoDB Atlas)');
      console.log('- Firewall blocking connection');
      console.log('- Wrong connection string');
      console.log('- MongoDB service not running');
    }
  } finally {
    await mongoose.connection.close();
  }
}

testConnection();
```

## Example: Complete NestJS Setup

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        connectionFactory: (connection) => {
          connection.on('connected', () => {
            console.log('MongoDB connected successfully');
          });
          connection.on('error', (error) => {
            console.error('MongoDB connection error:', error);
          });
          connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
          });
          return connection;
        },
        // Connection options
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 5,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## Example: Complete Express Setup

```javascript
// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// MongoDB connection function
const connectDB = async () => {
  const options = {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 5,
  };

  try {
    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    
    // Retry connection after 5 seconds
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

// Connection event handlers
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    process.exit(1);
  }
});

// Routes
app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'ok',
    database: dbState
  });
});

// Connect to database
connectDB();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Summary

MongoDB connection timeout errors occur when the database is unreachable or slow to respond.

**Key solutions:**
- Verify correct connection string and credentials
- Whitelist IP address in MongoDB Atlas
- Ensure MongoDB service is running
- Check firewall and network settings
- Increase timeout values for slow networks
- Implement retry logic with exponential backoff
- Use connection pooling for better performance
- Monitor connection health with event handlers
- Test connection separately before deployment

## Related Problems

- [Fix Cannot Read Property of Undefined in NestJS](/problems/cannot-read-property-undefined-nestjs)
- [Fix 401 Unauthorized Error in Axios](/problems/401-unauthorized-axios)
- [Fix CORS Error in React](/problems/cors-error-react)