import { Controller, Get } from '@nestjs/common';
import { ReporterService } from '../reporter/reporter.service';

// For Prometheus to scrape the /health endpoint, and every hit increments the uptime_pings_total counter.
@Controller('health')
export class HealthCheckController {
  @Get()
  checkHealth() {
    // Increment uptime ping counter
    ReporterService.counter('uptime_pings_total');
    return { status: 'UP' };
  }
}
