import { ResponseInterceptor } from '../interceptors/response.interceptor';
import { of } from 'rxjs';
import { ExecutionContext, CallHandler } from '@nestjs/common';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<any>;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
  });

  it('should wrap response in standard format', (done) => {
    const mockContext = {} as ExecutionContext;
    const mockHandler: CallHandler = {
      handle: () => of({ id: '1', name: 'test' }),
    };

    interceptor.intercept(mockContext, mockHandler).subscribe((result) => {
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: '1', name: 'test' });
      expect(result.timestamp).toBeDefined();
      done();
    });
  });

  it('should include ISO timestamp', (done) => {
    const mockContext = {} as ExecutionContext;
    const mockHandler: CallHandler = { handle: () => of('data') };

    interceptor.intercept(mockContext, mockHandler).subscribe((result) => {
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
      done();
    });
  });
});
