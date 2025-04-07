import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ReporterService } from '../reporter/reporter.service';

@Injectable()
export class RequestConcurrencyMiddleware implements NestMiddleware {
    private readonly logger = new Logger("RequestConcurrencyMiddleware");
    private requestCounter = 0; // Simple counter for request ID

    use(req: Request, res: Response, next: NextFunction) {
        ReporterService.incGauge('http_requests_in_progress', { method: req.method, path: req.originalUrl });

        res.on('finish', () => {
            ReporterService.decGauge('http_requests_in_progress', { method: req.method, path: req.originalUrl });
        });

        next();
    }
}
