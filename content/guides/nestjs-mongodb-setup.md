# How to Setup NestJS with MongoDB (Best Practices)

    A comprehensive guide to integrating MongoDB with NestJS using Mongoose, following industry best practices.

## Prerequisites

- Node.js (v16 or higher)
- MongoDB installed locally or MongoDB Atlas account
- Basic understanding of TypeScript and NestJS

## Project Structure

```
src/
├── config/
│   └── database.config.ts
├── common/
│   ├── decorators/
│   ├── filters/
│   └── pipes/
├── modules/
│   └── users/
│       ├── dto/
│       │   ├── create-user.dto.ts
│       │   └── update-user.dto.ts
│       ├── schemas/
│       │   └── user.schema.ts
│       ├── users.controller.ts
│       ├── users.service.ts
│       └── users.module.ts
├── app.module.ts
└── main.ts
```

## Step 1: Install Dependencies

```bash
npm install @nestjs/mongoose mongoose
npm install --save-dev @types/mongoose
```

## Step 2: Configure Database Connection

Create `src/config/database.config.ts`:

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/nestjs-db',
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
}));
```

## Step 3: Setup Environment Variables

Create `.env` file in root:

```env
MONGODB_URI=mongodb://localhost:27017/your-database
PORT=3000
```

## Step 4: Configure App Module

Update `src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import databaseConfig from './config/database.config';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
      }),
      inject: [ConfigService],
    }),
    UsersModule,
  ],
})
export class AppModule {}
```

## Step 5: Create Schema

Create `src/modules/users/schemas/user.schema.ts`:

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true, min: 0 })
  age: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Add indexes for better query performance
UserSchema.index({ email: 1 });
UserSchema.index({ name: 1, email: 1 });
```

## Step 6: Create DTOs

Create `src/modules/users/dto/create-user.dto.ts`:

```typescript
import { IsEmail, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNumber()
  @Min(0)
  age: number;
}
```

Create `src/modules/users/dto/update-user.dto.ts`:

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

## Step 7: Create Service

Create `src/modules/users/users.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
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
    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();
    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return updatedUser;
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }
}
```

## Step 8: Create Controller

Create `src/modules/users/users.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
```

## Step 9: Create Module

Create `src/modules/users/users.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from './schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

## Step 10: Enable Validation

Update `src/main.ts`:

```typescript
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
  
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
```

## Best Practices

### 1. Use Schema Options
Always enable timestamps and set appropriate schema options:
```typescript
@Schema({ 
  timestamps: true,
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})
```

### 2. Add Indexes
Define indexes for frequently queried fields to improve performance.

### 3. Use DTOs
Always validate input data using class-validator decorators in DTOs.

### 4. Handle Errors
Use NestJS built-in exceptions like `NotFoundException`, `BadRequestException`.

### 5. Use Environment Variables
Never hardcode connection strings; use environment variables.

### 6. Implement Soft Deletes
For production apps, consider soft deletes instead of hard deletes:
```typescript
@Prop({ default: null })
deletedAt?: Date;
```

### 7. Use Lean Queries
For read-only operations, use `.lean()` for better performance:
```typescript
return this.userModel.find().lean().exec();
```

### 8. Connection Pooling
Configure connection pooling in production:
```typescript
MongooseModule.forRoot(uri, {
  maxPoolSize: 10,
  minPoolSize: 5,
})
```

## Testing the API

Start the application:
```bash
npm run start:dev
```

Test endpoints:
```bash
# Create user
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","age":30}'

# Get all users
curl http://localhost:3000/users

# Get single user
curl http://localhost:3000/users/{id}

# Update user
curl -X PATCH http://localhost:3000/users/{id} \
  -H "Content-Type: application/json" \
  -d '{"age":31}'

# Delete user
curl -X DELETE http://localhost:3000/users/{id}
```

## Conclusion

You now have a fully functional NestJS application with MongoDB integration following best practices. This setup includes proper validation, error handling, TypeScript support, and a scalable folder structure ready for production use.