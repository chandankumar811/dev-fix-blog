# Session Authentication with Redis in NestJS

A comprehensive guide to implementing session-based authentication in NestJS using Redis as the session store.

## What is Session Authentication?

Session authentication stores user session data on the server (Redis) and sends a session ID to the client via cookies. The session ID is used to retrieve user information on subsequent requests.

## Why Redis for Sessions?

- **Fast**: In-memory storage for quick lookups
- **Scalable**: Works across multiple server instances
- **TTL Support**: Automatic session expiration
- **Persistent**: Optional data persistence

## Project Structure

```
src/
├── auth/
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── public.decorator.ts
│   ├── guards/
│   │   ├── auth.guard.ts
│   │   └── session.guard.ts
│   ├── dto/
│   │   ├── login.dto.ts
│   │   └── register.dto.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── users/
│   ├── schemas/
│   │   └── user.schema.ts
│   ├── users.service.ts
│   └── users.module.ts
├── config/
│   ├── redis.config.ts
│   └── session.config.ts
├── app.module.ts
└── main.ts
.env
```

## Step 1: Install Dependencies

```bash
# Core dependencies
npm install express-session connect-redis ioredis
npm install bcrypt

# Type definitions
npm install --save-dev @types/express-session @types/connect-redis @types/bcrypt

# Validation
npm install class-validator class-transformer
```

## Step 2: Setup Redis

### Local Redis Installation

**macOS:**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

**Windows:**
```bash
# Use Docker
docker run -d -p 6379:6379 --name redis redis:alpine
```

### Verify Redis is Running

```bash
redis-cli ping
# Should return: PONG
```

## Step 3: Configure Environment Variables

Create `.env`:

```env
# Application
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Session Configuration
SESSION_SECRET=your-super-secret-key-change-this-in-production
SESSION_NAME=nestjs.sid
SESSION_MAX_AGE=86400000
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false

# Database
MONGODB_URI=mongodb://localhost:27017/nestjs-auth
```

## Step 4: Configure Redis Connection

Create `src/config/redis.config.ts`:

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB, 10) || 0,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
}));
```

Create `src/config/session.config.ts`:

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('session', () => ({
  secret: process.env.SESSION_SECRET || 'change-this-secret',
  name: process.env.SESSION_NAME || 'nestjs.sid',
  maxAge: parseInt(process.env.SESSION_MAX_AGE, 10) || 86400000, // 24 hours
  cookie: {
    domain: process.env.COOKIE_DOMAIN || 'localhost',
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax' as const,
  },
}));
```

## Step 5: Setup Session Middleware

Update `src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as session from 'express-session';
import * as passport from 'passport';
import { createClient } from 'redis';
import RedisStore from 'connect-redis';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Redis client setup
  const redisClient = createClient({
    socket: {
      host: configService.get('redis.host'),
      port: configService.get('redis.port'),
    },
    password: configService.get('redis.password'),
    database: configService.get('redis.db'),
  });

  redisClient.on('error', (err) => console.error('Redis Client Error', err));
  redisClient.on('connect', () => console.log('✅ Redis connected'));
  await redisClient.connect();

  // Session store
  const redisStore = new RedisStore({
    client: redisClient,
    prefix: 'sess:',
    ttl: 86400, // 24 hours in seconds
  });

  // Session middleware
  app.use(
    session({
      store: redisStore,
      secret: configService.get('session.secret'),
      name: configService.get('session.name'),
      resave: false,
      saveUninitialized: false,
      rolling: true, // Reset expiry on every request
      cookie: {
        maxAge: configService.get('session.maxAge'),
        httpOnly: configService.get('session.cookie.httpOnly'),
        secure: configService.get('session.cookie.secure'),
        sameSite: configService.get('session.cookie.sameSite'),
        domain: configService.get('session.cookie.domain'),
      },
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: configService.get('FRONTEND_URL'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = configService.get('PORT') || 3000;
  await app.listen(port);
  console.log(`🚀 Application running on: http://localhost:${port}`);
}
bootstrap();
```

## Step 6: Create User Schema

Create `src/users/schemas/user.schema.ts`:

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

// Indexes
UserSchema.index({ email: 1 });

// Remove password from JSON response
UserSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  },
});
```

## Step 7: Create DTOs

Create `src/auth/dto/register.dto.ts`:

```typescript
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
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
```

Create `src/auth/dto/login.dto.ts`:

```typescript
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
```

## Step 8: Create Session Type Declaration

Create `src/types/session.types.ts`:

```typescript
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId: string;
    email: string;
  }
}
```

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "typeRoots": ["./node_modules/@types", "./src/types"]
  }
}
```

## Step 9: Create Auth Service

Create `src/auth/auth.service.ts`:

```typescript
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../users/schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async register(registerDto: RegisterDto): Promise<Omit<User, 'password'>> {
    const { email, password, name } = registerDto;

    // Check if user exists
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await this.userModel.create({
      name,
      email,
      password: hashedPassword,
    });

    return user.toJSON();
  }

  async login(loginDto: LoginDto): Promise<Omit<User, 'password'>> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.userModel.updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } },
    );

    return user.toJSON();
  }

  async validateUser(userId: string): Promise<User | null> {
    return this.userModel.findById(userId).select('-password').lean();
  }

  async getUserById(userId: string): Promise<User> {
    const user = await this.userModel
      .findById(userId)
      .select('-password')
      .lean();

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }
}
```

## Step 10: Create Custom Decorators

Create `src/auth/decorators/current-user.decorator.ts`:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.session?.userId;
  },
);
```

Create `src/auth/decorators/public.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

## Step 11: Create Auth Guard

Create `src/auth/guards/session.guard.ts`:

```typescript
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const session = request.session;

    if (!session || !session.userId) {
      throw new UnauthorizedException('Please login to continue');
    }

    return true;
  }
}
```

## Step 12: Create Auth Controller

Create `src/auth/auth.controller.ts`:

```typescript
import {
  Controller,
  Post,
  Get,
  Body,
  Session,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Session as ExpressSession } from 'express-session';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: RegisterDto,
    @Session() session: ExpressSession,
  ) {
    const user = await this.authService.register(registerDto);

    // Create session
    session.userId = user._id.toString();
    session.email = user.email;

    return {
      message: 'Registration successful',
      user,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Session() session: ExpressSession,
  ) {
    const user = await this.authService.login(loginDto);

    // Create session
    session.userId = user._id.toString();
    session.email = user.email;

    return {
      message: 'Login successful',
      user,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Session() session: ExpressSession) {
    return new Promise((resolve, reject) => {
      session.destroy((err) => {
        if (err) {
          reject(new UnauthorizedException('Logout failed'));
        }
        resolve({ message: 'Logout successful' });
      });
    });
  }

  @Get('me')
  async getCurrentUser(@CurrentUser() userId: string) {
    if (!userId) {
      throw new UnauthorizedException('Not authenticated');
    }

    const user = await this.authService.getUserById(userId);
    return { user };
  }

  @Get('session')
  getSession(@Session() session: ExpressSession) {
    return {
      authenticated: !!session.userId,
      sessionId: session.id,
      userId: session.userId,
      email: session.email,
    };
  }
}
```

## Step 13: Create Auth Module

Create `src/auth/auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionGuard } from './guards/session.guard';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: SessionGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
```

## Step 14: Update App Module

Update `src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import redisConfig from './config/redis.config';
import sessionConfig from './config/session.config';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [redisConfig, sessionConfig],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    AuthModule,
  ],
})
export class AppModule {}
```

## Step 15: Create Protected Routes Example

Create `src/profile/profile.controller.ts`:

```typescript
import { Controller, Get, Put, Body } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthService } from '../auth/auth.service';

@Controller('profile')
export class ProfileController {
  constructor(private authService: AuthService) {}

  @Get()
  async getProfile(@CurrentUser() userId: string) {
    const user = await this.authService.getUserById(userId);
    return { user };
  }

  @Put()
  async updateProfile(
    @CurrentUser() userId: string,
    @Body() updateData: any,
  ) {
    // Add update logic here
    return { message: 'Profile updated', userId };
  }
}
```

## Common Issues & Solutions

### ❌ Issue 1: Session Not Persisting

```typescript
// Problem: Session data is lost between requests

// Solution 1: Ensure credentials are included in frontend
fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  credentials: 'include', // Important!
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});

// Solution 2: Check CORS configuration
app.enableCors({
  origin: 'http://localhost:3001',
  credentials: true, // Must be true
});

// Solution 3: Verify cookie settings
cookie: {
  sameSite: 'lax', // Use 'none' for cross-domain
  secure: false, // Set to true only with HTTPS
  httpOnly: true,
}
```

### ❌ Issue 2: Redis Connection Failed

```typescript
// Problem: Cannot connect to Redis

// Solution 1: Verify Redis is running
// Terminal:
redis-cli ping

// Solution 2: Check connection config
const redisClient = createClient({
  socket: {
    host: 'localhost',
    port: 6379,
    reconnectStrategy: (retries) => Math.min(retries * 50, 500),
  },
});

// Solution 3: Handle connection errors
redisClient.on('error', (err) => {
  console.error('Redis Error:', err);
});

redisClient.on('connect', () => {
  console.log('Redis connected successfully');
});
```

### ❌ Issue 3: Session Expires Too Quickly

```typescript
// Problem: User session expires unexpectedly

// Solution: Configure rolling sessions
app.use(
  session({
    rolling: true, // Reset expiry on activity
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  }),
);
```

### ❌ Issue 4: CORS Errors

```typescript
// Problem: CORS blocking requests

// Solution: Proper CORS setup
app.enableCors({
  origin: ['http://localhost:3001', 'https://yourdomain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type'],
});

// For cross-domain with HTTPS
cookie: {
  sameSite: 'none',
  secure: true, // Required for sameSite: 'none'
}
```

### ❌ Issue 5: TypeScript Session Errors

```typescript
// Problem: Property 'userId' does not exist on type 'Session'

// Solution: Create type declaration file
// src/types/session.types.ts
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId: string;
    email: string;
    // Add more custom properties
  }
}

// Update tsconfig.json
{
  "compilerOptions": {
    "typeRoots": ["./node_modules/@types", "./src/types"]
  }
}
```

## Testing with Postman/cURL

### Register User

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }' \
  -c cookies.txt
```

### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }' \
  -c cookies.txt
```

### Access Protected Route

```bash
curl -X GET http://localhost:3000/auth/me \
  -b cookies.txt
```

### Logout

```bash
curl -X POST http://localhost:3000/auth/logout \
  -b cookies.txt
```

## Frontend Integration (React Example)

```typescript
// api.ts
const API_URL = 'http://localhost:3000';

export const api = {
  register: async (data: RegisterData) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  login: async (data: LoginData) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  logout: async () => {
    const res = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    return res.json();
  },

  getCurrentUser: async () => {
    const res = await fetch(`${API_URL}/auth/me`, {
      credentials: 'include',
    });
    return res.json();
  },
};
```

## Redis Session Management

### View All Sessions

```bash
redis-cli
KEYS sess:*
GET sess:SESSION_ID
```

### Delete Session

```bash
redis-cli
DEL sess:SESSION_ID
```

### Clear All Sessions

```bash
redis-cli
KEYS sess:* | xargs redis-cli DEL
```

## Production Best Practices

### 1. Use Redis Sentinel/Cluster

```typescript
const redisClient = createClient({
  sentinels: [
    { host: 'sentinel1', port: 26379 },
    { host: 'sentinel2', port: 26379 },
  ],
  name: 'mymaster',
  password: process.env.REDIS_PASSWORD,
});
```

### 2. Implement Session Rotation

```typescript
@Post('rotate-session')
async rotateSession(@Session() session: ExpressSession) {
  const oldSessionId = session.id;
  
  return new Promise((resolve, reject) => {
    session.regenerate((err) => {
      if (err) reject(err);
      session.userId = session.userId; // Keep user data
      resolve({ message: 'Session rotated', oldSessionId });
    });
  });
}
```

### 3. Add Rate Limiting

```bash
npm install @nestjs/throttler
```

```typescript
@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10,
    }),
  ],
})
```

### 4. Secure Cookie Settings for Production

```typescript
cookie: {
  secure: true, // HTTPS only
  httpOnly: true, // Prevent XSS
  sameSite: 'strict', // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  domain: '.yourdomain.com', // Allow subdomains
}
```

### 5. Monitor Redis Performance

```typescript
redisClient.on('ready', () => {
  console.log('Redis ready');
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
  // Send alert to monitoring service
});

redisClient.on('reconnecting', () => {
  console.warn('Redis reconnecting');
});
```

## Session vs JWT Comparison

| Feature | Sessions (Redis) | JWT |
|---------|-----------------|-----|
| Storage | Server-side | Client-side |
| Scalability | Requires shared store | Stateless |
| Revocation | Easy | Complex |
| Performance | Redis lookup | No lookup |
| Security | More secure | Token in client |
| Use Case | Traditional apps | APIs, mobile |

## Conclusion

You now have a complete session authentication system with:

- ✅ Redis session storage
- ✅ Secure cookie handling
- ✅ Protected routes with guards
- ✅ User registration and login
- ✅ Session management
- ✅ Production-ready configuration
- ✅ Error handling
- ✅ TypeScript support

Your application is ready for production with secure, scalable session authentication!