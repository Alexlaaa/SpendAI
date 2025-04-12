import { createParamDecorator, ExecutionContext, Logger } from '@nestjs/common';

export const User = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const logger = new Logger('UserDecorator');
    const request = ctx.switchToHttp().getRequest();

    logger.log(`Authorization header: ${request.headers.authorization}`);
    // If user is already populated by middleware (UserDocument)
    if (request.user) {
      logger.log('User found in request object, processing...');
      const userDoc = request.user; // UserDocument from middleware

      // If a specific field is requested (e.g., @User('_id'))
      if (data) {
        logger.log(`Returning specific field: ${data}`);
        return userDoc[data];
      }

      // If the whole payload is requested (@User())
      logger.log('Returning AuthenticatedUserPayload object.');
      // Construct the payload object expected by controllers/services
      return {
        userId: userDoc._id?.toString(), // Map _id to userId
        email: userDoc.email,
        tier: userDoc.tier,
        billingCycle: userDoc.billingCycle,
      };
    }

    logger.log('User not found in request object.');
    return null;
  },
);
