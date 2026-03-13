import { AxiosError, AxiosHeaders } from 'axios';
import { getErrorMessage, unwrap } from '../api';

describe('getErrorMessage', () => {
  function makeAxiosError(responseData?: any, hasResponse = true): AxiosError {
    const headers = new AxiosHeaders();
    const config = { headers } as any;

    if (!hasResponse) {
      const err = new AxiosError('Network Error', 'ERR_NETWORK', config, null, undefined);
      return err;
    }

    const response = {
      data: responseData,
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config,
    };
    return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, response);
  }

  it('returns first element when AxiosError has array message', () => {
    const err = makeAxiosError({ message: ['Campo obrigatório', 'Formato inválido'] });
    expect(getErrorMessage(err)).toBe('Campo obrigatório');
  });

  it('returns network error message when AxiosError has no response', () => {
    const err = makeAxiosError(undefined, false);
    expect(getErrorMessage(err)).toBe(
      'Sem conexão com o servidor. Verifique sua internet ou tente novamente.'
    );
  });

  it('returns generic message for non-AxiosError', () => {
    const err = new Error('Some random error');
    expect(getErrorMessage(err)).toBe('Algo deu errado. Tente novamente.');
  });

  it('returns generic message for non-Error values', () => {
    expect(getErrorMessage('string error')).toBe('Algo deu errado. Tente novamente.');
    expect(getErrorMessage(null)).toBe('Algo deu errado. Tente novamente.');
    expect(getErrorMessage(undefined)).toBe('Algo deu errado. Tente novamente.');
    expect(getErrorMessage(42)).toBe('Algo deu errado. Tente novamente.');
  });

  it('returns string message from AxiosError response data', () => {
    const err = makeAxiosError({ message: 'E-mail ou senha incorretos.' });
    expect(getErrorMessage(err)).toBe('E-mail ou senha incorretos.');
  });

  it('returns generic message when AxiosError response has no message field', () => {
    const err = makeAxiosError({ error: 'Bad Request' });
    expect(getErrorMessage(err)).toBe('Algo deu errado. Tente novamente.');
  });
});

describe('unwrap', () => {
  it('extracts nested data correctly', () => {
    const response = {
      data: {
        data: { id: '1', name: 'Test User' },
      },
    };
    expect(unwrap(response)).toEqual({ id: '1', name: 'Test User' });
  });

  it('extracts array data correctly', () => {
    const response = {
      data: {
        data: [{ id: '1' }, { id: '2' }],
      },
    };
    expect(unwrap(response)).toEqual([{ id: '1' }, { id: '2' }]);
  });

  it('returns null when nested data is null', () => {
    const response = { data: { data: null } };
    expect(unwrap(response)).toBeNull();
  });
});
