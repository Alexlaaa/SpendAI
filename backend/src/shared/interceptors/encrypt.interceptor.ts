import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { encryptWithFrontendPublicKey } from '../utils/encryption.util';

// For encrypting outgoing responses
@Injectable()
export class EncryptInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // Serialize data to JSON string
        const serializedData = JSON.stringify(data);

        // Encrypt serialized data with Frontend's Public Key
        const encryptedData = encryptWithFrontendPublicKey(serializedData);

        // Return encrypted data
        return {
          payload: encryptedData,
        };
      }),
    );
  }
}
