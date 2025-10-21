import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AIShiftTextModal from '@/components/calendar/AIShiftTextModal';
import { trpc } from '@/lib/trpc/client';

// Mock the trpc client
jest.mock('@/lib/trpc/client', () => ({
    trpc: {
        ai: {
            parseShiftText: {
                useMutation: jest.fn().mockReturnValue({
                    mutate: jest.fn(),
                    isLoading: false,
                    error: null,
                    reset: jest.fn(),
                }),
            },
        },
    },
}));

describe('AIShiftTextModal', () => {
    const mockDate = new Date('2023-01-01T12:00:00Z');
    const mockOnClose = jest.fn();
    const mockOnSubmit = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly when open', () => {
        render(
            <AIShiftTextModal
                open={true}
                onClose={mockOnClose}
                onSubmit={mockOnSubmit}
                date={mockDate}
            />
        );

        // Check that the modal title is rendered
        expect(screen.getByText('Enter Shift Details')).toBeInTheDocument();

        // Check that the text field is rendered
        expect(
            screen.getByPlaceholderText(/Enter shift details in plain text/i)
        ).toBeInTheDocument();

        // Check that the buttons are rendered
        expect(screen.getByText('Cancel')).toBeInTheDocument();
        expect(screen.getByText('Submit')).toBeInTheDocument();

        // Submit button should be disabled initially (empty text)
        expect(screen.getByText('Submit')).toBeDisabled();
    });

    it('does not render when closed', () => {
        render(
            <AIShiftTextModal
                open={false}
                onClose={mockOnClose}
                onSubmit={mockOnSubmit}
                date={mockDate}
            />
        );

        // Modal should not be in the document
        expect(
            screen.queryByText('Enter Shift Details')
        ).not.toBeInTheDocument();
    });

    it('enables submit button when text is entered', () => {
        render(
            <AIShiftTextModal
                open={true}
                onClose={mockOnClose}
                onSubmit={mockOnSubmit}
                date={mockDate}
            />
        );

        // Submit button should be disabled initially
        expect(screen.getByText('Submit')).toBeDisabled();

        // Enter text in the text field
        fireEvent.change(
            screen.getByPlaceholderText(/Enter shift details in plain text/i),
            {
                target: {
                    value: 'John works at Downtown Store from 9am to 5pm',
                },
            }
        );

        // Submit button should be enabled now
        expect(screen.getByText('Submit')).not.toBeDisabled();
    });

    it('calls onClose when Cancel button is clicked', () => {
        render(
            <AIShiftTextModal
                open={true}
                onClose={mockOnClose}
                onSubmit={mockOnSubmit}
                date={mockDate}
            />
        );

        // Click the Cancel button
        fireEvent.click(screen.getByText('Cancel'));

        // onClose should be called
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls mutation when Submit button is clicked', () => {
        // Mock the mutation function
        const mockMutate = jest.fn();
        (trpc.ai.parseShiftText.useMutation as jest.Mock).mockReturnValue({
            mutate: mockMutate,
            isLoading: false,
            error: null,
            reset: jest.fn(),
        });

        render(
            <AIShiftTextModal
                open={true}
                onClose={mockOnClose}
                onSubmit={mockOnSubmit}
                date={mockDate}
            />
        );

        // Enter text in the text field
        const testText = 'John works at Downtown Store from 9am to 5pm';
        fireEvent.change(
            screen.getByPlaceholderText(/Enter shift details in plain text/i),
            {
                target: { value: testText },
            }
        );

        // Click the Submit button
        fireEvent.click(screen.getByText('Submit'));

        // Mutation should be called with the text and date
        expect(mockMutate).toHaveBeenCalledWith({
            text: testText,
            date: mockDate.toISOString(),
        });
    });

    it.skip('shows loading indicator when processing', () => {
        // Mock the mutation function with isLoading=true
        (trpc.ai.parseShiftText.useMutation as jest.Mock).mockReturnValue({
            mutate: jest.fn(),
            isLoading: true,
            error: null,
            reset: jest.fn(),
        });

        render(
            <AIShiftTextModal
                open={true}
                onClose={mockOnClose}
                onSubmit={mockOnSubmit}
                date={mockDate}
            />
        );

        // Loading indicator should be visible
        //expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();

        // Buttons should be disabled
        expect(screen.getByText('Cancel')).toBeDisabled();
        expect(screen.getByText('Submit')).toBeDisabled();
    });

    it('shows error message when there is an error', () => {
        // Mock the mutation function with an error callback
        const errorMessage = 'Failed to parse shift text';
        let errorCallback: (err: { message: string }) => void;

        (trpc.ai.parseShiftText.useMutation as jest.Mock).mockImplementation(
            ({ onError }) => {
                errorCallback = onError;
                return {
                    mutate: () => {
                        // Simulate error
                        errorCallback({ message: errorMessage });
                    },
                    isLoading: false,
                    error: null,
                    reset: jest.fn(),
                };
            }
        );

        render(
            <AIShiftTextModal
                open={true}
                onClose={mockOnClose}
                onSubmit={mockOnSubmit}
                date={mockDate}
            />
        );

        // Enter text in the text field
        fireEvent.change(
            screen.getByPlaceholderText(/Enter shift details in plain text/i),
            {
                target: {
                    value: 'John works at Downtown Store from 9am to 5pm',
                },
            }
        );

        // Click the Submit button to trigger the error
        fireEvent.click(screen.getByText('Submit'));

        // Error message should be visible
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('calls onSubmit with parsed data on successful mutation', async () => {
        // Mock the parsed shift data
        const parsedShift = {
            title: 'Shift at Downtown Store (9am-5pm)',
            startTime: '2023-01-01T09:00:00Z',
            endTime: '2023-01-01T17:00:00Z',
            date: '2023-01-01T12:00:00Z',
        };

        // Mock the mutation function with success callback
        let successCallback: (data: any) => void;
        (trpc.ai.parseShiftText.useMutation as jest.Mock).mockImplementation(
            ({ onSuccess }) => {
                successCallback = onSuccess;
                return {
                    mutate: () => {
                        // Simulate successful mutation
                        successCallback(parsedShift);
                    },
                    isLoading: false,
                    error: null,
                    reset: jest.fn(),
                };
            }
        );

        render(
            <AIShiftTextModal
                open={true}
                onClose={mockOnClose}
                onSubmit={mockOnSubmit}
                date={mockDate}
            />
        );

        // Enter text in the text field
        fireEvent.change(
            screen.getByPlaceholderText(/Enter shift details in plain text/i),
            {
                target: {
                    value: 'John works at Downtown Store from 9am to 5pm',
                },
            }
        );

        // Click the Submit button
        fireEvent.click(screen.getByText('Submit'));

        // onSubmit should be called with the parsed shift data
        expect(mockOnSubmit).toHaveBeenCalledWith(parsedShift);
    });
});
