import '@testing-library/jest-dom';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useState } from 'react';

jest.mock('@/components/ui/confirm-dialog', () => ({
  ConfirmDialog: ({ isOpen, onConfirm, onCancel, title, message, confirmLabel, cancelLabel }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="confirm-dialog">
        <p>{title}</p>
        <p>{message}</p>
        <button onClick={onCancel}>{cancelLabel || 'Cancelar'}</button>
        <button onClick={onConfirm}>{confirmLabel || 'Confirmar'}</button>
      </div>
    );
  },
}));

import { useConfirm } from '../use-confirm';

function TestComponent() {
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const [result, setResult] = useState<string>('idle');

  async function handleConfirm() {
    const ok = await confirm({
      title: 'Remover item',
      message: 'Tem certeza?',
      confirmLabel: 'Sim',
      cancelLabel: 'Não',
    });
    setResult(ok ? 'confirmed' : 'cancelled');
  }

  return (
    <div>
      <button onClick={handleConfirm}>Open</button>
      <span data-testid="result">{result}</span>
      {ConfirmDialogComponent}
    </div>
  );
}

describe('useConfirm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('confirm() returns a Promise', async () => {
    let confirmFn: any;
    function Wrapper() {
      const { confirm, ConfirmDialogComponent } = useConfirm();
      confirmFn = confirm;
      return <div>{ConfirmDialogComponent}</div>;
    }
    render(<Wrapper />);
    let result: any;
    await act(async () => {
      result = confirmFn({ title: 'Test', message: 'Test msg' });
    });
    expect(result).toBeInstanceOf(Promise);
  });

  it('ConfirmDialogComponent renders when confirm called', async () => {
    render(<TestComponent />);
    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByText('Open'));
    });
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    expect(screen.getByText('Remover item')).toBeInTheDocument();
    expect(screen.getByText('Tem certeza?')).toBeInTheDocument();
  });

  it('Promise resolves true when confirmed', async () => {
    render(<TestComponent />);
    await act(async () => {
      fireEvent.click(screen.getByText('Open'));
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Sim'));
    });
    expect(screen.getByTestId('result').textContent).toBe('confirmed');
  });

  it('Promise resolves false when cancelled', async () => {
    render(<TestComponent />);
    await act(async () => {
      fireEvent.click(screen.getByText('Open'));
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Não'));
    });
    expect(screen.getByTestId('result').textContent).toBe('cancelled');
  });
});
