import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let metrics: MetricsService;

  beforeEach(() => {
    metrics = new MetricsService();
  });

  it('merges quantile into existing histogram labels', () => {
    metrics.observe('http_request_duration_ms', 120, { method: 'GET' });

    const output = metrics.toPrometheus();

    expect(output).toContain('http_request_duration_ms_count{method="GET"} 1');
    expect(output).toContain(
      'http_request_duration_ms{method="GET",quantile="0.95"} 120',
    );
    expect(output).not.toContain('}{quantile=');
  });
});
