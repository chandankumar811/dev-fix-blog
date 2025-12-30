---
title: "SQL Injection Prevention in Node.js"
description: "Learn how to prevent SQL injection attacks in Node.js applications with practical examples and best practices."
date: "2024-01-25"
author: "DevFixPro"
category: "Security"
tags: ["Node.js", "SQL", "Security", "SQL Injection", "Database"]
---

# What is SQL Injection?

**SQL Injection** is a security vulnerability where attackers insert malicious SQL code into your queries, potentially:

- **Reading sensitive data** from your database
- **Modifying or deleting data** without authorization
- **Bypassing authentication** mechanisms
- **Executing admin operations** on the database

```javascript
// ❌ VULNERABLE CODE - Never do this!
const userId = req.params.id; // User input: "1 OR 1=1"
const query = `SELECT * FROM users WHERE id = ${userId}`;
db.query(query);

// Actual query becomes:
// SELECT * FROM users WHERE id = 1 OR 1=1
// Returns ALL users instead of just one!
```

This is one of the most dangerous web vulnerabilities and must be prevented.

## Common Vulnerable Patterns & Fixes

### 1. String Concatenation in Queries

**Problem:**
```javascript
// ❌ DANGEROUS - Direct string concatenation
app.get('/user/:id', async (req, res) => {
  const userId = req.params.id;
  const query = `SELECT * FROM users WHERE id = ${userId}`;
  
  const result = await db.query(query);
  res.json(result);
});

// Attacker sends: /user/1%20OR%201=1
// Query becomes: SELECT * FROM users WHERE id = 1 OR 1=1
// Returns all users!
```

**Fix:**
```javascript
// ✅ SAFE - Use parameterized queries
const mysql = require('mysql2/promise');

app.get('/user/:id', async (req, res) => {
  const userId = req.params.id;
  
  // Using placeholders (?)
  const query = 'SELECT * FROM users WHERE id = ?';
  const [result] = await db.query(query, [userId]);
  
  res.json(result);
});

// With multiple parameters
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  const query = 'SELECT * FROM users WHERE email = ? AND password = ?';
  const [users] = await db.query(query, [email, password]);
  
  if (users.length > 0) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});
```

### 2. Dynamic WHERE Clauses

**Problem:**
```javascript
// ❌ DANGEROUS - Building WHERE clause with user input
app.get('/search', async (req, res) => {
  const { name, email, role } = req.query;
  
  let query = 'SELECT * FROM users WHERE 1=1';
  
  if (name) {
    query += ` AND name = '${name}'`; // Vulnerable!
  }
  if (email) {
    query += ` AND email = '${email}'`; // Vulnerable!
  }
  
  const result = await db.query(query);
  res.json(result);
});
```

**Fix:**
```javascript
// ✅ SAFE - Build parameters array
app.get('/search', async (req, res) => {
  const { name, email, role } = req.query;
  
  let query = 'SELECT * FROM users WHERE 1=1';
  const params = [];
  
  if (name) {
    query += ' AND name = ?';
    params.push(name);
  }
  
  if (email) {
    query += ' AND email = ?';
    params.push(email);
  }
  
  if (role) {
    query += ' AND role = ?';
    params.push(role);
  }
  
  const [result] = await db.query(query, params);
  res.json(result);
});

// ✅ BETTER - Use query builder
const buildSearchQuery = (filters) => {
  const conditions = [];
  const params = [];
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      conditions.push(`${key} = ?`);
      params.push(value);
    }
  });
  
  const whereClause = conditions.length > 0 
    ? `WHERE ${conditions.join(' AND ')}` 
    : '';
  
  return {
    query: `SELECT * FROM users ${whereClause}`,
    params
  };
};

app.get('/search', async (req, res) => {
  const { query, params } = buildSearchQuery(req.query);
  const [result] = await db.query(query, params);
  res.json(result);
});
```

### 3. ORDER BY Clauses with User Input

**Problem:**
```javascript
// ❌ DANGEROUS - User controls ORDER BY
app.get('/users', async (req, res) => {
  const sortBy = req.query.sortBy || 'name';
  const order = req.query.order || 'ASC';
  
  // Vulnerable to injection!
  const query = `SELECT * FROM users ORDER BY ${sortBy} ${order}`;
  const result = await db.query(query);
  res.json(result);
});

// Attacker sends: ?sortBy=name;DROP TABLE users--
```

**Fix:**
```javascript
// ✅ SAFE - Whitelist allowed columns
app.get('/users', async (req, res) => {
  const sortBy = req.query.sortBy || 'name';
  const order = req.query.order || 'ASC';
  
  // Whitelist allowed columns
  const allowedColumns = ['name', 'email', 'created_at', 'role'];
  const allowedOrders = ['ASC', 'DESC'];
  
  // Validate input
  if (!allowedColumns.includes(sortBy)) {
    return res.status(400).json({ error: 'Invalid sort column' });
  }
  
  if (!allowedOrders.includes(order.toUpperCase())) {
    return res.status(400).json({ error: 'Invalid sort order' });
  }
  
  // Safe to use in query since we validated
  const query = `SELECT * FROM users ORDER BY ${sortBy} ${order}`;
  const [result] = await db.query(query);
  res.json(result);
});

// ✅ BETTER - Map user input to safe values
const columnMapping = {
  'name': 'user_name',
  'email': 'user_email',
  'date': 'created_at'
};

app.get('/users', async (req, res) => {
  const sortBy = req.query.sortBy || 'name';
  const column = columnMapping[sortBy] || 'user_name';
  
  const query = `SELECT * FROM users ORDER BY ${column} ASC`;
  const [result] = await db.query(query);
  res.json(result);
});
```

### 4. LIKE Queries with User Input

**Problem:**
```javascript
// ❌ DANGEROUS - User input in LIKE clause
app.get('/search', async (req, res) => {
  const searchTerm = req.query.q;
  
  const query = `SELECT * FROM products WHERE name LIKE '%${searchTerm}%'`;
  const result = await db.query(query);
  res.json(result);
});
```

**Fix:**
```javascript
// ✅ SAFE - Use parameterized LIKE
app.get('/search', async (req, res) => {
  const searchTerm = req.query.q;
  
  // Parameterize the search term
  const query = 'SELECT * FROM products WHERE name LIKE ?';
  const [result] = await db.query(query, [`%${searchTerm}%`]);
  
  res.json(result);
});

// ✅ BETTER - Escape special LIKE characters
const escapeLike = (str) => {
  return str.replace(/[%_]/g, '\\$&');
};

app.get('/search', async (req, res) => {
  const searchTerm = req.query.q;
  const escaped = escapeLike(searchTerm);
  
  const query = 'SELECT * FROM products WHERE name LIKE ?';
  const [result] = await db.query(query, [`%${escaped}%`]);
  
  res.json(result);
});
```

### 5. IN Clauses with Arrays

**Problem:**
```javascript
// ❌ DANGEROUS - Building IN clause manually
app.post('/users/bulk', async (req, res) => {
  const ids = req.body.ids; // [1, 2, 3]
  
  const query = `SELECT * FROM users WHERE id IN (${ids.join(',')})`;
  const result = await db.query(query);
  res.json(result);
});
```

**Fix:**
```javascript
// ✅ SAFE - Use array of parameters
app.post('/users/bulk', async (req, res) => {
  const ids = req.body.ids;
  
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Invalid IDs' });
  }
  
  // Create placeholders for each ID
  const placeholders = ids.map(() => '?').join(',');
  const query = `SELECT * FROM users WHERE id IN (${placeholders})`;
  
  const [result] = await db.query(query, ids);
  res.json(result);
});

// ✅ BETTER - Validate IDs are numbers
app.post('/users/bulk', async (req, res) => {
  const ids = req.body.ids;
  
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Invalid IDs' });
  }
  
  // Validate all IDs are numbers
  const validIds = ids.filter(id => Number.isInteger(Number(id)));
  
  if (validIds.length === 0) {
    return res.status(400).json({ error: 'No valid IDs provided' });
  }
  
  const placeholders = validIds.map(() => '?').join(',');
  const query = `SELECT * FROM users WHERE id IN (${placeholders})`;
  
  const [result] = await db.query(query, validIds);
  res.json(result);
});
```

### 6. Table/Column Names from User Input

**Problem:**
```javascript
// ❌ EXTREMELY DANGEROUS - User controls table name
app.get('/data/:table', async (req, res) => {
  const tableName = req.params.table;
  
  // Never do this!
  const query = `SELECT * FROM ${tableName}`;
  const result = await db.query(query);
  res.json(result);
});

// Attacker sends: /data/users;DROP TABLE users--
```

**Fix:**
```javascript
// ✅ SAFE - Whitelist allowed tables
app.get('/data/:table', async (req, res) => {
  const tableName = req.params.table;
  
  // Strict whitelist
  const allowedTables = ['users', 'products', 'orders'];
  
  if (!allowedTables.includes(tableName)) {
    return res.status(400).json({ error: 'Invalid table name' });
  }
  
  // Safe to use since it's whitelisted
  const query = `SELECT * FROM ${tableName}`;
  const [result] = await db.query(query);
  res.json(result);
});

// ✅ BETTER - Use a mapping object
const tableMapping = {
  'users': 'user_accounts',
  'products': 'product_catalog',
  'orders': 'customer_orders'
};

app.get('/data/:table', async (req, res) => {
  const requestedTable = req.params.table;
  const actualTable = tableMapping[requestedTable];
  
  if (!actualTable) {
    return res.status(400).json({ error: 'Invalid table name' });
  }
  
  const query = `SELECT * FROM ${actualTable}`;
  const [result] = await db.query(query);
  res.json(result);
});
```

## Best Practices for Different Database Libraries

### 1. MySQL / MySQL2

```javascript
const mysql = require('mysql2/promise');

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

// ✅ Using prepared statements
const getUserById = async (id) => {
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE id = ?',
    [id]
  );
  return rows[0];
};

// ✅ Multiple parameters
const createUser = async (name, email, password) => {
  const [result] = await pool.execute(
    'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
    [name, email, password]
  );
  return result.insertId;
};

// ✅ Named placeholders (with mysql2)
const updateUser = async (id, updates) => {
  const [result] = await pool.execute(
    'UPDATE users SET name = :name, email = :email WHERE id = :id',
    { id, ...updates }
  );
  return result.affectedRows;
};
```

### 2. PostgreSQL (node-postgres)

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 20,
});

// ✅ Using $1, $2 placeholders
const getUserById = async (id) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0];
};

// ✅ Multiple parameters
const createUser = async (name, email, password) => {
  const result = await pool.query(
    'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id',
    [name, email, password]
  );
  return result.rows[0].id;
};

// ✅ Complex query with multiple parameters
const searchUsers = async (filters) => {
  const { name, email, minAge } = filters;
  
  const result = await pool.query(
    `SELECT * FROM users 
     WHERE name ILIKE $1 
     AND email ILIKE $2 
     AND age >= $3`,
    [`%${name}%`, `%${email}%`, minAge]
  );
  return result.rows;
};
```

### 3. SQLite (better-sqlite3)

```javascript
const Database = require('better-sqlite3');
const db = new Database('database.db');

// ✅ Using prepared statements
const getUserById = db.prepare('SELECT * FROM users WHERE id = ?');
const user = getUserById.get(userId);

// ✅ Multiple parameters
const createUser = db.prepare(
  'INSERT INTO users (name, email, password) VALUES (?, ?, ?)'
);

const insertUser = (name, email, password) => {
  const info = createUser.run(name, email, password);
  return info.lastInsertRowid;
};

// ✅ Named parameters
const updateUser = db.prepare(
  'UPDATE users SET name = @name, email = @email WHERE id = @id'
);

updateUser.run({ id: 1, name: 'John', email: 'john@example.com' });

// ✅ Transaction example
const insertMany = db.transaction((users) => {
  const insert = db.prepare(
    'INSERT INTO users (name, email) VALUES (?, ?)'
  );
  
  for (const user of users) {
    insert.run(user.name, user.email);
  }
});

insertMany([
  { name: 'Alice', email: 'alice@example.com' },
  { name: 'Bob', email: 'bob@example.com' }
]);
```

### 4. Using ORM (Sequelize)

```javascript
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'mysql',
  host: process.env.DB_HOST,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Define model
const User = sequelize.define('User', {
  name: DataTypes.STRING,
  email: DataTypes.STRING,
  age: DataTypes.INTEGER,
});

// ✅ ORM automatically uses parameterized queries
const getUserById = async (id) => {
  return await User.findByPk(id);
};

// ✅ Safe querying with where clause
const searchUsers = async (name, email) => {
  return await User.findAll({
    where: {
      name: { [Sequelize.Op.like]: `%${name}%` },
      email: { [Sequelize.Op.like]: `%${email}%` }
    }
  });
};

// ✅ Raw queries still need parameters
const rawQuery = async (userId) => {
  const [results] = await sequelize.query(
    'SELECT * FROM users WHERE id = ?',
    {
      replacements: [userId],
      type: Sequelize.QueryTypes.SELECT
    }
  );
  return results;
};

// ⚠️ NEVER do this even with ORM
// const query = `SELECT * FROM users WHERE id = ${userId}`; // DANGEROUS!
// await sequelize.query(query); // VULNERABLE!
```

### 5. Using Query Builder (Knex.js)

```javascript
const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  }
});

// ✅ Query builder automatically parameterizes
const getUserById = async (id) => {
  return await knex('users')
    .where('id', id)
    .first();
};

// ✅ Complex queries
const searchUsers = async (filters) => {
  let query = knex('users').select('*');
  
  if (filters.name) {
    query = query.where('name', 'like', `%${filters.name}%`);
  }
  
  if (filters.email) {
    query = query.where('email', 'like', `%${filters.email}%`);
  }
  
  if (filters.minAge) {
    query = query.where('age', '>=', filters.minAge);
  }
  
  return await query;
};

// ✅ Raw queries with bindings
const customQuery = async (userId) => {
  return await knex.raw('SELECT * FROM users WHERE id = ?', [userId]);
};

// ✅ Insert with returning
const createUser = async (userData) => {
  const [id] = await knex('users')
    .insert(userData)
    .returning('id');
  return id;
};
```

## Input Validation & Sanitization

```javascript
const { body, param, query, validationResult } = require('express-validator');

// ✅ Validate and sanitize inputs
app.post('/user',
  // Validation rules
  body('email').isEmail().normalizeEmail(),
  body('name').trim().isLength({ min: 2, max: 50 }).escape(),
  body('age').isInt({ min: 0, max: 120 }),
  body('role').isIn(['user', 'admin', 'moderator']),
  
  async (req, res) => {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { email, name, age, role } = req.body;
    
    // Safe to use in query since inputs are validated
    const query = 'INSERT INTO users (email, name, age, role) VALUES (?, ?, ?, ?)';
    const [result] = await db.query(query, [email, name, age, role]);
    
    res.json({ id: result.insertId });
  }
);

// ✅ Validate route parameters
app.get('/user/:id',
  param('id').isInt().toInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.params.id;
    const query = 'SELECT * FROM users WHERE id = ?';
    const [result] = await db.query(query, [userId]);
    
    res.json(result);
  }
);

// ✅ Custom validators
const isValidSortColumn = (value) => {
  const allowed = ['name', 'email', 'created_at'];
  return allowed.includes(value);
};

app.get('/users',
  query('sortBy').optional().custom(isValidSortColumn),
  query('order').optional().isIn(['ASC', 'DESC']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const sortBy = req.query.sortBy || 'name';
    const order = req.query.order || 'ASC';
    
    // Safe since validated
    const query = `SELECT * FROM users ORDER BY ${sortBy} ${order}`;
    const [result] = await db.query(query);
    
    res.json(result);
  }
);
```

## Security Middleware & Tools

```javascript
// 1. Rate limiting to prevent brute force
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);

// 2. Helmet for security headers
const helmet = require('helmet');
app.use(helmet());

// 3. SQL injection detection middleware
const detectSQLInjection = (req, res, next) => {
  const suspiciousPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /((\%27)|(\'))union/i
  ];
  
  const checkValue = (value) => {
    if (typeof value === 'string') {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(value)) {
          return true;
        }
      }
    }
    return false;
  };
  
  // Check all inputs
  const inputs = [
    ...Object.values(req.params),
    ...Object.values(req.query),
    ...Object.values(req.body || {})
  ];
  
  for (const input of inputs) {
    if (checkValue(input)) {
      return res.status(400).json({ 
        error: 'Potential SQL injection detected' 
      });
    }
  }
  
  next();
};

app.use(detectSQLInjection);

// 4. Logging suspicious activity
const winston = require('winston');

const logger = winston.createLogger({
  transports: [
    new winston.transports.File({ filename: 'security.log' })
  ]
});

const logSuspiciousActivity = (req, type, details) => {
  logger.warn({
    type,
    ip: req.ip,
    url: req.url,
    method: req.method,
    userAgent: req.get('user-agent'),
    details,
    timestamp: new Date()
  });
};
```

## Quick Security Checklist

When working with SQL in Node.js:

1. ✅ Always use parameterized queries / prepared statements
2. ✅ Never concatenate user input into SQL strings
3. ✅ Whitelist allowed values for ORDER BY, table names, column names
4. ✅ Validate and sanitize all user inputs
5. ✅ Use ORMs or query builders when possible
6. ✅ Implement input validation with express-validator
7. ✅ Use least privilege principle for database users
8. ✅ Enable query logging in development
9. ✅ Implement rate limiting on endpoints
10. ✅ Regular security audits and penetration testing

## Testing for SQL Injection

```javascript
// test/security.test.js
const request = require('supertest');
const app = require('../app');

describe('SQL Injection Prevention', () => {
  
  test('Should block SQL injection in user ID', async () => {
    const maliciousId = "1 OR 1=1";
    const response = await request(app)
      .get(`/user/${maliciousId}`)
      .expect(400);
  });
  
  test('Should block SQL injection in search', async () => {
    const maliciousSearch = "'; DROP TABLE users--";
    const response = await request(app)
      .get('/search')
      .query({ q: maliciousSearch })
      .expect(400);
  });
  
  test('Should handle parameterized queries safely', async () => {
    const response = await request(app)
      .get('/user/1')
      .expect(200);
    
    expect(response.body).toBeDefined();
  });
  
  test('Should validate ORDER BY column', async () => {
    const response = await request(app)
      .get('/users')
      .query({ sortBy: 'malicious_column' })
      .expect(400);
  });
});
```

## Summary

SQL injection is prevented by never trusting user input in SQL queries.

**Key solutions:**
- Always use parameterized queries / prepared statements
- Never concatenate user input into SQL strings
- Whitelist allowed values for dynamic parts (ORDER BY, table names)
- Validate and sanitize all inputs with express-validator
- Use ORMs or query builders that handle parameterization
- Implement security middleware to detect injection attempts
- Apply principle of least privilege to database users
- Regular security testing and code reviews

## Related Problems

- [Fix 401 Unauthorized Error in Axios](/problems/401-unauthorized-axios)
- [Fix JWT Token Expiration Issues](/problems/fix-jwt-token-expiration-issues)
- [Fix Cannot Read Property of Undefined in NestJS](/problems/cannot-read-property-undefined-nestjs)