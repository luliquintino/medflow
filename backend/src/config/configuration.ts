export default () => ({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  appUrl: process.env.APP_URL || 'http://localhost:3001',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3002',

  database: {
    url: process.env.DATABASE_URL,
  },

  jwt: {
    secret: (() => {
      const secret = process.env.JWT_SECRET;
      if (!secret && process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET must be set in production');
      }
      if (!secret) {
        console.warn('⚠️  JWT_SECRET not set — using insecure dev fallback. Do NOT use in production.');
      }
      return secret || 'dev-secret-DO-NOT-USE-IN-PROD';
    })(),
    expiry: process.env.JWT_EXPIRY || '15m',
    refreshSecret: (() => {
      const secret = process.env.JWT_REFRESH_SECRET;
      if (!secret && process.env.NODE_ENV === 'production') {
        throw new Error('JWT_REFRESH_SECRET must be set in production');
      }
      if (!secret) {
        console.warn('⚠️  JWT_REFRESH_SECRET not set — using insecure dev fallback.');
      }
      return secret || 'dev-refresh-secret-DO-NOT-USE-IN-PROD';
    })(),
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  },

  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
    from: process.env.RESEND_FROM || 'Med Flow <onboarding@resend.dev>',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/v1/auth/google/callback',
  },
});
