import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

// We need to mock @nestjs/passport before importing the guard
// because AuthGuard('jwt') tries to load passport strategies
jest.mock('@nestjs/passport', () => ({
  AuthGuard: () => {
    class MockAuthGuard {
      canActivate() {
        // simulate passport: would normally validate JWT
        throw new Error('No auth token');
      }
    }
    return MockAuthGuard;
  },
}));

import { JwtAuthGuard } from '../guards/jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  const createMockExecutionContext = (): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({}),
        getResponse: jest.fn().mockReturnValue({}),
      }),
      getType: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    }) as unknown as ExecutionContext;

  describe('public routes', () => {
    it('should return true when @Public() decorator is present', () => {
      const context = createMockExecutionContext();

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should check both handler and class for IS_PUBLIC_KEY metadata', () => {
      const context = createMockExecutionContext();

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });
  });

  describe('protected routes', () => {
    it('should call super.canActivate when route is not public', () => {
      const context = createMockExecutionContext();

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      // super.canActivate (mocked AuthGuard) throws because there's no token
      expect(() => guard.canActivate(context)).toThrow();
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should call super.canActivate when IS_PUBLIC_KEY metadata is undefined', () => {
      const context = createMockExecutionContext();

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      // When isPublic is falsy (undefined), it should fall through to super.canActivate
      expect(() => guard.canActivate(context)).toThrow();
    });

    it('should call super.canActivate when IS_PUBLIC_KEY metadata is null', () => {
      const context = createMockExecutionContext();

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);

      expect(() => guard.canActivate(context)).toThrow();
    });
  });

  describe('IS_PUBLIC_KEY constant', () => {
    it('should have the correct value', () => {
      expect(IS_PUBLIC_KEY).toBe('isPublic');
    });
  });
});
