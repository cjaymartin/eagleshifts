import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AIToggle from '@/components/calendar/AIToggle';
import { trpc } from '@/lib/trpc/client';

// Mock the trpc client
jest.mock('@/lib/trpc/client', () => ({
  trpc: {
    ai: {
      isAvailable: {
        useQuery: jest.fn(),
      },
    },
  },
}));

describe('AIToggle Component', () => {
  const mockOnChange = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should show loading state while checking AI availability', () => {
    // Mock the isAvailable query to return loading state
    (trpc.ai.isAvailable.useQuery as jest.Mock).mockReturnValue({
      isLoading: true,
      data: undefined,
    });
    
    render(<AIToggle enabled={false} onChange={mockOnChange} />);
    
    // Check that loading indicator is shown
    expect(screen.getByText('Checking AI availability...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
  
  it('should not render when AI is not available', () => {
    // Mock the isAvailable query to return not available
    (trpc.ai.isAvailable.useQuery as jest.Mock).mockReturnValue({
      isLoading: false,
      data: { available: false, reason: 'OpenAI API key not configured' },
    });
    
    const { container } = render(<AIToggle enabled={false} onChange={mockOnChange} />);
    
    // Check that the component doesn't render anything
    expect(container).toBeEmptyDOMElement();
  });
  
  it('should render toggle when AI is available', () => {
    // Mock the isAvailable query to return available
    (trpc.ai.isAvailable.useQuery as jest.Mock).mockReturnValue({
      isLoading: false,
      data: { available: true },
    });
    
    render(<AIToggle enabled={false} onChange={mockOnChange} />);
    
    // Check that the toggle is rendered
    expect(screen.getByText('AI Shift Entry')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
  
  it('should call onChange when toggle is clicked', () => {
    // Mock the isAvailable query to return available
    (trpc.ai.isAvailable.useQuery as jest.Mock).mockReturnValue({
      isLoading: false,
      data: { available: true },
    });
    
    render(<AIToggle enabled={false} onChange={mockOnChange} />);
    
    // Click the toggle
    fireEvent.click(screen.getByRole('checkbox'));
    
    // Check that onChange was called with true
    expect(mockOnChange).toHaveBeenCalledWith(true);
  });
  
  it('should render toggle in enabled state when enabled prop is true', () => {
    // Mock the isAvailable query to return available
    (trpc.ai.isAvailable.useQuery as jest.Mock).mockReturnValue({
      isLoading: false,
      data: { available: true },
    });
    
    render(<AIToggle enabled={true} onChange={mockOnChange} />);
    
    // Check that the toggle is checked
    expect(screen.getByRole('checkbox')).toBeChecked();
  });
});