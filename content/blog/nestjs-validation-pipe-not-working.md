# Fix NestJS ValidationPipe Not Working: Complete Troubleshooting Guide

## Introduction

Are you frustrated because your NestJS ValidationPipe isn't validating your DTOs? You're not alone. Many developers struggle with ValidationPipe configuration, especially when starting with NestJS. The validation simply doesn't work, and requests with invalid data pass through without any errors.

In this comprehensive guide, we'll explore why ValidationPipe fails, common configuration mistakes, and proven solutions with real-world examples. Whether you're a beginner or experienced developer, you'll find actionable fixes to get your validation working properly.

## What is NestJS ValidationPipe?

ValidationPipe is a built-in NestJS pipe that automatically validates incoming request payloads against DTO (Data Transfer Object) classes decorated with class-validator decorators. When properly configured, it ensures that only valid data reaches your controllers and services.

### Expected Behavior

When ValidationPipe is working correctly:
- Invalid requests return `400 Bad Request` with detailed error messages
- Valid requests proceed to your controller methods
- Type transformations happen automatically
- Whitelist filtering removes unexpected properties

### When It's Not Working

You'll notice ValidationPipe isn't working when:
- Invalid data passes through without errors
- Validation decorators are ignored
- No error messages are returned
- Type transformations don't occur

## Common Causes and Solutions

### 1. Missing Required Dependencies

**Problem:**

ValidationPipe requires two peer dependencies that aren't installed by default.
```typescript
// Your DTO
import { IsString, IsEmail } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;
}
```

**Validation doesn't work - no errors thrown!**

**Solution:**

Install both required packages:
```bash
npm install class-validator class-transformer
# or
yarn add class-validator class-transformer
# or
pnpm add class-validator class-transformer
```

**Why both packages?**
- `class-validator` - Provides validation decorators
- `class-transformer` - Transforms plain objects to class instances (required for decorators to work)

### 2. ValidationPipe Not Registered Globally

**Problem:**

ValidationPipe is defined but not registered in your application.
```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ValidationPipe not registered!
  await app.listen(3000);
}
bootstrap();
```

**Solution 1: Global Registration in main.ts (Recommended)**
```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  await app.listen(3000);
}
bootstrap();
```

**Solution 2: Global Registration in AppModule**
```typescript
// app.module.ts
import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';

@Module({
  providers: [
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule {}
```

**Solution 3: Controller-Level Registration**
```typescript
// user.controller.ts
import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common';

@Controller('users')
export class UserController {
  @Post()
  @UsePipes(new ValidationPipe())
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }
}
```

### 3. Missing DTO Type Declaration

**Problem:**

Your parameter isn't typed with your DTO class.
```typescript
// ❌ Wrong - validation won't work
@Post()
create(@Body() body) {
  return this.userService.create(body);
}

// ❌ Wrong - using interface instead of class
@Post()
create(@Body() createUserDto: CreateUserInterface) {
  return this.userService.create(createUserDto);
}
```

**Solution:**

Always use class types for DTOs, not interfaces or untyped parameters:
```typescript
// ✅ Correct
@Post()
create(@Body() createUserDto: CreateUserDto) {
  return this.userService.create(createUserDto);
}
```

**Why?** Interfaces are removed during TypeScript compilation. ValidationPipe needs actual classes at runtime.

### 4. Using Interface Instead of Class for DTO

**Problem:**
```typescript
// ❌ This won't work!
export interface CreateUserDto {
  email: string;
  name: string;
}
```

**Solution:**

Always use classes with decorators:
```typescript
// ✅ Correct
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  name: string;
}
```

### 5. Incorrect ValidationPipe Configuration

**Problem:**

ValidationPipe is registered but with incorrect options.

**Solution:**

Use proper configuration options:
```typescript
app.useGlobalPipes(new ValidationPipe({
  // Remove properties not in DTO
  whitelist: true,
  
  // Throw error if non-whitelisted properties exist
  forbidNonWhitelisted: true,
  
  // Automatically transform payloads to DTO instances
  transform: true,
  
  // Strip properties with undefined values
  skipUndefinedProperties: false,
  
  // Strip properties with null values
  skipNullProperties: false,
  
  // Disable detailed error messages (production)
  disableErrorMessages: false,
  
  // Validate nested objects
  validationError: {
    target: false,
    value: false,
  },
}));
```

### 6. Missing Decorators on DTO Properties

**Problem:**

Properties exist but have no validation decorators:
```typescript
// ❌ No validation will occur
export class CreateUserDto {
  email: string;  // No decorator!
  name: string;   // No decorator!
}
```

**Solution:**

Add appropriate validation decorators:
```typescript
import { 
  IsEmail, 
  IsString, 
  IsNotEmpty, 
  MinLength, 
  MaxLength,
  IsOptional 
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @IsString()
  @IsOptional()
  bio?: string;
}
```

### 7. Nested Object Validation Issues

**Problem:**

Nested objects aren't being validated:
```typescript
export class CreateUserDto {
  @IsString()
  name: string;

  address: AddressDto;  // Not validated!
}
```

**Solution:**

Use `@ValidateNested()` and `@Type()` decorators:
```typescript
import { IsString, ValidateNested } from 'class-validator';
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
}
```

### 8. Array Validation Not Working

**Problem:**

Arrays of objects aren't validated:
```typescript
export class CreateOrderDto {
  @IsArray()
  items: OrderItemDto[];  // Items not validated!
}
```

**Solution:**

Use `@ValidateNested()` with `{ each: true }`:
```typescript
import { IsArray, ValidateNested, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  quantity: number;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
```

### 9. Query Parameters Not Validating

**Problem:**

Query parameters bypass validation:
```typescript
// Not working
@Get()
findAll(@Query() query) {
  return this.service.findAll(query);
}
```

**Solution:**

Create and type your query DTO:
```typescript
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

@Get()
findAll(@Query() query: PaginationQueryDto) {
  return this.service.findAll(query);
}
```

### 10. Custom Decorators Not Working

**Problem:**

Custom validation decorator doesn't execute:
```typescript
// Custom decorator
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return typeof value === 'string' && /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(value);
        },
      },
    });
  };
}
```

**Solution:**

Implement `ValidatorConstraintInterface`:
```typescript
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (typeof value !== 'string') return false;
    
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasSpecialChar = /[!@#$%^&*]/.test(value);
    const isLongEnough = value.length >= 8;
    
    return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar && isLongEnough;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Password must contain uppercase, lowercase, number, special character and be at least 8 characters long';
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}

// Usage
export class ChangePasswordDto {
  @IsStrongPassword()
  newPassword: string;
}
```

## Complete Working Example

### Project Setup
```bash
# Create new NestJS project
nest new my-project

# Install required dependencies
npm install class-validator class-transformer

# Generate resources
nest g resource users --no-spec
```

### main.ts Configuration
```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS if needed
  app.enableCors();

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
```

### Complete DTO Example
```typescript
// create-user.dto.ts
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  ValidateNested,
  IsArray,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator',
}

export class AddressDto {
  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(10)
  zipCode: string;
}

export class CreateUserDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Name cannot exceed 50 characters' })
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @IsInt()
  @Min(18, { message: 'User must be at least 18 years old' })
  @Max(120)
  age: number;

  @IsEnum(UserRole, { message: 'Role must be either admin, user, or moderator' })
  @IsOptional()
  role?: UserRole = UserRole.USER;

  @ValidateNested()
  @Type(() => AddressDto)
  @IsOptional()
  address?: AddressDto;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
```

### Controller Implementation
```typescript
// users.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    console.log('Received DTO:', createUserDto);
    console.log('DTO is instance of CreateUserDto:', createUserDto instanceof CreateUserDto);
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
```

### Update DTO with Partial Validation
```typescript
// update-user.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

## Advanced Configuration

### Custom Exception Factory

Customize validation error responses:
```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    exceptionFactory: (errors) => {
      const formattedErrors = errors.reduce((acc, error) => {
        acc[error.property] = Object.values(error.constraints || {});
        return acc;
      }, {});

      return new BadRequestException({
        statusCode: 400,
        message: 'Validation failed',
        errors: formattedErrors,
      });
    },
  }),
);
```

### Environment-Based Configuration
```typescript
// main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    disableErrorMessages: process.env.NODE_ENV === 'production',
  }),
);
```

### Multiple Validation Groups
```typescript
import { IsString, IsEmail } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { groups: ['create', 'update'] })
  email: string;

  @IsString({ groups: ['create'] })
  password: string;
}

// In controller
@Post()
@UsePipes(new ValidationPipe({ groups: ['create'] }))
create(@Body() createUserDto: CreateUserDto) {
  return this.usersService.create(createUserDto);
}
```

## Testing Your Validation

### Unit Testing DTOs
```typescript
// create-user.dto.spec.ts
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { CreateUserDto } from './create-user.dto';

describe('CreateUserDto', () => {
  it('should fail with invalid email', async () => {
    const dto = plainToClass(CreateUserDto, {
      email: 'invalid-email',
      name: 'John',
      password: 'password123',
      age: 25,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('email');
  });

  it('should pass with valid data', async () => {
    const dto = plainToClass(CreateUserDto, {
      email: 'john@example.com',
      name: 'John Doe',
      password: 'password123',
      age: 25,
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
```

### E2E Testing
```typescript
// users.e2e-spec.ts
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('Users', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    await app.init();
  });

  it('POST /users - should reject invalid email', () => {
    return request(app.getHttpServer())
      .post('/users')
      .send({
        email: 'invalid-email',
        name: 'John',
        password: 'password123',
        age: 25,
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toContain('email');
      });
  });

  it('POST /users - should accept valid data', () => {
    return request(app.getHttpServer())
      .post('/users')
      .send({
        email: 'john@example.com',
        name: 'John Doe',
        password: 'password123',
        age: 25,
      })
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });
});
```

## Common Validation Decorators Reference

### String Validators
```typescript
@IsString()
@IsNotEmpty()
@MinLength(5)
@MaxLength(100)
@Matches(/^[a-zA-Z ]+$/, { message: 'Name can only contain letters and spaces' })
@IsAlpha()
@IsAlphanumeric()
```

### Number Validators
```typescript
@IsNumber()
@IsInt()
@Min(0)
@Max(100)
@IsPositive()
@IsNegative()
```

### Email and URL Validators
```typescript
@IsEmail()
@IsUrl()
@IsIP()
@IsMACAddress()
```

### Date Validators
```typescript
@IsDate()
@IsDateString()
@MinDate(new Date())
@MaxDate(new Date('2025-12-31'))
```

### Boolean and Enum Validators
```typescript
@IsBoolean()
@IsEnum(UserRole)
```

### Array Validators
```typescript
@IsArray()
@ArrayMinSize(1)
@ArrayMaxSize(10)
@ArrayUnique()
```

## Debugging Checklist

When ValidationPipe isn't working, check these in order:

1. ✅ **Dependencies installed?**
```bash
   npm list class-validator class-transformer
```

2. ✅ **ValidationPipe registered globally?**
```typescript
   app.useGlobalPipes(new ValidationPipe());
```

3. ✅ **Using class (not interface) for DTO?**
```typescript
   export class CreateUserDto { } // ✅ Class
   export interface CreateUserDto { } // ❌ Interface
```

4. ✅ **Parameter typed with DTO class?**
```typescript
   create(@Body() dto: CreateUserDto) // ✅ Typed
   create(@Body() dto) // ❌ Untyped
```

5. ✅ **Decorators imported from class-validator?**
```typescript
   import { IsString } from 'class-validator';
```

6. ✅ **Properties have validation decorators?**
```typescript
   @IsString() name: string; // ✅
   name: string; // ❌
```

7. ✅ **Nested objects use @ValidateNested() and @Type()?**

8. ✅ **Transform enabled for type conversion?**
```typescript
   new ValidationPipe({ transform: true })
```

## Performance Considerations

### Cache Validation Metadata
```typescript
app.useGlobalPipes(
  new ValidationPipe({
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
      exposeDefaultValues: true,
    },
    validationError: {
      target: false, // Don't expose target class
      value: false,  // Don't expose submitted value
    },
  }),
);
```

### Skip Validation for Specific Routes
```typescript
@Post('webhook')
@UsePipes() // Empty - skips global pipes
handleWebhook(@Body() data: any) {
  return this.service.handleWebhook(data);
}
```

## Production Best Practices

### 1. Hide Detailed Errors in Production
```typescript
new ValidationPipe({
  disableErrorMessages: process.env.NODE_ENV === 'production',
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
})
```

### 2. Implement Global Exception Filter
```typescript
// validation-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, BadRequestException } from '@nestjs/common';
import { Response } from 'express';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      message: 'Validation failed',
      errors: typeof exceptionResponse === 'object' 
        ? exceptionResponse['message'] 
        : exceptionResponse,
    });
  }
}

// Apply in main.ts
app.useGlobalFilters(new ValidationExceptionFilter());
```

### 3. Log Validation Errors
```typescript
import { Logger } from '@nestjs/common';

const logger = new Logger('ValidationPipe');

app.useGlobalPipes(
  new ValidationPipe({
    exceptionFactory: (errors) => {
      logger.warn('Validation failed', { errors });
      return new BadRequestException(errors);
    },
  }),
);
```

## Troubleshooting Specific Frameworks

### With GraphQL
```typescript
// In schema.gql or code-first approach
@InputType()
export class CreateUserInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @IsString()
  @MinLength(2)
  name: string;
}

// In resolver
@Mutation(() => User)
createUser(@Args('input') input: CreateUserInput) {
  return this.usersService.create(input);
}
```

### With Microservices
```typescript
// In microservice
@MessagePattern({ cmd: 'create-user' })
@UsePipes(new ValidationPipe({ transform: true }))
createUser(@Payload() createUserDto: CreateUserDto) {
  return this.usersService.create(createUserDto);
}
```

### With Swagger/OpenAPI
```typescript
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John Doe', minLength: 2, maxLength: 50 })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;
}
```

## Summary

ValidationPipe issues in NestJS usually stem from:

1. Missing `class-validator` and `class-transformer` packages
2. ValidationPipe not registered globally or locally
3. Using interfaces instead of classes for DTOs
4. Missing type declarations on controller parameters
5. Lack of validation decorators on DTO properties
6. Improper nested object validation configuration
7. Missing `transform: true` option for type conversion

**Quick Fix Checklist:**
- ✅ Install both required packages
- ✅ Register ValidationPipe globally with proper options
- ✅ Use classes (not interfaces) for all DTOs
- ✅ Type all parameters with DTO classes
- ✅ Add validation decorators to all properties
- ✅ Use `@ValidateNested()` and `@Type()` for nested objects
- ✅ Enable `transform: true` for automatic type conversion

By following these solutions and best practices, your ValidationPipe will work reliably, providing robust input validation and better API security.

## Additional Resources

- [NestJS Validation Documentation](https://docs.nestjs.com/techniques/validation)
- [class-validator GitHub](https://github.com/typestack/class-validator)
- [class-transformer GitHub](https://github.com/typestack/class-transformer)
- [NestJS Pipes Documentation](https://docs.nestjs.com/pipes)

---

*Last updated: January 2026*