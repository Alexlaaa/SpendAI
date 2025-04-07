import { Injectable, NestMiddleware, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { UserService } from './user.service';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);

  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Skip middleware for Swagger documentation
    if (req.originalUrl === '/docs') {
      return next();
    }

    // Extract JWT token from HttpOnly cookie
    const token = req.cookies?.jwt;

    if (!token) {
      this.logger.warn('JWT cookie missing');
      // Respond with 401 Unauthorized instead of throwing an exception
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: 'Not authorized. JWT cookie missing or invalid.',
      });
    }

    try {
      const decoded: any = jwt.verify(
        token,
        this.configService.get('JWT_SECRET'),
      );
      this.logger.log(`Decoded token: ${JSON.stringify(decoded)}`);

      const user = await this.userService.findEntityById(decoded.id);
      if (!user) {
        // Respond with 401 Unauthorized if the user is not found
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'User not found.',
        });
      }

      req.user = user;
      next();
    } catch (error) {
      this.logger.error('Error verifying token or fetching user', error.stack);
      // Respond with 401 Unauthorized if token verification or user fetching fails
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: 'Not authorized. Error verifying token or fetching user.',
      });
    }
  }
}
