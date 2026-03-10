import { IS_PUBLIC_KEY, Public } from '../decorators/public.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

describe('Decorators', () => {
  describe('@Public()', () => {
    it('should set IS_PUBLIC_KEY metadata to true', () => {
      // Create a test class with the decorator applied
      @Public()
      class TestHandler {
        handle() {
          return;
        }
      }

      // The SetMetadata decorator sets metadata on the class
      const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, TestHandler);
      expect(metadata).toBe(true);
    });

    it('should set metadata on a method when applied to a method', () => {
      class TestController {
        @Public()
        publicRoute() {
          return;
        }

        privateRoute() {
          return;
        }
      }

      const publicMetadata = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        TestController.prototype.publicRoute,
      );
      const privateMetadata = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        TestController.prototype.privateRoute,
      );

      expect(publicMetadata).toBe(true);
      expect(privateMetadata).toBeUndefined();
    });

    it('should export IS_PUBLIC_KEY as "isPublic"', () => {
      expect(IS_PUBLIC_KEY).toBe('isPublic');
    });
  });

  describe('@CurrentUser()', () => {
    // Helper to extract the factory function from a param decorator
    function getParamDecoratorFactory(decorator: (...args: any[]) => ParameterDecorator) {
      class TestClass {
        testMethod(@decorator() _value: any) {
          return;
        }
      }

      const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestClass, 'testMethod');
      return args[Object.keys(args)[0]].factory;
    }

    function getParamDecoratorFactoryWithData(
      decorator: (...args: any[]) => ParameterDecorator,
      data: string,
    ) {
      class TestClass {
        testMethod(@decorator(data) _value: any) {
          return;
        }
      }

      const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestClass, 'testMethod');
      return args[Object.keys(args)[0]].factory;
    }

    const createMockExecutionContext = (user: any): ExecutionContext =>
      ({
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({ user }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
        getType: jest.fn(),
        getArgs: jest.fn(),
        getArgByIndex: jest.fn(),
        switchToRpc: jest.fn(),
        switchToWs: jest.fn(),
      }) as unknown as ExecutionContext;

    it('should extract the entire user object when no data key is provided', () => {
      const factory = getParamDecoratorFactory(CurrentUser);
      const user = { userId: 'user-1', email: 'test@example.com' };
      const ctx = createMockExecutionContext(user);

      const result = factory(undefined, ctx);

      expect(result).toEqual(user);
    });

    it('should extract a specific field when data key is provided', () => {
      const factory = getParamDecoratorFactoryWithData(CurrentUser, 'userId');
      const user = { userId: 'user-1', email: 'test@example.com' };
      const ctx = createMockExecutionContext(user);

      const result = factory('userId', ctx);

      expect(result).toBe('user-1');
    });

    it('should extract email field when "email" is provided as data', () => {
      const factory = getParamDecoratorFactoryWithData(CurrentUser, 'email');
      const user = { userId: 'user-1', email: 'test@example.com' };
      const ctx = createMockExecutionContext(user);

      const result = factory('email', ctx);

      expect(result).toBe('test@example.com');
    });

    it('should return undefined when user is null and no data key provided', () => {
      const factory = getParamDecoratorFactory(CurrentUser);
      const ctx = createMockExecutionContext(null);

      const result = factory(undefined, ctx);

      expect(result).toBeNull();
    });

    it('should return undefined when user is null and data key is provided', () => {
      const factory = getParamDecoratorFactoryWithData(CurrentUser, 'userId');
      const ctx = createMockExecutionContext(null);

      const result = factory('userId', ctx);

      expect(result).toBeUndefined();
    });

    it('should return undefined for a non-existent property', () => {
      const factory = getParamDecoratorFactoryWithData(CurrentUser, 'nonExistent');
      const user = { userId: 'user-1', email: 'test@example.com' };
      const ctx = createMockExecutionContext(user);

      const result = factory('nonExistent', ctx);

      expect(result).toBeUndefined();
    });

    it('should return undefined when user is undefined and data key is provided', () => {
      const factory = getParamDecoratorFactoryWithData(CurrentUser, 'userId');
      const ctx = createMockExecutionContext(undefined);

      const result = factory('userId', ctx);

      expect(result).toBeUndefined();
    });
  });
});
