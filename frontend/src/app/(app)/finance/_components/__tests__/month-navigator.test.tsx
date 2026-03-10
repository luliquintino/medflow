import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('lucide-react', () => ({
  ChevronLeft: () => <span data-testid="icon-chevron-left" />,
  ChevronRight: () => <span data-testid="icon-chevron-right" />,
  Calendar: () => <span data-testid="icon-calendar" />,
}));

import { MonthNavigator } from '../month-navigator';

describe('MonthNavigator', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the current month name and year', () => {
    render(<MonthNavigator month={3} year={2026} onChange={mockOnChange} />);
    expect(screen.getByText('março de 2026')).toBeInTheDocument();
  });

  it('renders back and forward navigation buttons', () => {
    render(<MonthNavigator month={6} year={2026} onChange={mockOnChange} />);
    expect(screen.getByTestId('icon-chevron-left')).toBeInTheDocument();
    expect(screen.getByTestId('icon-chevron-right')).toBeInTheDocument();
  });

  it('calls onChange with previous month when back button is clicked', () => {
    render(<MonthNavigator month={6} year={2026} onChange={mockOnChange} />);
    const buttons = screen.getAllByRole('button');
    // First button is the back button
    fireEvent.click(buttons[0]);
    expect(mockOnChange).toHaveBeenCalledWith(5, 2026);
  });

  it('calls onChange with next month when forward button is clicked', () => {
    render(<MonthNavigator month={6} year={2026} onChange={mockOnChange} />);
    const buttons = screen.getAllByRole('button');
    // Third button is the forward button (back, month label, forward)
    fireEvent.click(buttons[2]);
    expect(mockOnChange).toHaveBeenCalledWith(7, 2026);
  });

  it('wraps year backward when going back from January', () => {
    render(<MonthNavigator month={1} year={2026} onChange={mockOnChange} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(mockOnChange).toHaveBeenCalledWith(12, 2025);
  });

  it('shows Hoje button when not on current month', () => {
    render(<MonthNavigator month={1} year={2026} onChange={mockOnChange} />);
    expect(screen.getByText('Hoje')).toBeInTheDocument();
  });

  it('does not show Hoje button when on current month', () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    render(<MonthNavigator month={currentMonth} year={currentYear} onChange={mockOnChange} />);
    expect(screen.queryByText('Hoje')).not.toBeInTheDocument();
  });

  it('calls onChange with current month/year when Hoje is clicked', () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    render(<MonthNavigator month={1} year={2026} onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('Hoje'));
    expect(mockOnChange).toHaveBeenCalledWith(currentMonth, currentYear);
  });

  it('renders calendar icon', () => {
    render(<MonthNavigator month={3} year={2026} onChange={mockOnChange} />);
    expect(screen.getByTestId('icon-calendar')).toBeInTheDocument();
  });
});
