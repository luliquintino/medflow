import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { Spinner, PageSpinner } from '../spinner';

// Mock lucide-react
jest.mock('lucide-react', () => ({
  Loader2: (props: any) => <svg data-testid="loader-icon" {...props} />,
}));

describe('Spinner', () => {
  it('should render the loader icon', () => {
    const { getByTestId } = render(<Spinner />);
    expect(getByTestId('loader-icon')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { getByTestId } = render(<Spinner className="w-12 h-12" />);
    expect(getByTestId('loader-icon')).toHaveClass('w-12');
  });
});

describe('PageSpinner', () => {
  it('should render with centering container', () => {
    const { container } = render(<PageSpinner />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('flex', 'items-center', 'justify-center');
  });
});
