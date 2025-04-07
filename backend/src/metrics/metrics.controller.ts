import { ApiTags } from '@nestjs/swagger';
import { Controller, Get, Inject } from '@nestjs/common';
import { Registry } from 'prom-client';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  constructor(@Inject(Registry) private readonly registry: Registry) { }

  @Get()
  async getMetrics() {
    return await this.registry.metrics();
  }
}
