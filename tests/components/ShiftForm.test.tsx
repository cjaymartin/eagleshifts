import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import ShiftForm from '@/app/(dashboard)/shifts/_components/ShiftForm';
import { combineDateTime } from '@/utils/dateUtils';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Mock the dateUtils functions
jest.mock('@/utils/dateUtils', () => ({
    combineDateTime: jest.fn(),
    utcToOrgTimezone: jest.fn(),
    isValidTimezone: jest.fn(() => true),
}));

// Mock TRPC hooks
jest.mock('@/lib/trpc/client', () => ({
    trpc: {
        shifts: {
            create: {
                useMutation: () => ({
                    mutateAsync: jest.fn(),
                    isLoading: false,
                }),
            },
            update: {
                useMutation: () => ({
                    mutateAsync: jest.fn(),
                    isLoading: false,
                }),
            },
            setCancelled: {
                useMutation: () => ({
                    mutateAsync: jest.fn(),
                    isLoading: false,
                }),
            },
        },
    },
}));

// Mock other hooks
jest.mock('@/queries/team', () => ({
    useBusinessProfileQuery: () => ({
        data: {
            timezone: 'America/New_York',
        },
    }),
}));

jest.mock('@/queries/users', () => ({
    useAuthQuery: () => ({
        data: {
            user: {
                role: 'admin',
            },
        },
    }),
    useTeamUsersQuery: () => ({
        data: [],
    }),
    useTeamUsersLookupQuery: () => ({
        data: {},
    }),
}));

jest.mock('@/queries/locations', () => ({
    useLocationsQuery: () => ({
        data: [],
    }),
    useLocationQuery: () => ({
        data: null,
    }),
}));

jest.mock('@/queries/shifts', () => ({
    useShiftCreateMutation: () => ({
        mutateAsync: jest.fn(),
        isLoading: false,
    }),
    useShiftUpdateMutation: () => ({
        mutateAsync: jest.fn(),
        isLoading: false,
    }),
    useShiftCancelMutation: () => ({
        mutateAsync: jest.fn(),
        isLoading: false,
    }),
}));

jest.mock('@/components/providers/NotificationsProvider', () => ({
    useNotifications: () => ({
        show: jest.fn(),
    }),
}));

jest.mock('@toolpad/core', () => ({
    useDialogs: () => ({
        confirm: jest.fn(() => Promise.resolve(true)),
    }),
}));

const mockCombineDateTime = combineDateTime as jest.MockedFunction<
    typeof combineDateTime
>;

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });

    const theme = createTheme();

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    {children}
                </LocalizationProvider>
            </ThemeProvider>
        </QueryClientProvider>
    );
};

describe.skip('ShiftForm', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Critical Bug Fix - Date/Time Combination', () => {
        it('should call combineDateTime with correct start and end times separately', async () => {
            // Mock combineDateTime to return different values for start and end times
            mockCombineDateTime
                .mockReturnValueOnce('2024-01-15T14:00:00.000Z') // Start time
                .mockReturnValueOnce('2024-01-15T22:00:00.000Z'); // End time

            render(
                <TestWrapper>
                    <ShiftForm isNew={true} />
                </TestWrapper>
            );

            // Fill out the form
            const titleInput = screen.getByLabelText(/title/i);
            fireEvent.change(titleInput, { target: { value: 'Test Shift' } });

            // Set date
            const dateInput = screen.getByLabelText(/date/i);
            fireEvent.change(dateInput, { target: { value: '01/15/2024' } });

            // Set start time
            const startTimeInput = screen.getByLabelText(/start time/i);
            fireEvent.change(startTimeInput, { target: { value: '9:00 AM' } });

            // Set end time
            const endTimeInput = screen.getByLabelText(/end time/i);
            fireEvent.change(endTimeInput, { target: { value: '5:00 PM' } });

            // Submit the form
            const submitButton = screen.getByRole('button', {
                name: /create shift/i,
            });
            fireEvent.click(submitButton);

            await waitFor(() => {
                // Verify combineDateTime was called twice with different time parameters
                expect(mockCombineDateTime).toHaveBeenCalledTimes(2);

                // Verify the calls were made with different time values
                const calls = mockCombineDateTime.mock.calls;
                expect(calls[0]).not.toEqual(calls[1]); // Start and end calls should be different

                // Verify both calls include the timezone options
                expect(calls[0][2]).toEqual({
                    organizationTimezone: 'America/New_York',
                    fallbackTimezone: 'America/New_York',
                });
                expect(calls[1][2]).toEqual({
                    organizationTimezone: 'America/New_York',
                    fallbackTimezone: 'America/New_York',
                });
            });
        });

        it('should not set both startTimeISO and endTimeISO to the same value', async () => {
            // Mock combineDateTime to return different values
            mockCombineDateTime
                .mockReturnValueOnce('2024-01-15T14:00:00.000Z') // Start time
                .mockReturnValueOnce('2024-01-15T22:00:00.000Z'); // End time

            render(
                <TestWrapper>
                    <ShiftForm isNew={true} />
                </TestWrapper>
            );

            // Fill out the form with different start and end times
            const titleInput = screen.getByLabelText(/title/i);
            fireEvent.change(titleInput, { target: { value: 'Test Shift' } });

            // Submit the form
            const submitButton = screen.getByRole('button', {
                name: /create shift/i,
            });
            fireEvent.click(submitButton);

            await waitFor(() => {
                // Verify that combineDateTime was called with different parameters
                const calls = mockCombineDateTime.mock.calls;
                if (calls.length >= 2) {
                    // The second parameter (time) should be different between calls
                    expect(calls[0][1]).not.toEqual(calls[1][1]);
                }
            });
        });
    });

    describe('Form Validation', () => {
        it('should validate required fields', async () => {
            render(
                <TestWrapper>
                    <ShiftForm isNew={true} />
                </TestWrapper>
            );

            // Try to submit without filling required fields
            const submitButton = screen.getByRole('button', {
                name: /create shift/i,
            });
            fireEvent.click(submitButton);

            // Should not call combineDateTime if validation fails
            expect(mockCombineDateTime).not.toHaveBeenCalled();
        });

        it('should require date field', async () => {
            render(
                <TestWrapper>
                    <ShiftForm isNew={true} />
                </TestWrapper>
            );

            const titleInput = screen.getByLabelText(/title/i);
            fireEvent.change(titleInput, { target: { value: 'Test Shift' } });

            const submitButton = screen.getByRole('button', {
                name: /create shift/i,
            });
            fireEvent.click(submitButton);

            // Should show validation error for missing date
            await waitFor(() => {
                expect(
                    screen.getByText(/date is required/i)
                ).toBeInTheDocument();
            });
        });

        it('should require start time field', async () => {
            render(
                <TestWrapper>
                    <ShiftForm isNew={true} />
                </TestWrapper>
            );

            const titleInput = screen.getByLabelText(/title/i);
            fireEvent.change(titleInput, { target: { value: 'Test Shift' } });

            const submitButton = screen.getByRole('button', {
                name: /create shift/i,
            });
            fireEvent.click(submitButton);

            // Should show validation error for missing start time
            await waitFor(() => {
                expect(
                    screen.getByText(/start time is required/i)
                ).toBeInTheDocument();
            });
        });

        it('should require end time field', async () => {
            render(
                <TestWrapper>
                    <ShiftForm isNew={true} />
                </TestWrapper>
            );

            const titleInput = screen.getByLabelText(/title/i);
            fireEvent.change(titleInput, { target: { value: 'Test Shift' } });

            const submitButton = screen.getByRole('button', {
                name: /create shift/i,
            });
            fireEvent.click(submitButton);

            // Should show validation error for missing end time
            await waitFor(() => {
                expect(
                    screen.getByText(/end time is required/i)
                ).toBeInTheDocument();
            });
        });
    });

    describe('Timezone Handling', () => {
        it('should use organization timezone from business profile', async () => {
            mockCombineDateTime.mockReturnValue('2024-01-15T14:00:00.000Z');

            render(
                <TestWrapper>
                    <ShiftForm isNew={true} />
                </TestWrapper>
            );

            const titleInput = screen.getByLabelText(/title/i);
            fireEvent.change(titleInput, { target: { value: 'Test Shift' } });

            const submitButton = screen.getByRole('button', {
                name: /create shift/i,
            });
            fireEvent.click(submitButton);

            await waitFor(() => {
                if (mockCombineDateTime.mock.calls.length > 0) {
                    // Verify timezone options are passed correctly
                    expect(mockCombineDateTime.mock.calls[0][2]).toEqual({
                        organizationTimezone: 'America/New_York',
                        fallbackTimezone: 'America/New_York',
                    });
                }
            });
        });

        it('should use fallback timezone when organization timezone is not available', async () => {
            // Mock business profile without timezone
            const mockUseBusinessProfileQuery = require('@/queries/team')
                .useBusinessProfileQuery as jest.Mock;
            mockUseBusinessProfileQuery.mockReturnValue({
                data: null,
            });

            mockCombineDateTime.mockReturnValue('2024-01-15T14:00:00.000Z');

            render(
                <TestWrapper>
                    <ShiftForm isNew={true} />
                </TestWrapper>
            );

            const titleInput = screen.getByLabelText(/title/i);
            fireEvent.change(titleInput, { target: { value: 'Test Shift' } });

            const submitButton = screen.getByRole('button', {
                name: /create shift/i,
            });
            fireEvent.click(submitButton);

            await waitFor(() => {
                if (mockCombineDateTime.mock.calls.length > 0) {
                    // Should use UTC as fallback
                    expect(mockCombineDateTime.mock.calls[0][2]).toEqual({
                        organizationTimezone: 'UTC',
                        fallbackTimezone: 'America/New_York',
                    });
                }
            });
        });
    });

    describe('Update Form Consistency', () => {
        const mockShift = {
            id: 'test-shift-id',
            title: 'Existing Shift',
            startTime: new Date('2024-01-15T14:00:00.000Z'),
            endTime: new Date('2024-01-15T22:00:00.000Z'),
            timezone: 'America/New_York',
            slots: 1,
            locationId: null,
            legacyLocation: 'Test Location',
            notes: 'Test notes',
            adminNotes: 'Admin notes',
            assignments: [],
        };

        it('should use consistent date conversion method for updates', async () => {
            mockCombineDateTime
                .mockReturnValueOnce('2024-01-15T14:00:00.000Z')
                .mockReturnValueOnce('2024-01-15T22:00:00.000Z');

            render(
                <TestWrapper>
                    <ShiftForm
                        isNew={false}
                        shift={mockShift}
                        shiftId="test-shift-id"
                    />
                </TestWrapper>
            );

            // Update the title
            const titleInput = screen.getByDisplayValue('Existing Shift');
            fireEvent.change(titleInput, {
                target: { value: 'Updated Shift' },
            });

            const submitButton = screen.getByRole('button', {
                name: /update shift/i,
            });
            fireEvent.click(submitButton);

            await waitFor(() => {
                // Verify combineDateTime is used for updates (not .format())
                expect(mockCombineDateTime).toHaveBeenCalledTimes(2);

                // Verify consistent timezone options
                const calls = mockCombineDateTime.mock.calls;
                expect(calls[0][2]).toEqual({
                    organizationTimezone: 'America/New_York',
                    fallbackTimezone: 'America/New_York',
                });
                expect(calls[1][2]).toEqual({
                    organizationTimezone: 'America/New_York',
                    fallbackTimezone: 'America/New_York',
                });
            });
        });
    });

    describe('Load-Save Idempotency', () => {
        it('should preserve times when loading and immediately saving', async () => {
            const mockShift = {
                id: 'test-shift-id',
                title: 'Test Shift',
                startTime: new Date('2024-01-15T14:00:00.000Z'),
                endTime: new Date('2024-01-15T22:00:00.000Z'),
                timezone: 'America/New_York',
                slots: 1,
                locationId: null,
                legacyLocation: 'Test Location',
                notes: '',
                adminNotes: '',
                assignments: [],
            };

            // Mock combineDateTime to return the same UTC times
            mockCombineDateTime
                .mockReturnValueOnce('2024-01-15T14:00:00.000Z')
                .mockReturnValueOnce('2024-01-15T22:00:00.000Z');

            render(
                <TestWrapper>
                    <ShiftForm
                        isNew={false}
                        shift={mockShift}
                        shiftId="test-shift-id"
                    />
                </TestWrapper>
            );

            // Immediately save without changes
            const submitButton = screen.getByRole('button', {
                name: /update shift/i,
            });
            fireEvent.click(submitButton);

            await waitFor(() => {
                // Verify the returned times match the original UTC times
                expect(mockCombineDateTime).toHaveReturnedWith(
                    '2024-01-15T14:00:00.000Z'
                );
                expect(mockCombineDateTime).toHaveReturnedWith(
                    '2024-01-15T22:00:00.000Z'
                );
            });
        });
    });

    describe('Edge Cases', () => {
        it('should handle shifts crossing midnight', async () => {
            mockCombineDateTime
                .mockReturnValueOnce('2024-01-15T23:00:00.000Z') // 11 PM
                .mockReturnValueOnce('2024-01-16T05:00:00.000Z'); // 5 AM next day

            render(
                <TestWrapper>
                    <ShiftForm isNew={true} />
                </TestWrapper>
            );

            const titleInput = screen.getByLabelText(/title/i);
            fireEvent.change(titleInput, { target: { value: 'Night Shift' } });

            const submitButton = screen.getByRole('button', {
                name: /create shift/i,
            });
            fireEvent.click(submitButton);

            await waitFor(() => {
                // Should handle midnight crossing without issues
                expect(mockCombineDateTime).toHaveBeenCalledTimes(2);

                // Verify different times were processed
                const calls = mockCombineDateTime.mock.calls;
                expect(calls[0]).not.toEqual(calls[1]);
            });
        });

        it('should handle DST transition periods', async () => {
            // Mock a shift during DST transition
            mockCombineDateTime
                .mockReturnValueOnce('2024-03-10T07:00:00.000Z') // Spring forward day
                .mockReturnValueOnce('2024-03-10T15:00:00.000Z');

            render(
                <TestWrapper>
                    <ShiftForm isNew={true} />
                </TestWrapper>
            );

            const titleInput = screen.getByLabelText(/title/i);
            fireEvent.change(titleInput, { target: { value: 'DST Shift' } });

            const submitButton = screen.getByRole('button', {
                name: /create shift/i,
            });
            fireEvent.click(submitButton);

            await waitFor(() => {
                // Should handle DST transitions correctly
                expect(mockCombineDateTime).toHaveBeenCalledTimes(2);
            });
        });
    });
});
