import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AIShiftConfirmationDialog from '@/components/calendar/AIShiftConfirmationDialog';
import { trpc } from '@/lib/trpc/client';
import { useRouter } from 'next/navigation';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

// Mock the next/navigation router
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

// Custom render function that wraps components with LocalizationProvider
const customRender = (ui: any, options = {}) => {
    return render(
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            {ui}
        </LocalizationProvider>,
        options
    );
};

// Mock the trpc client
jest.mock('@/lib/trpc/client', () => ({
    trpc: {
        shifts: {
            create: {
                useMutation: jest.fn().mockReturnValue({
                    mutate: jest.fn(),
                    isPending: false,
                    error: null,
                    reset: jest.fn(),
                }),
            },
        },
        locations: {
            createLocation: {
                useMutation: jest.fn().mockReturnValue({
                    mutate: jest.fn(),
                    isPending: false,
                    error: null,
                    reset: jest.fn(),
                }),
            },
        },
        departments: {
            createDepartment: {
                useMutation: jest.fn().mockReturnValue({
                    mutate: jest.fn(),
                    isPending: false,
                    error: null,
                    reset: jest.fn(),
                }),
            },
        },
    },
}));

describe('AIShiftConfirmationDialog', () => {
    const mockOnClose = jest.fn();
    const mockPush = jest.fn();

    // Sample parsed shift data
    const mockParsedShift = {
        title: 'Shift at Downtown Store',
        startTime: '2023-01-01T09:00:00Z',
        endTime: '2023-01-01T17:00:00Z',
        date: '2023-01-01T12:00:00Z',
        locationId: 'loc1',
        departmentId: 'dept1',
        notes: 'Test notes',
        slots: 3,
    };

    // Sample entity matches
    const mockEntityMatches = {
        location: {
            bestMatch: {
                entity: { id: 'loc1', name: 'Downtown Store' },
                confidence: 0.9,
                isExactMatch: true,
            },
            potentialMatches: [
                {
                    entity: { id: 'loc1', name: 'Downtown Store' },
                    confidence: 0.9,
                    isExactMatch: true,
                },
                {
                    entity: { id: 'loc2', name: 'Main Office' },
                    confidence: 0.6,
                    isExactMatch: false,
                },
            ],
            needsCreation: false,
        },
        department: {
            bestMatch: {
                entity: { id: 'dept1', name: 'Sales' },
                confidence: 0.9,
                isExactMatch: true,
            },
            potentialMatches: [
                {
                    entity: { id: 'dept1', name: 'Sales' },
                    confidence: 0.9,
                    isExactMatch: true,
                },
                {
                    entity: { id: 'dept2', name: 'Marketing' },
                    confidence: 0.6,
                    isExactMatch: false,
                },
            ],
            needsCreation: false,
        },
        members: [],
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue({
            push: mockPush,
        });
    });

    it('renders correctly when open', () => {
        customRender(
            <AIShiftConfirmationDialog
                open={true}
                onClose={mockOnClose}
                parsedShift={mockParsedShift}
                entityMatches={mockEntityMatches}
            />
        );

        // Check that the dialog title is rendered
        expect(screen.getByText('Confirm Shift Details')).toBeInTheDocument();

        // Check that form fields are rendered with correct values
        expect(screen.getByTestId('shift-title-input')).toHaveValue(
            'Shift at Downtown Store'
        );
        expect(screen.getByTestId('slots-input')).toHaveValue(3);
        expect(screen.getByTestId('notes-input')).toHaveValue('Test notes');

        // Check that buttons are rendered
        expect(screen.getByText('Cancel')).toBeInTheDocument();
        expect(screen.getByText('Create Shift')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
        customRender(
            <AIShiftConfirmationDialog
                open={false}
                onClose={mockOnClose}
                parsedShift={mockParsedShift}
                entityMatches={mockEntityMatches}
            />
        );

        // Dialog should not be in the document
        expect(
            screen.queryByText('Confirm Shift Details')
        ).not.toBeInTheDocument();
    });

    it('calls onClose when Cancel button is clicked', () => {
        customRender(
            <AIShiftConfirmationDialog
                open={true}
                onClose={mockOnClose}
                parsedShift={mockParsedShift}
                entityMatches={mockEntityMatches}
            />
        );

        // Click the Cancel button
        fireEvent.click(screen.getByText('Cancel'));

        // onClose should be called
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('validates form fields before submission', () => {
        customRender(
            <AIShiftConfirmationDialog
                open={true}
                onClose={mockOnClose}
                parsedShift={mockParsedShift}
                entityMatches={mockEntityMatches}
            />
        );

        // Clear the title field
        fireEvent.change(screen.getByTestId('shift-title-input'), {
            target: { value: '' },
        });

        // Click the Create Shift button
        fireEvent.click(screen.getByText('Create Shift'));

        // Mutation should not be called
        expect(trpc.shifts.create.useMutation().mutate).not.toHaveBeenCalled();

        // Error message should be visible
        expect(screen.getByText('Title is required')).toBeInTheDocument();
    });

    it('calls shifts.create mutation when form is valid', () => {
        // Mock the mutation function
        const mockMutate = jest.fn();
        (trpc.shifts.create.useMutation as jest.Mock).mockReturnValue({
            mutate: mockMutate,
            isPending: false,
            error: null,
            reset: jest.fn(),
        });

        customRender(
            <AIShiftConfirmationDialog
                open={true}
                onClose={mockOnClose}
                parsedShift={mockParsedShift}
                entityMatches={mockEntityMatches}
            />
        );

        // Click the Create Shift button
        fireEvent.click(screen.getByText('Create Shift'));

        // Mutation should be called with the correct data
        expect(mockMutate).toHaveBeenCalledWith({
            title: 'Shift at Downtown Store',
            startTime: expect.any(String),
            endTime: expect.any(String),
            slots: 3,
            notes: 'Test notes',
            locationId: 'loc1',
            departmentId: 'dept1',
        });
    });

    it('shows loading indicator when processing', () => {
        // Mock the mutation function with isPending=true
        (trpc.shifts.create.useMutation as jest.Mock).mockReturnValue({
            mutate: jest.fn(),
            isPending: true,
            error: null,
            reset: jest.fn(),
        });

        customRender(
            <AIShiftConfirmationDialog
                open={true}
                onClose={mockOnClose}
                parsedShift={mockParsedShift}
                entityMatches={mockEntityMatches}
            />
        );

        // Loading indicator should be visible
        expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();

        // Buttons should be disabled
        expect(screen.getByText('Cancel')).toBeDisabled();
        expect(screen.getByText('Create Shift')).toBeDisabled();
    });

    it('shows error message when there is an error', () => {
        // Mock the mutation function with an error callback
        const errorMessage = 'Failed to create shift';
        let errorCallback: (err: { message: string }) => void;

        (trpc.shifts.create.useMutation as jest.Mock).mockImplementation(
            ({ onError }) => {
                errorCallback = onError;
                return {
                    mutate: () => {
                        // Simulate error
                        errorCallback({ message: errorMessage });
                    },
                    isPending: false,
                    error: null,
                    reset: jest.fn(),
                };
            }
        );

        customRender(
            <AIShiftConfirmationDialog
                open={true}
                onClose={mockOnClose}
                parsedShift={mockParsedShift}
                entityMatches={mockEntityMatches}
            />
        );

        // Click the Create Shift button to trigger the error
        fireEvent.click(screen.getByText('Create Shift'));

        // Error message should be visible
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('redirects to shift edit page on successful creation', () => {
        // Mock the mutation function with success callback
        const createdShift = { id: 'shift123', ...mockParsedShift };
        let successCallback: (data: any) => void;

        (trpc.shifts.create.useMutation as jest.Mock).mockImplementation(
            ({ onSuccess }) => {
                successCallback = onSuccess;
                return {
                    mutate: () => {
                        // Simulate successful mutation
                        successCallback(createdShift);
                    },
                    isPending: false,
                    error: null,
                    reset: jest.fn(),
                };
            }
        );

        customRender(
            <AIShiftConfirmationDialog
                open={true}
                onClose={mockOnClose}
                parsedShift={mockParsedShift}
                entityMatches={mockEntityMatches}
            />
        );

        // Click the Create Shift button
        fireEvent.click(screen.getByText('Create Shift'));

        // Router.push should be called with the shift edit page URL
        expect(mockPush).toHaveBeenCalledWith(`/shifts/${createdShift.id}`);

        // onClose should be called
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('shows UI for creating a new location', () => {
        customRender(
            <AIShiftConfirmationDialog
                open={true}
                onClose={mockOnClose}
                parsedShift={mockParsedShift}
                entityMatches={mockEntityMatches}
            />
        );

        // Click the "Create New Location" button
        fireEvent.click(screen.getByText('Create New Location'));

        // New location name field should be visible
        expect(
            screen.getByTestId('new-location-name-input')
        ).toBeInTheDocument();

        // Enter a new location name
        fireEvent.change(screen.getByTestId('new-location-name-input'), {
            target: { value: 'New Test Location' },
        });

        // Mock the location creation mutation before rendering the component
        const mockLocationMutate = jest.fn();
        (
            trpc.locations.createLocation.useMutation as jest.Mock
        ).mockReturnValue({
            mutate: mockLocationMutate,
            isPending: false,
            error: null,
            reset: jest.fn(),
        });

        // Re-render the component to use the new mock
        customRender(
            <AIShiftConfirmationDialog
                open={true}
                onClose={mockOnClose}
                parsedShift={mockParsedShift}
                entityMatches={mockEntityMatches}
            />
        );

        // Click the "Create New Location" button again
        fireEvent.click(screen.getByText('Create New Location'));

        // Enter a new location name again
        const newLocationInputs = screen.getAllByTestId(
            'new-location-name-input'
        );
        fireEvent.change(newLocationInputs[newLocationInputs.length - 1], {
            target: { value: 'New Test Location' },
        });

        // Click the Create Shift button
        const createShiftButtons = screen.getAllByText('Create Shift');
        fireEvent.click(createShiftButtons[createShiftButtons.length - 1]);

        // Location creation mutation should be called
        expect(mockLocationMutate).toHaveBeenCalledWith({
            name: 'New Test Location',
            address: 'Created from AI Shift Entry',
        });
    });
});
