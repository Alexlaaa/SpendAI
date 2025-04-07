import { Injectable, NestMiddleware } from '@nestjs/common';
import { ReporterService } from '../reporter/reporter.service';

@Injectable()
export class RequestTimingMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const start = process.hrtime();
    res.on('finish', () => {
      const [seconds, nanoseconds] = process.hrtime(start);
      const durationInSeconds = seconds + nanoseconds / 1e9;

      ReporterService.histogram(
        'http_request_duration_seconds',
        durationInSeconds,
        {
          method: req.method,
          path: req.originalUrl,
          status: res.statusCode.toString(),
        },
      );
    });

    next();
  }
}
