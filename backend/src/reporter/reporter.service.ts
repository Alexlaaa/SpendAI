import { MetricsService } from '../metrics/metrics.service';

export class ReporterService {
  private static metricsService: MetricsService;

  static init(metricsService: MetricsService): void {
    ReporterService.metricsService = metricsService;
  }

  static counter(key: string, labels?: Record<string, string | number>): void {
    ReporterService.metricsService.incCounter(key, labels);
  }

  static incGauge(key: string, labels?: Record<string, string | number>): void {
    ReporterService.metricsService.incGauge(key, labels);
  }

  static decGauge(key: string, labels?: Record<string, string | number>): void {
    ReporterService.metricsService.decGauge(key, labels);
  }

  static histogram(
    key: string,
    value: number,
    labels?: Record<string, string | number>,
  ): void {
    ReporterService.metricsService.observeHistogram(key, value, labels);
  }
}
