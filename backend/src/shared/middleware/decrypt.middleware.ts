import {
  Injectable,
  NestMiddleware,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { decryptWithBackendPrivateKey } from '../utils/encryption.util';

// For decrypting incoming requests
@Injectable()
export class DecryptMiddleware implements NestMiddleware {
  logger = new Logger('DecryptMiddleware');

  use(req: Request, res: Response, next: NextFunction) {
    const encryptedPayload = req.body.payload;

    if (!encryptedPayload) {
      this.logger.warn('No encrypted payload found in the request body');
      throw new BadRequestException('Missing encrypted payload');
    }

    this.logger.log('Received encrypted payload of:', encryptedPayload);

    try {
      this.logger.log('Decrypting payload...');
      const decryptedData = decryptWithBackendPrivateKey(encryptedPayload);
      this.logger.log('Decrypted payload:', decryptedData);
      // Replace the encrypted payload with decrypted data
      req.body = JSON.parse(decryptedData);
    } catch {
      throw new BadRequestException('Invalid encrypted payload');
    }

    next();
  }
}
