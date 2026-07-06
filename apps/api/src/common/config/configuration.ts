export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.API_PORT ?? process.env.PORT ?? '4000', 10),
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
  apiUrl: process.env.API_URL ?? 'http://localhost:4000',
  webUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  staff: {
    userIds: (process.env.STAFF_USER_IDS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    emails: (process.env.STAFF_EMAILS ?? '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  },
  adminRoleAssignments: (process.env.ADMIN_ROLE_ASSIGNMENTS ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [identifier, role] = entry.split(':').map((part) => part.trim());
      return { identifier, role: role?.toUpperCase() };
    })
    .filter(
      (entry): entry is { identifier: string; role: string } =>
        Boolean(entry.identifier && entry.role),
    ),
  adminRateLimit: {
    maxRequests: parseInt(process.env.ADMIN_RATE_LIMIT_MAX ?? '120', 10),
    windowMs: parseInt(process.env.ADMIN_RATE_LIMIT_WINDOW_MS ?? '60000', 10),
  },
  redisUrl: process.env.REDIS_URL,
});
