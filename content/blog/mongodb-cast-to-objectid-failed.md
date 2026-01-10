# Fix MongoDB CastError: Cast to ObjectId Failed - Complete Troubleshooting Guide

## Introduction

If you're working with MongoDB and Node.js, you've likely encountered the dreaded "CastError: Cast to ObjectId failed" error. This frustrating error occurs when MongoDB tries to convert an invalid value into an ObjectId and fails. It's one of the most common MongoDB errors, especially for developers new to the database.

In this comprehensive guide, we'll explore what causes this error, how to identify it quickly, and most importantly, how to fix it permanently with real-world examples across different frameworks including Mongoose, NestJS, Express, and pure MongoDB driver.

## What is MongoDB CastError?

A CastError occurs when MongoDB's Mongoose ODM (Object Data Modeling) library attempts to cast (convert) a value to a specific type but fails. The most common variant is when trying to cast an invalid string to MongoDB's ObjectId type.

### Typical Error Messages
```
CastError: Cast to ObjectId failed for value "undefined" at path "_id"
CastError: Cast to ObjectId failed for value "123" at path "_id" for model "User"
CastError: Cast to ObjectId failed for value "{ _id: '...' }" (type Object) at path "_id"
CastError: Cast to ObjectId failed for value "null" at path "userId"
```

## Understanding MongoDB ObjectId

Before diving into solutions, let's understand what ObjectId is:

- **Format**: 24 hexadecimal characters (12 bytes)
- **Example**: `507f1f77bcf86cd799439011`
- **Structure**: Timestamp + Machine ID + Process ID + Counter
- **Valid characters**: 0-9 and a-f (case-insensitive)

**Valid ObjectIds:**
```javascript
"507f1f77bcf86cd799439011"  // ✅ Valid
"5f8d0d55b54764421b7156d3"  // ✅ Valid
```

**Invalid ObjectIds:**
```javascript
"123"                        // ❌ Too short
"invalid-id"                 // ❌ Invalid characters
"507f1f77bcf86cd799439011xyz" // ❌ Too long
undefined                    // ❌ Not a string
null                         // ❌ Null value
{}                          // ❌ Object instead of string
```

## Common Causes and Solutions

### 1. Invalid or Malformed ObjectId String

**Problem:**

The most common cause - passing an invalid string that doesn't match ObjectId format.
```javascript
// ❌ These will cause CastError
await User.findById('123');
await User.findById('invalid-id');
await User.findById('user-123');
```

**Solution 1: Validate ObjectId Before Query**
```javascript
const mongoose = require('mongoose');

// Using Mongoose
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// In your route handler
app.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  
  if (!isValidObjectId(id)) {
    return res.status(400).json({ 
      error: 'Invalid user ID format' 
    });
  }
  
  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});
```

**Solution 2: Create Reusable Validation Middleware**
```javascript
// middleware/validateObjectId.js
const mongoose = require('mongoose');

const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: `Invalid ${paramName}`,
        message: 'The provided ID is not a valid MongoDB ObjectId'
      });
    }
    
    next();
  };
};

module.exports = validateObjectId;

// Usage
const validateObjectId = require('./middleware/validateObjectId');

app.get('/users/:id', validateObjectId(), async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json(user);
});

app.get('/posts/:postId/comments/:commentId', 
  validateObjectId('postId'),
  validateObjectId('commentId'),
  async (req, res) => {
    // Both IDs are valid here
    const comment = await Comment.findById(req.params.commentId);
    res.json(comment);
  }
);
```

### 2. Undefined or Null Values

**Problem:**

Passing `undefined` or `null` when ObjectId is expected.
```javascript
// ❌ Will cause CastError
const userId = undefined;
await User.findById(userId);

// ❌ From request without proper checking
app.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.body.userId); // undefined if not provided
});
```

**Solution:**

Always check for existence before querying:
```javascript
// Solution 1: Early return
app.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid user ID format' });
  }
  
  const user = await User.findById(id);
  res.json(user);
});

// Solution 2: Optional chaining with default
async function getUserById(id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }
  return await User.findById(id);
}

// Solution 3: Comprehensive validation function
function validateAndGetObjectId(value, fieldName = 'ID') {
  if (!value) {
    throw new Error(`${fieldName} is required`);
  }
  
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error(`Invalid ${fieldName} format`);
  }
  
  return value;
}

// Usage
try {
  const userId = validateAndGetObjectId(req.params.id, 'User ID');
  const user = await User.findById(userId);
} catch (error) {
  res.status(400).json({ error: error.message });
}
```

### 3. Wrong Data Type in Schema

**Problem:**

Schema expects ObjectId but receives different type.
```javascript
// ❌ Schema definition
const PostSchema = new mongoose.Schema({
  author: String, // Should be ObjectId!
});

// Later trying to populate
const posts = await Post.find().populate('author'); // CastError!
```

**Solution:**

Use correct schema definition:
```javascript
// ✅ Correct schema
const PostSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: String,
  content: String
});

const Post = mongoose.model('Post', PostSchema);

// Now this works
const posts = await Post.find().populate('author');
```

### 4. Query with Wrong Field Type

**Problem:**

Using query operators with invalid ObjectId values.
```javascript
// ❌ Invalid query
await User.find({ 
  _id: { $in: ['123', 'invalid', '456'] } 
});

// ❌ Wrong field type
await Post.find({ 
  author: 'john-doe' // Should be ObjectId
});
```

**Solution:**

Validate all IDs in queries:
```javascript
// Solution 1: Filter and validate array of IDs
const ids = ['507f1f77bcf86cd799439011', '123', 'invalid'];

const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));

if (validIds.length === 0) {
  return res.status(400).json({ error: 'No valid IDs provided' });
}

const users = await User.find({ 
  _id: { $in: validIds } 
});

// Solution 2: Convert strings to ObjectId
const mongoose = require('mongoose');

const objectIds = validIds.map(id => new mongoose.Types.ObjectId(id));
const users = await User.find({ 
  _id: { $in: objectIds } 
});

// Solution 3: Comprehensive query builder
async function findUsersByIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return [];
  }
  
  const validIds = ids.filter(id => 
    id && mongoose.Types.ObjectId.isValid(id)
  );
  
  if (validIds.length === 0) {
    return [];
  }
  
  return await User.find({ _id: { $in: validIds } });
}
```

### 5. URL Parameter Encoding Issues

**Problem:**

Special characters or encoding in URL parameters.
```javascript
// ❌ URL with encoded/special characters
GET /users/507f1f77bcf86cd799439011%20
GET /users/507f1f77bcf86cd799439011?extra=param
```

**Solution:**

Clean and validate URL parameters:
```javascript
const express = require('express');
const app = express();

// Middleware to clean ObjectId parameters
app.param('id', (req, res, next, id) => {
  // Remove whitespace and special characters
  const cleanId = id.trim().replace(/[^a-fA-F0-9]/g, '');
  
  if (!mongoose.Types.ObjectId.isValid(cleanId)) {
    return res.status(400).json({ 
      error: 'Invalid ID format',
      received: id,
      cleaned: cleanId
    });
  }
  
  req.params.id = cleanId;
  next();
});

app.get('/users/:id', async (req, res) => {
  // req.params.id is now cleaned and validated
  const user = await User.findById(req.params.id);
  res.json(user);
});
```

### 6. Aggregation Pipeline Errors

**Problem:**

Invalid ObjectId in aggregation lookups or matches.
```javascript
// ❌ Invalid $match with ObjectId
const userId = '123'; // Invalid

await Post.aggregate([
  { $match: { author: userId } }
]);
```

**Solution:**

Convert to ObjectId in aggregation:
```javascript
const mongoose = require('mongoose');

// Solution 1: Convert to ObjectId
const userId = '507f1f77bcf86cd799439011';

if (!mongoose.Types.ObjectId.isValid(userId)) {
  throw new Error('Invalid user ID');
}

const posts = await Post.aggregate([
  { 
    $match: { 
      author: new mongoose.Types.ObjectId(userId) 
    } 
  },
  {
    $lookup: {
      from: 'users',
      localField: 'author',
      foreignField: '_id',
      as: 'authorDetails'
    }
  }
]);

// Solution 2: Helper function for aggregation
function createMatchStage(field, value) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error(`Invalid ObjectId for ${field}`);
  }
  
  return {
    $match: {
      [field]: new mongoose.Types.ObjectId(value)
    }
  };
}

// Usage
const pipeline = [
  createMatchStage('author', userId),
  { $sort: { createdAt: -1 } }
];

const results = await Post.aggregate(pipeline);
```

### 7. Populate Errors with Invalid References

**Problem:**

Trying to populate with invalid ObjectId references.
```javascript
// ❌ Document has invalid reference
const post = new Post({
  title: 'My Post',
  author: 'invalid-user-id' // Not a valid ObjectId
});

await post.save();
await post.populate('author'); // CastError!
```

**Solution:**

Validate before saving and handle populate errors:
```javascript
// Solution 1: Validate before saving
async function createPost(postData) {
  const { title, content, authorId } = postData;
  
  if (!mongoose.Types.ObjectId.isValid(authorId)) {
    throw new Error('Invalid author ID');
  }
  
  // Verify author exists
  const authorExists = await User.exists({ _id: authorId });
  if (!authorExists) {
    throw new Error('Author not found');
  }
  
  const post = new Post({
    title,
    content,
    author: authorId
  });
  
  return await post.save();
}

// Solution 2: Safe populate with error handling
async function getPostWithAuthor(postId) {
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new Error('Invalid post ID');
  }
  
  try {
    const post = await Post.findById(postId).populate({
      path: 'author',
      select: 'name email avatar',
      options: { strictPopulate: false } // Don't throw on invalid refs
    });
    
    if (!post) {
      return null;
    }
    
    // Check if author populated successfully
    if (!post.author || typeof post.author === 'string') {
      console.warn(`Post ${postId} has invalid author reference`);
      post.author = null; // Clear invalid reference
    }
    
    return post;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid post ID format');
    }
    throw error;
  }
}
```

### 8. Frontend Sending Wrong Data Format

**Problem:**

Frontend sends data in wrong format (object instead of string, etc.).
```javascript
// ❌ Frontend sends object
fetch('/api/users', {
  method: 'POST',
  body: JSON.stringify({
    userId: { _id: '507f1f77bcf86cd799439011' } // Should be string!
  })
});

// ❌ Backend receives object
app.post('/api/posts', async (req, res) => {
  const { userId } = req.body; // userId is object, not string
  await Post.create({ author: userId }); // CastError!
});
```

**Solution:**

Extract and validate ID from various formats:
```javascript
// Backend validation middleware
function extractObjectId(value, fieldName = 'ID') {
  // Handle different input formats
  let id;
  
  if (typeof value === 'string') {
    id = value;
  } else if (value && typeof value === 'object') {
    id = value._id || value.id || value.toString();
  } else if (value instanceof mongoose.Types.ObjectId) {
    id = value.toString();
  } else {
    throw new Error(`Invalid ${fieldName} format`);
  }
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${fieldName}`);
  }
  
  return id;
}

// Usage in route
app.post('/api/posts', async (req, res) => {
  try {
    const authorId = extractObjectId(req.body.userId, 'User ID');
    
    const post = await Post.create({
      title: req.body.title,
      author: authorId
    });
    
    res.status(201).json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Frontend helper to ensure correct format
function getIdString(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    return value._id || value.id || '';
  }
  return '';
}

// Frontend usage
const userId = getIdString(user); // Ensures string format
fetch('/api/posts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: userId, // Guaranteed to be string
    title: 'New Post'
  })
});
```

## Framework-Specific Solutions

### NestJS with Mongoose

**Problem:**
```typescript
// ❌ NestJS controller without validation
@Get(':id')
async findOne(@Param('id') id: string) {
  return this.usersService.findOne(id); // CastError if invalid!
}
```

**Solution 1: Create Custom Validation Pipe**
```typescript
// pipes/parse-object-id.pipe.ts
import { 
  PipeTransform, 
  Injectable, 
  BadRequestException 
} from '@nestjs/common';
import { Types } from 'mongoose';

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, Types.ObjectId> {
  transform(value: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(
        `Invalid ObjectId: ${value}`
      );
    }
    return new Types.ObjectId(value);
  }
}

// Usage in controller
import { ParseObjectIdPipe } from './pipes/parse-object-id.pipe';

@Controller('users')
export class UsersController {
  @Get(':id')
  async findOne(@Param('id', ParseObjectIdPipe) id: Types.ObjectId) {
    return this.usersService.findOne(id);
  }
  
  @Delete(':id')
  async remove(@Param('id', ParseObjectIdPipe) id: Types.ObjectId) {
    return this.usersService.remove(id);
  }
}
```

**Solution 2: Global Validation Pipe**
```typescript
// main.ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
  }));
  
  await app.listen(3000);
}
bootstrap();

// DTO with validation
import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsMongoId({ message: 'Invalid author ID format' })
  authorId: string;
}

// Controller
@Post()
async create(@Body() createPostDto: CreatePostDto) {
  return this.postsService.create(createPostDto);
}
```

**Solution 3: Custom Decorator for ObjectId Validation**
```typescript
// decorators/is-valid-object-id.decorator.ts
import { 
  registerDecorator, 
  ValidationOptions, 
  ValidationArguments 
} from 'class-validator';
import { Types } from 'mongoose';

export function IsValidObjectId(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidObjectId',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return Types.ObjectId.isValid(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid MongoDB ObjectId`;
        },
      },
    });
  };
}

// Usage in DTO
export class UpdateUserDto {
  @IsValidObjectId()
  managerId?: string;

  @IsValidObjectId({ message: 'Department ID must be valid' })
  departmentId?: string;
}
```

### Express with Mongoose

**Complete Express Example:**
```javascript
const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());

// Middleware for ObjectId validation
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName] || req.body[paramName] || req.query[paramName];
    
    if (id && !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `Invalid ${paramName}: Must be a valid MongoDB ObjectId`,
        received: id
      });
    }
    
    next();
  };
};

// Global error handler for CastError
app.use((err, req, res, next) => {
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({
      error: 'Invalid ID Format',
      message: 'The provided ID is not a valid MongoDB ObjectId',
      path: err.path,
      value: err.value
    });
  }
  
  next(err);
});

// Routes with validation
app.get('/users/:id', validateObjectId(), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    next(error);
  }
});

app.post('/posts', validateObjectId('authorId'), async (req, res, next) => {
  try {
    const post = await Post.create({
      title: req.body.title,
      content: req.body.content,
      author: req.body.authorId
    });
    
    res.status(201).json(post);
  } catch (error) {
    next(error);
  }
});

app.get('/posts/:postId/comments/:commentId',
  validateObjectId('postId'),
  validateObjectId('commentId'),
  async (req, res, next) => {
    try {
      const comment = await Comment.findOne({
        _id: req.params.commentId,
        post: req.params.postId
      });
      
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }
      
      res.json(comment);
    } catch (error) {
      next(error);
    }
  }
);
```

### Pure MongoDB Driver (without Mongoose)
```javascript
const { MongoClient, ObjectId } = require('mongodb');

// Helper function
function isValidObjectId(id) {
  return ObjectId.isValid(id) && String(new ObjectId(id)) === id;
}

// Usage
async function getUserById(userId) {
  if (!isValidObjectId(userId)) {
    throw new Error('Invalid user ID format');
  }
  
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db('myapp');
  
  try {
    const user = await db.collection('users').findOne({
      _id: new ObjectId(userId)
    });
    
    return user;
  } finally {
    await client.close();
  }
}

// With error handling
app.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  
  if (!isValidObjectId(id)) {
    return res.status(400).json({
      error: 'Invalid ID format',
      message: 'Must be a 24-character hexadecimal string'
    });
  }
  
  try {
    const user = await getUserById(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## Advanced Solutions

### 1. Schema-Level Validation
```javascript
const UserSchema = new mongoose.Schema({
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: function(v) {
        return v === null || mongoose.Types.ObjectId.isValid(v);
      },
      message: props => `${props.value} is not a valid ObjectId!`
    }
  }
});
```

### 2. Custom Error Handler Class
```javascript
class ObjectIdValidationError extends Error {
  constructor(field, value) {
    super(`Invalid ObjectId for ${field}: ${value}`);
    this.name = 'ObjectIdValidationError';
    this.statusCode = 400;
    this.field = field;
    this.value = value;
  }
}

// Usage
function validateObjectIdOrThrow(value, fieldName = 'ID') {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ObjectIdValidationError(fieldName, value);
  }
  return value;
}

// In error handler middleware
app.use((err, req, res, next) => {
  if (err instanceof ObjectIdValidationError) {
    return res.status(err.statusCode).json({
      error: err.name,
      message: err.message,
      field: err.field
    });
  }
  next(err);
});
```

### 3. TypeScript Type Guards
```typescript
import { Types } from 'mongoose';

// Type guard
function isValidObjectId(id: unknown): id is string {
  return typeof id === 'string' && Types.ObjectId.isValid(id);
}

// Usage with type safety
async function getUser(userId: unknown) {
  if (!isValidObjectId(userId)) {
    throw new Error('Invalid user ID');
  }
  
  // TypeScript now knows userId is a string
  return await User.findById(userId);
}

// Advanced type guard with multiple checks
function assertValidObjectId(
  id: unknown,
  fieldName: string = 'ID'
): asserts id is string {
  if (typeof id !== 'string' || !Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${fieldName}: expected valid ObjectId, got ${id}`);
  }
}

// Usage
function updateUser(userId: unknown, data: UpdateUserDto) {
  assertValidObjectId(userId, 'User ID');
  // TypeScript knows userId is string here
  return User.findByIdAndUpdate(userId, data);
}
```

### 4. Bulk Operations with Validation
```javascript
async function findUsersByIds(userIds) {
  if (!Array.isArray(userIds)) {
    throw new Error('userIds must be an array');
  }
  
  // Validate and separate valid/invalid IDs
  const result = {
    valid: [],
    invalid: [],
    users: []
  };
  
  userIds.forEach(id => {
    if (mongoose.Types.ObjectId.isValid(id)) {
      result.valid.push(id);
    } else {
      result.invalid.push(id);
    }
  });
  
  if (result.valid.length > 0) {
    result.users = await User.find({
      _id: { $in: result.valid }
    });
  }
  
  return result;
}

// Usage
const result = await findUsersByIds(['507f...', '123', '5f8d...', 'invalid']);
console.log(`Found ${result.users.length} users`);
console.log(`Invalid IDs: ${result.invalid.join(', ')}`);
```

## Testing ObjectId Validation

### Unit Tests
```javascript
const mongoose = require('mongoose');
const { isValidObjectId } = require('../utils/validation');

describe('ObjectId Validation', () => {
  it('should validate correct ObjectId', () => {
    const validId = new mongoose.Types.ObjectId().toString();
    expect(isValidObjectId(validId)).toBe(true);
  });

  it('should reject invalid ObjectId', () => {
    expect(isValidObjectId('123')).toBe(false);
    expect(isValidObjectId('invalid-id')).toBe(false);
    expect(isValidObjectId(null)).toBe(false);
    expect(isValidObjectId(undefined)).toBe(false);
  });

  it('should reject ObjectId with wrong length', () => {
    expect(isValidObjectId('507f1f77bcf86cd79943901')).toBe(false); // 23 chars
    expect(isValidObjectId('507f1f77bcf86cd799439011a')).toBe(false); // 25 chars
  });

  it('should reject ObjectId with invalid characters', () => {
    expect(isValidObjectId('507f1f77bcf86cd799439xyz')).toBe(false);
    expect(isValidObjectId('507f1f77-bcf8-6cd7-9943-9011')).toBe(false);
  });
});
```

### Integration Tests
```javascript
const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');

describe('GET /users/:id', () => {
  it('should return 400 for invalid ObjectId', async () => {
    const response = await request(app)
      .get('/users/invalid-id')
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Invalid');
  });

  it('should return 404 for valid but non-existent ObjectId', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    
    const response = await request(app)
      .get(`/users/${fakeId}`)
      .expect(404);

    expect(response.body.error).toBe('User not found');
  });

  it('should return user for valid ObjectId', async () => {
    const user = await User.create({ name: 'Test User' });
    
    const response = await request(app)
      .get(`/users/${user._id}`)
      .expect(200);

    expect(response.body).toHaveProperty('_id');
    expect(response.body.name).toBe('Test User');
  });
});
```

## Production Best Practices

### 1. Centralized Validation Utility
```javascript
// utils/objectId.js
const mongoose = require('mongoose');

class ObjectIdValidator {
  static isValid(id) {
    if (!id) return false;
    
    // Handle different input types
    if (typeof id === 'object' && id._id) {
      id = id._id;
    }
    
    return mongoose.Types.ObjectId.isValid(id);
  }

  static validate(id, fieldName = 'ID') {
    if (!this.isValid(id)) {
      const error = new Error(`Invalid ${fieldName} format`);
      error.statusCode = 400;
      error.field = fieldName;
      throw error;
    }
    return id;
  }

  static validateArray(ids, fieldName = 'IDs') {
    if (!Array.isArray(ids)) {
      throw new Error(`${fieldName} must be an array`);
    }

    const invalid = ids.filter(id => !this.isValid(id));
    
    if (invalid.length > 0) {
      const error = new Error(
        `Invalid ${fieldName}: ${invalid.join(', ')}`
      );
      error.statusCode = 400;
      error.invalidIds = invalid;
      throw error;
    }

    return ids;
  }

  static toObjectId(id) {
    this.validate(id);
    return new mongoose.Types.ObjectId(id);
  }

  static toObjectIds(ids) {
    this.validateArray(ids);
    return ids.map(id => new mongoose.Types.ObjectId(id));
  }
}