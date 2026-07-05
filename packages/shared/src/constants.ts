export const APP_NAME = 'SmartKlass' as const;

export const API_VERSION = 'v1' as const;

export type HealthStatus = {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
};
