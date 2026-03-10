export const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-access-token'),
  verify: jest.fn().mockReturnValue({ sub: 'user-1', email: 'test@test.com' }),
};
