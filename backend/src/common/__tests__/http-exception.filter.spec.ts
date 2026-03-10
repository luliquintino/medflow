import {
  HttpException,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { AllExceptionsFilter } from '../filters/http-exception.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: any;

  beforeEach(() => {
    filter = new AllExceptionsFilter();

    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockResponse = { status: mockStatus };
    mockRequest = { url: '/test/path' };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    };
  });

  describe('HttpException handling', () => {
    it('should handle HttpException with string message', () => {
      const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          path: '/test/path',
          message: 'Not Found',
        }),
      );
    });

    it('should handle NotFoundException', () => {
      const exception = new NotFoundException('Resource not found');

      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Resource not found',
        }),
      );
    });

    it('should handle ForbiddenException', () => {
      const exception = new ForbiddenException();

      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.FORBIDDEN,
        }),
      );
    });

    it('should handle UnauthorizedException', () => {
      const exception = new UnauthorizedException('Invalid credentials');

      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.UNAUTHORIZED,
          message: 'Invalid credentials',
        }),
      );
    });

    it('should handle BadRequestException with validation errors', () => {
      const exception = new BadRequestException({
        message: ['email must be an email', 'name should not be empty'],
        error: 'Bad Request',
        statusCode: 400,
      });

      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: ['email must be an email', 'name should not be empty'],
        }),
      );
    });

    it('should handle HttpException with object response containing message', () => {
      const exception = new HttpException(
        { message: 'Custom error message', statusCode: 422 },
        422,
      );

      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(422);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 422,
          message: 'Custom error message',
        }),
      );
    });

    it('should handle HttpException with object response without message field', () => {
      const exception = new HttpException(
        { error: 'Some error details', code: 'ERR_001' },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: expect.objectContaining({
            error: 'Some error details',
            code: 'ERR_001',
          }),
        }),
      );
    });
  });

  describe('generic Error handling', () => {
    it('should return 500 for generic Error', () => {
      const exception = new Error('Something went wrong');

      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ocorreu um erro inesperado.',
        }),
      );
    });

    it('should return 500 for unknown exception types', () => {
      const exception = { custom: 'error object' };

      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ocorreu um erro inesperado.',
        }),
      );
    });

    it('should return 500 for null exception', () => {
      filter.catch(null, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ocorreu um erro inesperado.',
        }),
      );
    });

    it('should return 500 for undefined exception', () => {
      filter.catch(undefined, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('response structure', () => {
    it('should include statusCode in response', () => {
      const exception = new NotFoundException();

      filter.catch(exception, mockHost);

      const response = mockJson.mock.calls[0][0];
      expect(response).toHaveProperty('statusCode');
    });

    it('should include ISO timestamp in response', () => {
      const exception = new NotFoundException();

      filter.catch(exception, mockHost);

      const response = mockJson.mock.calls[0][0];
      expect(response).toHaveProperty('timestamp');
      expect(new Date(response.timestamp).toISOString()).toBe(response.timestamp);
    });

    it('should include request path in response', () => {
      const exception = new NotFoundException();

      filter.catch(exception, mockHost);

      const response = mockJson.mock.calls[0][0];
      expect(response).toHaveProperty('path', '/test/path');
    });

    it('should include message in response', () => {
      const exception = new NotFoundException();

      filter.catch(exception, mockHost);

      const response = mockJson.mock.calls[0][0];
      expect(response).toHaveProperty('message');
    });

    it('should use correct path from request URL', () => {
      mockRequest.url = '/api/v1/users/123';

      const exception = new NotFoundException();

      filter.catch(exception, mockHost);

      const response = mockJson.mock.calls[0][0];
      expect(response.path).toBe('/api/v1/users/123');
    });
  });
});
