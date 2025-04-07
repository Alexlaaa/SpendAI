import { Injectable, Inject } from '@nestjs/common';
import { Gauge, Counter, Histogram, Registry } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly counter: { [key: string]: Counter<string> } = {};
  private readonly gauge: { [key: string]: Gauge<string> } = {};
  private readonly histograms: { [key: string]: Histogram<string> } = {};
  private readonly cpuUtilizationGauge: Gauge<string>;
  private readonly memoryUtilizationGauge: Gauge<string>;

  constructor(@Inject(Registry) private readonly registry: Registry) {
    this.cpuUtilizationGauge = new Gauge({
      name: 'node_cpu_utilization_percentage',
      help: 'CPU utilization of the Node.js process in percentage',
      registers: [this.registry],
    });

    this.memoryUtilizationGauge = new Gauge({
      name: 'node_memory_utilization_percentage',
      help: 'Memory utilization of the Node.js process in percentage',
      registers: [this.registry],
    });

    this.collectMetrics();
  }

  public incCounter(key: string, labels?: Record<string, string | number>): void {
    if (!this.counter[key]) {
      this.counter[key] = new Counter({
        name: key,
        help: `Counter for ${key}`,
        labelNames: labels ? Object.keys(labels) : [],
        registers: [this.registry],
      });
    }
    this.counter[key].inc(labels);
  }

  public incGauge(key: string, labels?: Record<string, string | number>): void {
    if (!this.gauge[key]) {
      this.gauge[key] = new Gauge({
        name: key,
        help: `Gauge for ${key}`,
        labelNames: labels ? Object.keys(labels) : [],
        registers: [this.registry],
      });
    }
    this.gauge[key].inc(labels); // Increment the gauge
  }

  public decGauge(key: string, labels?: Record<string, string | number>): void {
    if (this.gauge[key]) {
      this.gauge[key].dec(labels); // Decrement the gauge
    }
  }

  public observeHistogram(key: string, value: number, labels?: Record<string, string | number>): void {
    if (!this.histograms[key]) {
      this.histograms[key] = new Histogram({
        name: key,
        help: `Histogram for ${key}`,
        labelNames: labels ? Object.keys(labels) : [],
        buckets: [0.01, 0.1, 0.2, 0.4, 1, 2, 5, 10],
        registers: [this.registry],
      });
    }
    this.histograms[key].observe(labels, value);
  }

  private collectMetrics() {
    let lastCpuUsage = process.cpuUsage();

    setInterval(() => {
      const cpuUsage = process.cpuUsage(lastCpuUsage); // Returns { user, system }
      lastCpuUsage = process.cpuUsage(); // Update lastCpuUsage for the next interval

      const totalCpuTime = (cpuUsage.user + cpuUsage.system) / 1e6; // Convert microseconds to seconds
      const totalSystemCores = require('os').cpus().length; // Get the number of CPU cores
      const totalCpuTimePerCore = 1000; // Assume a total time window of 1000ms for calculation (1 second)

      // Calculate CPU utilization percentage
      const cpuUtilization = (totalCpuTime / (totalCpuTimePerCore * totalSystemCores)) * 100;
      this.cpuUtilizationGauge.set(cpuUtilization);

      // Calculate Memory Utilization Percentage
      const memoryUsage = process.memoryUsage();
      const totalMemory = require('os').totalmem(); // Get total system memory
      const memoryUtilization = (memoryUsage.heapUsed / totalMemory) * 100; // Heap used compared to total memory

      this.memoryUtilizationGauge.set(memoryUtilization);

    }, 5000); // Update every 5 seconds
  }
}
