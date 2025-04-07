import { Injectable, NestMiddleware } from '@nestjs/common';
import { ReporterService } from '../reporter/reporter.service';

@Injectable()
export class ErrorTrackingMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    res.on('finish', () => {
      if (res.statusCode === 500) {
        ReporterService.counter('http_500_error_count', {
          method: req.method,
          path: req.originalUrl
        });
      }
    });
    next();
  }
}
