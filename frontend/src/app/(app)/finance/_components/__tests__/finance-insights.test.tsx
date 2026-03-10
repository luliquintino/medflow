import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
  unwrap: jest.fn(),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

import { FinanceInsights } from '../finance-insights';

const mockUseQuery = useQuery as jest.Mock;

describe('FinanceInsights', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when insights array is empty', () => {
    mockUseQuery.mockReturnValue({ data: [] });
    const { container } = render(<FinanceInsights />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the section title when insights exist', () => {
    mockUseQuery.mockReturnValue({
      data: [
        { type: 'positive', icon: '1', title: 'Bom ritmo', description: 'Mantenha assim', priority: 1 },
      ],
    });
    render(<FinanceInsights />);
    expect(screen.getByText('Assistente Financeiro')).toBeInTheDocument();
  });

  it('renders insight cards with title and description', () => {
    mockUseQuery.mockReturnValue({
      data: [
        { type: 'positive', icon: '1', title: 'Meta atingida', description: 'Parabens!', priority: 1 },
        { type: 'warning', icon: '2', title: 'Atenção', description: 'Cuidado com a carga', priority: 2 },
      ],
    });
    render(<FinanceInsights />);
    expect(screen.getByText('Meta atingida')).toBeInTheDocument();
    expect(screen.getByText('Parabens!')).toBeInTheDocument();
    expect(screen.getByText('Atenção')).toBeInTheDocument();
    expect(screen.getByText('Cuidado com a carga')).toBeInTheDocument();
  });

  it('renders multiple insight types correctly', () => {
    mockUseQuery.mockReturnValue({
      data: [
        { type: 'info', icon: 'i', title: 'Dica', description: 'Informacao util', priority: 1 },
        { type: 'action', icon: 'a', title: 'Acao necessaria', description: 'Tome acao', priority: 2 },
      ],
    });
    render(<FinanceInsights />);
    expect(screen.getByText('Dica')).toBeInTheDocument();
    expect(screen.getByText('Acao necessaria')).toBeInTheDocument();
  });

  it('renders nothing when data is undefined (defaults to empty array)', () => {
    mockUseQuery.mockReturnValue({ data: undefined });
    const { container } = render(<FinanceInsights />);
    expect(container.firstChild).toBeNull();
  });

  it('renders insight icon text', () => {
    mockUseQuery.mockReturnValue({
      data: [
        { type: 'positive', icon: 'checkmark', title: 'Titulo', description: 'Desc', priority: 1 },
      ],
    });
    render(<FinanceInsights />);
    expect(screen.getByText('checkmark')).toBeInTheDocument();
  });
});
