# Connect MongoDB Atlas with NestJS (Common Errors & Fixes)

A comprehensive guide to connecting your NestJS application to MongoDB Atlas cloud database with solutions to common errors.

## What is MongoDB Atlas?

MongoDB Atlas is a fully-managed cloud database service that handles deployment, maintenance, and scaling of MongoDB databases automatically.

## Project Structure

```
src/
├── config/
│   ├── database.config.ts
│   └── configuration.ts
├── modules/
│   └── users/
│       ├── schemas/
│       │   └── user.schema.ts
│       ├── users.service.ts
│       ├── users.controller.ts
│       └── users.module.ts
├── app.module.ts
└── main.ts
.env
.env.example
```

## Step 1: Create MongoDB Atlas Account

1. Go to [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account
3. Verify your email address

## Step 2: Create a Cluster

### Free Tier Setup (M0)

1. Click **"Build a Database"**
2. Choose **Shared** (Free tier)
3. Select your cloud provider (AWS, Google Cloud, or Azure)
4. Choose a region closest to your users
5. Name your cluster (e.g., "Cluster0")
6. Click **"Create"**

Wait 3-5 minutes for cluster creation.

## Step 3: Configure Database Access

### Create Database User

1. Go to **Database Access** (left sidebar)
2. Click **"Add New Database User"**
3. Choose **Password** authentication
4. Enter username: `nestjs-user`
5. Generate or enter a strong password
6. Set privileges to **"Read and write to any database"**
7. Click **"Add User"**

**Important:** Save these credentials securely!

## Step 4: Configure Network Access

### Whitelist IP Addresses

1. Go to **Network Access** (left sidebar)
2. Click **"Add IP Address"**
3. For development:
   - Click **"Allow Access from Anywhere"** (0.0.0.0/0)
   - ⚠️ Not recommended for production
4. For production:
   - Enter your server's IP address
   - Click **"Confirm"**

## Step 5: Get Connection String

1. Go to **Database** section
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. Select **Driver: Node.js** and **Version: 5.5 or later**
5. Copy the connection string:

```
mongodb+srv://nestjs-user:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

## Step 6: Install Dependencies

```bash
npm install @nestjs/mongoose mongoose
npm install @nestjs/config
npm install --save-dev @types/mongoose
```

## Step 7: Setup Environment Variables

Create `.env` file:

```env
# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://nestjs-user:your-password@cluster0.xxxxx.mongodb.net/your-database?retryWrites=true&w=majority

# Application
NODE_ENV=development
PORT=3000

# Database Name (optional - can be in URI)
DB_NAME=nestjs-db
```

Create `.env.example`:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
NODE_ENV=development
PORT=3000
DB_NAME=your-database-name
```

## Step 8: Configure Database Connection

Create `src/config/configuration.ts`:

```typescript
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    uri: process.env.MONGODB_URI,
    name: process.env.DB_NAME || 'nestjs-db',
  },
  nodeEnv: process.env.NODE_ENV || 'development',
});
```

Create `src/config/database.config.ts`:

```typescript
import { MongooseModuleOptions } from '@nestjs/mongoose';

export const getDatabaseConfig = (): MongooseModuleOptions => ({
  uri: process.env.MONGODB_URI,
  retryAttempts: 3,
  retryDelay: 1000,
  connectionFactory: (connection) => {
    connection.on('connected', () => {
      console.log('✅ MongoDB Atlas connected successfully');
    });
    connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });
    connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });
    return connection;
  },
});
```

## Step 9: Configure App Module

Update `src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import configuration from './config/configuration';
import { getDatabaseConfig } from './config/database.config';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
        ...getDatabaseConfig(),
      }),
      inject: [ConfigService],
    }),
    UsersModule,
  ],
})
export class AppModule {}
```

## Step 10: Create a Schema

Create `src/modules/users/schemas/user.schema.ts`:

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date })
  lastLogin?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes for better query performance
UserSchema.index({ email: 1 });
UserSchema.index({ createdAt: -1 });
```

## Step 11: Test the Connection

Update `src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  });

  const port = configService.get<number>('port') || 3000;
  await app.listen(port);

  console.log(`🚀 Application running on: http://localhost:${port}`);
  console.log(`📝 Environment: ${configService.get<string>('nodeEnv')}`);
}
bootstrap();
```

## Common Errors & Fixes

### ❌ Error 1: Authentication Failed

```
MongoServerError: bad auth : authentication failed
```

**Causes:**
- Incorrect username or password
- Special characters in password not URL-encoded
- User not created in correct database

**Fixes:**

```typescript
// Fix 1: URL encode your password
const password = 'P@ssw0rd!'; // Original password
const encodedPassword = encodeURIComponent(password); // P%40ssw0rd!

// Fix 2: Update connection string
const uri = `mongodb+srv://username:${encodedPassword}@cluster.mongodb.net/database`;

// Fix 3: Verify user exists in Atlas
// Go to Database Access → Check user exists and has correct permissions
```

### ❌ Error 2: IP Not Whitelisted

```
MongoServerError: connection timed out
Error: querySrv ENOTFOUND _mongodb._tcp.cluster0.xxxxx.mongodb.net
```

**Causes:**
- Your IP address is not whitelisted
- Network/firewall blocking connection

**Fixes:**

```bash
# Fix 1: Add your IP to Network Access in Atlas
# Go to Network Access → Add IP Address → Add Current IP Address

# Fix 2: For development, allow all IPs (not for production!)
# Add IP: 0.0.0.0/0

# Fix 3: Check your current IP
curl ifconfig.me

# Fix 4: If using VPN, add VPN's IP address or disable VPN
```

### ❌ Error 3: Database Name Issue

```
Error: no database name provided and no default database specified in uri
```

**Causes:**
- Database name missing from connection string
- Database name not specified in options

**Fixes:**

```typescript
// Fix 1: Add database name to URI
mongodb+srv://user:pass@cluster.mongodb.net/your-database-name?retryWrites=true

// Fix 2: Specify in connection options
MongooseModule.forRoot(uri, {
  dbName: 'your-database-name',
});

// Fix 3: Use ConfigService
MongooseModule.forRootAsync({
  useFactory: (config: ConfigService) => ({
    uri: config.get('MONGODB_URI'),
    dbName: config.get('DB_NAME'),
  }),
  inject: [ConfigService],
});
```

### ❌ Error 4: SSL/TLS Connection Error

```
MongoServerError: SSL handshake failed
```

**Causes:**
- SSL certificate issues
- Node.js version incompatibility

**Fixes:**

```typescript
// Fix 1: Add SSL options
MongooseModule.forRoot(uri, {
  ssl: true,
  tls: true,
  tlsAllowInvalidCertificates: false,
});

// Fix 2: For development only (NOT for production)
MongooseModule.forRoot(uri, {
  tlsAllowInvalidCertificates: true,
});

// Fix 3: Update Node.js to latest LTS version
// node --version should be >= 16.x
```

### ❌ Error 5: Connection Timeout

```
MongooseServerSelectionError: connect ETIMEDOUT
```

**Causes:**
- Network issues
- Firewall blocking connection
- Cluster paused/deleted

**Fixes:**

```typescript
// Fix 1: Increase timeout
MongooseModule.forRoot(uri, {
  serverSelectionTimeoutMS: 10000, // 10 seconds
  socketTimeoutMS: 45000, // 45 seconds
});

// Fix 2: Check cluster status in Atlas
// Ensure cluster is running (not paused)

// Fix 3: Test connection with mongo shell
mongosh "mongodb+srv://cluster.mongodb.net" --username user

// Fix 4: Check DNS resolution
nslookup cluster0.xxxxx.mongodb.net
```

### ❌ Error 6: Too Many Connections

```
MongoServerError: connection refused - too many connections
```

**Causes:**
- Connection pool exhausted
- Not closing connections properly
- Free tier connection limits (M0: 100 connections)

**Fixes:**

```typescript
// Fix 1: Configure connection pool
MongooseModule.forRoot(uri, {
  maxPoolSize: 10,
  minPoolSize: 2,
});

// Fix 2: Ensure proper connection handling
@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) 
    private userModel: Model<UserDocument>
  ) {}
  
  // Use lean() for read-only queries
  async findAll() {
    return this.userModel.find().lean().exec();
  }
}

// Fix 3: Implement connection retry logic
MongooseModule.forRoot(uri, {
  retryAttempts: 5,
  retryDelay: 3000,
});
```

### ❌ Error 7: Schema Validation Error

```
ValidationError: User validation failed: email: Path `email` is required
```

**Causes:**
- Missing required fields
- Data type mismatch
- Custom validation failed

**Fixes:**

```typescript
// Fix 1: Ensure DTOs match schema
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

// Fix 2: Handle validation errors
@Post()
async create(@Body() createUserDto: CreateUserDto) {
  try {
    return await this.usersService.create(createUserDto);
  } catch (error) {
    if (error.name === 'ValidationError') {
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}

// Fix 3: Make fields optional in schema
@Prop({ required: false, default: null })
middleName?: string;
```

### ❌ Error 8: Duplicate Key Error

```
MongoServerError: E11000 duplicate key error collection
```

**Causes:**
- Unique constraint violation
- Trying to insert duplicate values

**Fixes:**

```typescript
// Fix 1: Handle duplicate errors
try {
  await this.userModel.create(createUserDto);
} catch (error) {
  if (error.code === 11000) {
    throw new ConflictException('Email already exists');
  }
  throw error;
}

// Fix 2: Check before insert
async create(createUserDto: CreateUserDto) {
  const exists = await this.userModel.findOne({ 
    email: createUserDto.email 
  });
  
  if (exists) {
    throw new ConflictException('Email already exists');
  }
  
  return this.userModel.create(createUserDto);
}

// Fix 3: Use upsert for update operations
await this.userModel.findOneAndUpdate(
  { email },
  { $set: updateData },
  { upsert: true, new: true }
);
```

### ❌ Error 9: Environment Variables Not Loaded

```
Error: Connection string is undefined
```

**Causes:**
- .env file not loaded
- Wrong environment file
- Variables not exported

**Fixes:**

```typescript
// Fix 1: Install dotenv and load early
// main.ts
import * as dotenv from 'dotenv';
dotenv.config();

// Fix 2: Check ConfigModule setup
ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: '.env',
  ignoreEnvFile: false,
});

// Fix 3: Validate environment variables
import { plainToClass } from 'class-transformer';
import { IsString, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsString()
  MONGODB_URI: string;
  
  @IsString()
  PORT: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config);
  const errors = validateSync(validatedConfig);
  
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}

// Use in ConfigModule
ConfigModule.forRoot({
  validate,
});
```

### ❌ Error 10: Connection String Format Error

```
MongoParseError: Invalid connection string
```

**Causes:**
- Malformed connection string
- Missing protocol prefix
- Invalid characters

**Fixes:**

```typescript
// Fix 1: Ensure proper format
// ✅ Correct format
mongodb+srv://user:pass@cluster.mongodb.net/database?retryWrites=true&w=majority

// ❌ Wrong formats
mongodb://cluster.mongodb.net  // Missing credentials
mongodb+srv://cluster  // Incomplete
user:pass@cluster.mongodb.net  // Missing protocol

// Fix 2: Validate connection string
function validateMongoUri(uri: string): boolean {
  const pattern = /^mongodb(\+srv)?:\/\/.+/;
  return pattern.test(uri);
}

// Fix 3: Build connection string programmatically
const buildMongoUri = (
  username: string,
  password: string,
  cluster: string,
  database: string,
): string => {
  const encodedPassword = encodeURIComponent(password);
  return `mongodb+srv://${username}:${encodedPassword}@${cluster}/${database}?retryWrites=true&w=majority`;
};
```

## Best Practices for MongoDB Atlas

### 1. Security

```typescript
// Use environment-specific configurations
// .env.development
MONGODB_URI=mongodb+srv://dev-user:pass@dev-cluster.mongodb.net/dev-db

// .env.production
MONGODB_URI=mongodb+srv://prod-user:pass@prod-cluster.mongodb.net/prod-db

// Enable IP whitelist in production
// Never use 0.0.0.0/0 in production
```

### 2. Connection Pooling

```typescript
MongooseModule.forRoot(uri, {
  maxPoolSize: 50,
  minPoolSize: 10,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
});
```

### 3. Indexes

```typescript
// Create indexes for frequently queried fields
UserSchema.index({ email: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ name: 'text' }); // Text search
UserSchema.index({ location: '2dsphere' }); // Geospatial
```

### 4. Error Handling

```typescript
@Injectable()
export class DatabaseExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Database error occurred';
    
    if (exception.code === 11000) {
      status = HttpStatus.CONFLICT;
      message = 'Duplicate entry';
    } else if (exception.name === 'ValidationError') {
      status = HttpStatus.BAD_REQUEST;
      message = 'Validation failed';
    } else if (exception.name === 'CastError') {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid ID format';
    }
    
    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### 5. Health Check

```typescript
import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class HealthService {
  constructor(
    @InjectConnection() private connection: Connection
  ) {}
  
  async checkDatabase(): Promise<boolean> {
    try {
      return this.connection.readyState === 1;
    } catch {
      return false;
    }
  }
  
  async getDatabaseStats() {
    return {
      connected: this.connection.readyState === 1,
      host: this.connection.host,
      port: this.connection.port,
      name: this.connection.name,
    };
  }
}
```

## Testing Connection

Create a simple test endpoint:

```typescript
@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private connection: Connection
  ) {}
  
  @Get('db')
  async checkDatabase() {
    const isConnected = this.connection.readyState === 1;
    return {
      status: isConnected ? 'connected' : 'disconnected',
      database: this.connection.name,
      host: this.connection.host,
    };
  }
}
```

Test it:
```bash
curl http://localhost:3000/health/db
```

## Monitoring in MongoDB Atlas

1. **Performance Advisor**
   - Go to Atlas Dashboard → Performance Advisor
   - View suggested indexes
   - Monitor slow queries

2. **Real-time Performance Panel**
   - Monitor operations per second
   - Track connections
   - View memory usage

3. **Alerts**
   - Set up alerts for high CPU
   - Monitor connection limits
   - Track disk usage

## Conclusion

You now have a complete setup for connecting NestJS to MongoDB Atlas with solutions to all common errors. Remember to:

- ✅ Always URL-encode passwords
- ✅ Whitelist your IP addresses
- ✅ Use environment variables
- ✅ Implement proper error handling
- ✅ Monitor your database performance
- ✅ Keep your connection string secure
- ✅ Use connection pooling
- ✅ Create appropriate indexes

Your application is now ready for production with MongoDB Atlas!