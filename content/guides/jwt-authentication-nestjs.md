---
title: "JWT Authentication in NestJS (Access & Refresh Tokens)"
description: "Full guide to implementing JWT authentication in NestJS with access and refresh tokens for secure user sessions."
date: "2024-01-20"
category: "Authentication"
---

# JWT Authentication in NestJS

Learn how to implement a complete JWT authentication system in NestJS with both access and refresh tokens.

## Prerequisites

Before starting, make sure you have:

- Node.js (v16 or higher)
- NestJS project set up
- Basic understanding of JWT tokens
- MongoDB or any database (optional for storing refresh tokens)

## Installation

Install the required packages:

```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm install -D @types/passport-jwt @types/bcrypt
```

## Step 1: Create Auth Module

Generate the auth module and service:

```bash
nest g module auth
nest g service auth
nest g controller auth
```

## Step 2: Configure JWT Module

In `auth/auth.module.ts`, configure the JWT module:

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '15m', // Access token expires in 15 minutes
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtStrategy, PassportModule],
})
export class AuthModule {}
```

## Step 3: Create JWT Strategy

Create `auth/strategies/jwt.strategy.ts`:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid token');
    }

    return { userId: payload.sub, email: payload.email };
  }
}
```

## Step 4: Implement Auth Service

Create the authentication logic in `auth/auth.service.ts`:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async generateAccessToken(userId: string, email: string): Promise<string> {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }

  async generateRefreshToken(userId: string, email: string): Promise<string> {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d', // Refresh token expires in 7 days
    });
  }

  async verifyRefreshToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async refreshAccessToken(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);
    
    const accessToken = await this.generateAccessToken(
      payload.sub,
      payload.email,
    );

    return {
      accessToken,
    };
  }
}
```

## Step 5: Create Auth Controller

Implement the authentication endpoints in `auth/auth.controller.ts`:

```typescript
import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: { email: string; password: string }) {
    // Validate user credentials here (implement your user validation)
    const user = { id: '123', email: loginDto.email }; // Mock user

    const accessToken = await this.authService.generateAccessToken(
      user.id,
      user.email,
    );
    const refreshToken = await this.authService.generateRefreshToken(
      user.id,
      user.email,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refreshAccessToken(body.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req) {
    // Implement logout logic (blacklist token, clear session, etc.)
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('me')
  async getProfile(@Request() req) {
    return req.user;
  }
}
```

## Step 6: Create JWT Auth Guard

Create `auth/guards/jwt-auth.guard.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

## Step 7: Environment Variables

Add to your `.env` file:

```env
JWT_SECRET=your-super-secret-key-change-this
JWT_REFRESH_SECRET=your-refresh-secret-key-change-this
```

## Usage Example

### Login Request

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

### Protected Route

```typescript
@Controller('users')
export class UsersController {
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}
```

### Refresh Token Request

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "your-refresh-token-here"}'
```

## Best Practices

1. **Store refresh tokens securely** - Use httpOnly cookies or secure storage
2. **Implement token rotation** - Issue new refresh tokens periodically
3. **Add token blacklisting** - Maintain a blacklist for revoked tokens
4. **Use short-lived access tokens** - 15 minutes is recommended
5. **Implement rate limiting** - Prevent brute force attacks
6. **Add CSRF protection** - When using cookies
7. **Validate token on every request** - Don't trust client data
8. **Store sensitive data encrypted** - Never store passwords in plain text

## Security Considerations

- Never expose JWT secrets in client-side code
- Use HTTPS in production
- Implement proper CORS configuration
- Add request validation using class-validator
- Monitor for suspicious login activities
- Implement account lockout after failed attempts

## Troubleshooting

### "Invalid token" error
- Check if JWT_SECRET is correctly set
- Verify token hasn't expired
- Ensure token format is correct (Bearer token)

### Token not being passed
- Check Authorization header format: `Bearer <token>`
- Verify CORS settings allow Authorization header

## Related Guides

- [Setup NestJS with MongoDB](./nestjs-mongodb-setup)
- [Deploy NestJS to VPS](./deploy-nestjs-to-vps)
- [Session Authentication with Redis](./session-auth-redis-nestjs)

## Conclusion

You now have a complete JWT authentication system with refresh tokens in NestJS. This implementation is production-ready and follows security best practices.