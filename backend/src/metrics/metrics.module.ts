import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { Registry } from 'prom-client';
import { HealthCheckController } from './healthcheck.controller';

@Module({
  providers: [
    MetricsService,
    {
      provide: Registry,
      useFactory: () => new Registry(),
    },
  ],
  controllers: [MetricsController, HealthCheckController],
  exports: [MetricsService],
})
export class MetricsModule { }
