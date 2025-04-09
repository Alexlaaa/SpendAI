import {
  Module,
  MiddlewareConsumer,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { ReceiptModule } from './receipt/receipt.module';
import { MongooseModule } from '@nestjs/mongoose';
import { MetricsModule } from './metrics/metrics.module';
import { ReporterModule } from './reporter/reporter.module';
import { RequestTimingMiddleware } from './metrics/request-timing.middleware';
import { ErrorTrackingMiddleware } from './metrics/error-tracking.middleware'; // Import the middleware
import { RequestConcurrencyMiddleware } from './metrics/request-concurrency.middleware';
import { DecryptMiddleware } from './shared/middleware/decrypt.middleware';
import { AuthMiddleware } from './user/auth.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigModule available globally
    }),

    // Set up Mongoose for MongoDB connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),

    UserModule,
    ReceiptModule,
    MetricsModule,
    ReporterModule,
  ],
  controllers: [],
  providers: [
    // Remove global EncryptInterceptor
    //   {
    //     provide: APP_INTERCEPTOR,
    //     useClass: EncryptInterceptor, // Handles encryption of outgoing responses
    //   },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply metrics middleware globally for all routes
    consumer
      .apply(RequestConcurrencyMiddleware)
      .exclude({ path: '/metrics', method: RequestMethod.ALL })
      .forRoutes('*');
    consumer
      .apply(RequestTimingMiddleware)
      .exclude({ path: '/metrics', method: RequestMethod.ALL })
      .forRoutes('*');
    consumer.apply(ErrorTrackingMiddleware).forRoutes('*');
    // Apply DecryptMiddleware for specific user routes (DecryptMiddleware is applied before AuthMiddleware -> no conflict)
    // Applicable to incoming requests with encrypted payloads
    // // Temporarily commented out
    consumer.apply(DecryptMiddleware).forRoutes(
      // { path: '/users/register', method: RequestMethod.POST }, // Create new user -> password in payload
      // { path: '/users', method: RequestMethod.PUT }, // Update user -> password in payload
      { path: '/users/api-token', method: RequestMethod.PUT }, // Update API token -> apiKey(s) in payload
      // { path: '/users/login', method: RequestMethod.POST }, // Login -> password in payload
      // { path: '/users/reset-password', method: RequestMethod.POST }, // Request password reset -> new password in payload
    );
    // Apply AuthMiddleware for specific user routes and all receipt routes
    consumer
      .apply(AuthMiddleware)
      .exclude(
        // no need for POST methods to be protected (register & login)
        { path: 'users/register', method: RequestMethod.POST },
        { path: 'users/login', method: RequestMethod.POST },
        { path: 'users/security-questions', method: RequestMethod.GET },
        { path: 'users/get-security-question', method: RequestMethod.GET },
      )
      .forRoutes(
        { path: 'users*', method: RequestMethod.GET },
        { path: 'users*', method: RequestMethod.PUT },
        { path: 'users*', method: RequestMethod.PATCH },
        { path: '/receipts', method: RequestMethod.ALL },
        { path: '/receipts/*', method: RequestMethod.ALL },
      );
  }
}
