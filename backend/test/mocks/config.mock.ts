export const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, any> = {
      'bcrypt.rounds': 4,
      'jwt.secret': 'test-secret',
      'jwt.expiry': '15m',
      frontendUrl: 'http://localhost:3000',
    };
    return config[key];
  }),
};
