---
title: "Fix Mongoose Schema Validation Not Working in NestJS"
description: "Troubleshoot and resolve Mongoose schema validation issues in NestJS with practical examples and solutions."
date: "2024-01-25"
author: "DevFixPro"
category: "Error Fixes"
tags: ["NestJS", "Mongoose", "MongoDB", "Validation", "Schema"]
---

# What Does This Error Mean?

When Mongoose schema validation isn't working in NestJS, it means:

- **Invalid data is being saved** to MongoDB without errors
- **Required fields** are missing but no validation error is thrown
- **Custom validators** are not being triggered
- **Min/max constraints** are being ignored

```typescript
// ❌ This should fail but doesn't
await this.userModel.create({
  email: 'not-an-email', // Invalid email
  age: -5, // Negative age
  // name is missing (required field)
});
// No error thrown, data saved to MongoDB
```

This usually happens due to misconfiguration or incorrect usage of Mongoose in NestJS.

## Common Causes & Fixes

### 1. Not Using class-validator with DTOs

**Problem:**
```typescript
// ❌ Relying only on Mongoose schema validation
export class CreateUserDto {
  name: string;
  email: string;
  age: number;
}

// Controller
@Post()
async create(@Body() createUserDto: CreateUserDto) {
  return this.userService.create(createUserDto);
}
// Mongoose validation happens too late (at save time)
```

**Fix:**
```typescript
// ✅ Use class-validator decorators in DTO
import { IsString, IsEmail, IsNotEmpty, Min, Max, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @Min(0)
  @Max(120)
  age: number;

  @IsOptional()
  @IsString()
  bio?: string;
}

// main.ts - Enable ValidationPipe globally
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Strip unknown properties
    forbidNonWhitelisted: true, // Throw error for unknown properties
    transform: true, // Transform payloads to DTO instances
  }));
  
  await app.listen(3000);
}
bootstrap();
```

### 2. ValidationPipe Not Enabled

**Problem:**
```typescript
// ❌ ValidationPipe not configured
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();

// DTOs with validation decorators won't work
```

**Fix:**
```typescript
// ✅ Enable ValidationPipe globally in main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: false,
      validationError: {
        target: false,
        value: false,
      },
    }),
  );
  
  await app.listen(3000);
}
bootstrap();
```

### 3. Using Plain Objects Instead of Model Methods

**Problem:**
```typescript
// ❌ Direct insertion bypasses validation
async create(createUserDto: CreateUserDto) {
  return this.userModel.insertMany([createUserDto]);
  // insertMany() skips validation by default
}

// ❌ Using lean() bypasses validation
async create(createUserDto: CreateUserDto) {
  const user = await this.userModel.create(createUserDto);
  return user.lean(); // Returns plain object, but create() already ran
}
```

**Fix:**
```typescript
// ✅ Use create() or save() which trigger validation
async create(createUserDto: CreateUserDto) {
  return this.userModel.create(createUserDto);
  // create() automatically validates
}

// ✅ Or use save() method
async create(createUserDto: CreateUserDto) {
  const user = new this.userModel(createUserDto);
  return user.save(); // Validates before saving
}

// ✅ If you must use insertMany, enable validation
async createMany(users: CreateUserDto[]) {
  return this.userModel.insertMany(users, { 
    ordered: false,
    rawResult: false,
  });
  // Note: insertMany still has limited validation
}
```

### 4. Mongoose Schema Not Properly Defined

**Problem:**
```typescript
// ❌ No validation in schema
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class User extends Document {
  @Prop()
  name: string;

  @Prop()
  email: string;

  @Prop()
  age: number;
}

export const UserSchema = SchemaFactory.createForClass(User);
// No required fields, no validation rules
```

**Fix:**
```typescript
// ✅ Add validation to Mongoose schema
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ 
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  })
  name: string;

  @Prop({ 
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  })
  email: string;

  @Prop({ 
    required: [true, 'Age is required'],
    min: [0, 'Age must be positive'],
    max: [120, 'Age must be less than 120']
  })
  age: number;

  @Prop({ 
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  })
  role: string;

  @Prop()
  bio?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Add custom validators
UserSchema.path('email').validate(async function(value: string) {
  const count = await this.model('User').countDocuments({ email: value });
  return count === 0;
}, 'Email already exists');
```

### 5. Using findByIdAndUpdate Without Options

**Problem:**
```typescript
// ❌ Update operations skip validation by default
async update(id: string, updateUserDto: UpdateUserDto) {
  return this.userModel.findByIdAndUpdate(id, updateUserDto);
  // Validation is skipped!
}
```

**Fix:**
```typescript
// ✅ Enable validation for updates
async update(id: string, updateUserDto: UpdateUserDto) {
  return this.userModel.findByIdAndUpdate(
    id, 
    updateUserDto,
    {
      new: true, // Return updated document
      runValidators: true, // Run validators
      context: 'query', // Set context for validators
    }
  );
}

// ✅ Alternative: Use save() for full validation
async update(id: string, updateUserDto: UpdateUserDto) {
  const user = await this.userModel.findById(id);
  
  if (!user) {
    throw new NotFoundException(`User with ID ${id} not found`);
  }
  
  Object.assign(user, updateUserDto);
  return user.save(); // Full validation runs
}
```

### 6. Validation Errors Not Being Caught

**Problem:**
```typescript
// ❌ Validation errors not handled
async create(createUserDto: CreateUserDto) {
  const user = await this.userModel.create(createUserDto);
  return user;
}
// Mongoose throws generic error, not clear validation messages
```

**Fix:**
```typescript
// ✅ Catch and format validation errors
import { BadRequestException } from '@nestjs/common';

async create(createUserDto: CreateUserDto) {
  try {
    return await this.userModel.create(createUserDto);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      throw new BadRequestException({
        message: 'Validation failed',
        errors: messages
      });
    }
    throw error;
  }
}

// ✅ Or use a global exception filter
import { ExceptionFilter, Catch, ArgumentsHost, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { Error as MongooseError } from 'mongoose';

@Catch(MongooseError.ValidationError)
export class MongooseValidationExceptionFilter implements ExceptionFilter {
  catch(exception: MongooseError.ValidationError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const errors = Object.values(exception.errors).map(err => ({
      field: err.path,
      message: err.message
    }));

    response.status(400).json({
      statusCode: 400,
      message: 'Validation failed',
      errors
    });
  }
}

// Apply in main.ts
app.useGlobalFilters(new MongooseValidationExceptionFilter());
```

## Best Practices for Validation in NestJS

### 1. Dual-Layer Validation (DTO + Schema)

```typescript
// Layer 1: DTO validation (validates at controller level)
import { IsString, IsEmail, IsNotEmpty, Min, Max } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @Min(0)
  @Max(120)
  age: number;
}

// Layer 2: Schema validation (validates at database level)
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class User {
  @Prop({ 
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  })
  name: string;

  @Prop({ 
    required: true,
    unique: true,
    lowercase: true,
    match: /^\S+@\S+\.\S+$/
  })
  email: string;

  @Prop({ 
    required: true,
    min: 0,
    max: 120
  })
  age: number;
}

export const UserSchema = SchemaFactory.createForClass(User);
```

### 2. Custom Validators in Schema

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class User {
  @Prop({ 
    required: true,
    validate: {
      validator: function(v: string) {
        return /^\d{3}-\d{3}-\d{4}$/.test(v);
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  })
  phone: string;

  @Prop({
    type: String,
    validate: {
      validator: async function(value: string) {
        // Async validation example
        const user = await this.model('User').findOne({ username: value });
        return !user;
      },
      message: 'Username already exists'
    }
  })
  username: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Add pre-save hook for complex validation
UserSchema.pre('save', function(next) {
  // Custom validation logic
  if (this.age < 18 && this.role === 'admin') {
    next(new Error('Users under 18 cannot be admins'));
  } else {
    next();
  }
});
```

### 3. Conditional Validation

```typescript
import { IsString, IsOptional, ValidateIf, IsEmail } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @ValidateIf(o => o.email !== undefined)
  @IsEmail()
  email?: string;

  @ValidateIf(o => o.age !== undefined)
  @Min(0)
  @Max(120)
  age?: number;

  // Only validate password if it's provided
  @ValidateIf(o => o.password !== undefined && o.password !== '')
  @IsString()
  @MinLength(8)
  password?: string;

  // Confirm password only if password is provided
  @ValidateIf(o => o.password !== undefined)
  @IsString()
  @Match('password', { message: 'Passwords do not match' })
  confirmPassword?: string;
}

// Custom Match decorator
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function Match(property: string, validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: 'match',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          return value === relatedValue;
        },
      },
    });
  };
}
```

### 4. Nested Object Validation

```typescript
// DTOs
import { IsString, IsNumber, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class AddressDto {
  @IsString()
  street: string;

  @IsString()
  city: string;

  @IsString()
  zipCode: string;
}

export class CreateUserDto {
  @IsString()
  name: string;

  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  previousAddresses: AddressDto[];
}

// Schema
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class Address {
  @Prop({ required: true })
  street: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true, match: /^\d{5}$/ })
  zipCode: string;
}

export const AddressSchema = SchemaFactory.createForClass(Address);

@Schema()
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ type: AddressSchema, required: true })
  address: Address;

  @Prop({ type: [AddressSchema], default: [] })
  previousAddresses: Address[];
}

export const UserSchema = SchemaFactory.createForClass(User);
```

### 5. Global Exception Filter for All Errors

```typescript
// filters/all-exceptions.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Error as MongooseError } from 'mongoose';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse();
    } else if (exception instanceof MongooseError.ValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = {
        statusCode: status,
        message: 'Validation failed',
        errors: Object.values(exception.errors).map((err: any) => ({
          field: err.path,
          message: err.message,
          value: err.value,
        })),
      };
    } else if (exception instanceof MongooseError.CastError) {
      status = HttpStatus.BAD_REQUEST;
      message = {
        statusCode: status,
        message: 'Invalid ID format',
        field: exception.path,
      };
    } else if ((exception as any).code === 11000) {
      // Duplicate key error
      status = HttpStatus.CONFLICT;
      const field = Object.keys((exception as any).keyPattern)[0];
      message = {
        statusCode: status,
        message: `${field} already exists`,
        field,
      };
    }

    response.status(status).json(message);
  }
}

// Apply in main.ts
app.useGlobalFilters(new AllExceptionsFilter());
```

## Quick Debug Checklist

When Mongoose validation isn't working:

1. ✅ Check if `ValidationPipe` is enabled in main.ts
2. ✅ Verify DTO has class-validator decorators
3. ✅ Ensure `class-validator` and `class-transformer` are installed
4. ✅ Check if schema has validation rules defined
5. ✅ Verify using `create()` or `save()` methods (not `insertMany`)
6. ✅ Check if `runValidators: true` is set for updates
7. ✅ Look for validation errors in try-catch blocks
8. ✅ Confirm `whitelist: true` in ValidationPipe options
9. ✅ Check if custom validators are async and awaited
10. ✅ Verify ValidationPipe is applied to the correct scope

## Example: Complete User Module with Validation

```typescript
// user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ 
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  })
  name: string;

  @Prop({ 
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  })
  email: string;

  @Prop({ 
    required: [true, 'Age is required'],
    min: [0, 'Age must be positive'],
    max: [120, 'Age must be less than 120']
  })
  age: number;

  @Prop({ 
    type: String,
    enum: {
      values: ['user', 'admin', 'moderator'],
      message: '{VALUE} is not a valid role'
    },
    default: 'user'
  })
  role: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// create-user.dto.ts
import { IsString, IsEmail, IsNotEmpty, Min, Max, IsEnum, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  name: string;

  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Please provide a valid email' })
  email: string;

  @IsNotEmpty({ message: 'Age is required' })
  @Min(0, { message: 'Age must be at least 0' })
  @Max(120, { message: 'Age cannot exceed 120' })
  age: number;

  @IsOptional()
  @IsEnum(['user', 'admin', 'moderator'], { 
    message: 'Role must be user, admin, or moderator' 
  })
  role?: string;
}

// update-user.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {}

// user.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      return await this.userModel.create(createUserDto);
    } catch (error) {
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map((err: any) => err.message);
        throw new BadRequestException({
          message: 'Validation failed',
          errors: messages
        });
      }
      if (error.code === 11000) {
        throw new BadRequestException('Email already exists');
      }
      throw error;
    }
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    try {
      const user = await this.userModel.findByIdAndUpdate(
        id,
        updateUserDto,
        {
          new: true,
          runValidators: true,
          context: 'query',
        },
      );

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      return user;
    } catch (error) {
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map((err: any) => err.message);
        throw new BadRequestException({
          message: 'Validation failed',
          errors: messages
        });
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }
}

// user.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}

// main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(3000);
}
bootstrap();
```

## Summary

Mongoose schema validation not working in NestJS is usually due to missing configuration or incorrect usage.

**Key solutions:**
- Enable `ValidationPipe` globally in main.ts
- Use class-validator decorators in DTOs
- Add validation rules to Mongoose schemas
- Use `create()` or `save()` methods (not `insertMany`)
- Enable `runValidators: true` for update operations
- Implement proper error handling for validation errors
- Use dual-layer validation (DTO + Schema)
- Apply global exception filters for consistent error responses

## Related Problems

- [Fix Cannot Read Property of Undefined in NestJS](/problems/cannot-read-property-undefined-nestjs)
- [Fix MongoDB Connection Timeout](/problems/mongodb-connection-timeout)
- [Fix 401 Unauthorized Error in Axios](/problems/401-unauthorized-axios)