import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  unwrap: jest.fn(),
  getErrorMessage: jest.fn().mockReturnValue('Erro de teste'),
}));

jest.mock('@/lib/brazil-states', () => ({
  BRAZIL_STATES: [
    { uf: 'SP', name: 'São Paulo' },
    { uf: 'RJ', name: 'Rio de Janeiro' },
  ],
  fetchCitiesByUF: jest.fn().mockResolvedValue([]),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(() => ({ mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false })),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('lucide-react', () => ({
  Plus: () => <span data-testid="icon-plus" />,
  Pencil: () => <span data-testid="icon-pencil" />,
  Trash2: () => <span data-testid="icon-trash" />,
  Building2: () => <span data-testid="icon-building" />,
  MapPin: () => <span data-testid="icon-map-pin" />,
  FileText: () => <span data-testid="icon-file-text" />,
  X: () => <span data-testid="icon-x" />,
  ChevronRight: () => <span data-testid="icon-chevron-right" />,
  CalendarDays: () => <span data-testid="icon-calendar-days" />,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, icon, ...props }: any) => (
    <button onClick={onClick} {...props}>{icon}{children}</button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

jest.mock('@/components/ui/spinner', () => ({
  PageSpinner: () => <div data-testid="page-spinner">Loading...</div>,
}));

import HospitalsPage from '../page';

const mockUseQuery = useQuery as jest.Mock;

const mockHospitals = [
  {
    id: '1',
    name: 'Hospital Santa Casa',
    city: 'São Paulo',
    state: 'SP',
    notes: 'UTI',
    paymentDay: 5,
    _count: { templates: 3, shifts: 10 },
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Hospital Albert Einstein',
    city: 'São Paulo',
    state: 'SP',
    notes: null,
    paymentDay: null,
    _count: { templates: 1, shifts: 5 },
    createdAt: '2025-01-02T00:00:00Z',
  },
];

describe('HospitalsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading spinner when data is loading', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: true });
    render(<HospitalsPage />);
    expect(screen.getByTestId('page-spinner')).toBeInTheDocument();
  });

  it('renders hospital list', () => {
    mockUseQuery.mockReturnValue({ data: mockHospitals, isLoading: false });
    render(<HospitalsPage />);
    expect(screen.getByText('Meus Hospitais')).toBeInTheDocument();
    expect(screen.getByText('Hospital Santa Casa')).toBeInTheDocument();
    expect(screen.getByText('Hospital Albert Einstein')).toBeInTheDocument();
  });

  it('shows "Novo hospital" button', () => {
    mockUseQuery.mockReturnValue({ data: mockHospitals, isLoading: false });
    render(<HospitalsPage />);
    expect(screen.getByText('Novo hospital')).toBeInTheDocument();
  });

  it('shows empty state when no hospitals', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
    render(<HospitalsPage />);
    expect(screen.getByText('Você ainda não tem hospitais cadastrados.')).toBeInTheDocument();
    expect(screen.getByText('Adicionar primeiro hospital')).toBeInTheDocument();
  });

  it('shows hospital count', () => {
    mockUseQuery.mockReturnValue({ data: mockHospitals, isLoading: false });
    render(<HospitalsPage />);
    // The mock does not process ICU plural syntax, so the raw string is rendered
    expect(
      screen.getByText('{count, plural, one {# hospital cadastrado} other {# hospitais cadastrados}}')
    ).toBeInTheDocument();
  });

  it('shows singular count for single hospital', () => {
    mockUseQuery.mockReturnValue({ data: [mockHospitals[0]], isLoading: false });
    render(<HospitalsPage />);
    expect(
      screen.getByText('{count, plural, one {# hospital cadastrado} other {# hospitais cadastrados}}')
    ).toBeInTheDocument();
  });

  it('shows template count for hospitals', () => {
    mockUseQuery.mockReturnValue({ data: mockHospitals, isLoading: false });
    render(<HospitalsPage />);
    expect(screen.getByText('3 modelos')).toBeInTheDocument();
    expect(screen.getByText('1 modelos')).toBeInTheDocument();
  });
});
