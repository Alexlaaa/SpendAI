import { createParamDecorator, ExecutionContext, Logger } from '@nestjs/common';

export const User = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const logger = new Logger('UserDecorator');
    const request = ctx.switchToHttp().getRequest();

    logger.log(`Authorization header: ${request.headers.authorization}`);
    // If user is already populated by middleware
    if (request.user) {
      logger.log('User found in request object, returning user.');
      return data ? request.user[data] : request.user;
    }

    return null;
  },
);
