import { unwrap, getErrorMessage } from '../api';
import { AxiosError } from 'axios';

describe('unwrap', () => {
  it('should extract nested data', () => {
    const response = { data: { data: { id: '1', name: 'test' } } };
    expect(unwrap(response)).toEqual({ id: '1', name: 'test' });
  });
});

describe('getErrorMessage', () => {
  it('should extract string message from AxiosError', () => {
    const error = new AxiosError('fail');
    error.response = {
      data: { message: 'E-mail já cadastrado' },
      status: 409,
      statusText: 'Conflict',
      headers: {},
      config: {} as any,
    };
    expect(getErrorMessage(error)).toBe('E-mail já cadastrado');
  });

  it('should extract first message from array', () => {
    const error = new AxiosError('fail');
    error.response = {
      data: { message: ['Campo obrigatório', 'E-mail inválido'] },
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: {} as any,
    };
    expect(getErrorMessage(error)).toBe('Campo obrigatório');
  });

  it('should return default message for non-Axios errors', () => {
    expect(getErrorMessage(new Error('random'))).toBe(
      'Algo deu errado. Tente novamente.'
    );
  });

  it('should return default message when no response message', () => {
    const error = new AxiosError('fail');
    error.response = {
      data: {},
      status: 500,
      statusText: 'Server Error',
      headers: {},
      config: {} as any,
    };
    expect(getErrorMessage(error)).toBe('Algo deu errado. Tente novamente.');
  });
});
