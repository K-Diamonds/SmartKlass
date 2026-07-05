export class HealthCheckDto {
  status!: 'ok' | 'degraded' | 'down';
  timestamp!: string;
  service!: string;
  version!: string;
  checks!: {
    database: 'ok' | 'down';
  };
}
