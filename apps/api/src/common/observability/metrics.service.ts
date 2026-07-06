import { Injectable } from '@nestjs/common';

type CounterMap = Map<string, number>;

@Injectable()
export class MetricsService {
  private readonly counters: CounterMap = new Map();
  private readonly histograms = new Map<string, number[]>();

  increment(name: string, labels?: Record<string, string>): void {
    const key = this.key(name, labels);
    this.counters.set(key, (this.counters.get(key) ?? 0) + 1);
  }

  observe(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.key(name, labels);
    const values = this.histograms.get(key) ?? [];
    values.push(value);
    if (values.length > 1000) {
      values.shift();
    }
    this.histograms.set(key, values);
  }

  snapshot(): Record<string, unknown> {
    const counters: Record<string, number> = {};
    for (const [key, value] of this.counters) {
      counters[key] = value;
    }

    const histograms: Record<string, { count: number; p95: number }> = {};
    for (const [key, values] of this.histograms) {
      const sorted = [...values].sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.95);
      histograms[key] = {
        count: sorted.length,
        p95: sorted[p95Index] ?? 0,
      };
    }

    return { counters, histograms };
  }

  private key(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }
    const parts = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`);
    return `${name}{${parts.join(',')}}`;
  }
}
