import { Module, Global } from '@nestjs/common';
import { ReporterService } from './reporter.service';
import { MetricsModule } from '../metrics/metrics.module';

@Global()
@Module({
  imports: [MetricsModule],
  providers: [ReporterService],
  exports: [ReporterService],
})
export class ReporterModule {}
