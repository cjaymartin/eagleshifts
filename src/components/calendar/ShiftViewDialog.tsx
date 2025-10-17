import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Divider,
    Chip,
    Stack,
    IconButton,
    Grid,
    Paper,
    TextField,
    MenuItem,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MapIcon from '@mui/icons-material/Map';
import PeopleIcon from '@mui/icons-material/People';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { DialogProps } from '@toolpad/core';
import { inferRouterOutputs } from '@trpc/server';
import { AppRouter } from '@/api/trpc/[trpc]';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { useAuthQuery, useTeamUsersLookupQuery } from '@/queries/users';
import { useDialogs } from '@toolpad/core';
import ShiftDialog from '@/app/(dashboard)/shifts/_components/ShiftDialog';
import LocationViewDialog from '@/components/locations/LocationViewDialog';
import {
    useShiftRequestCreateMutation,
    useShiftRequestsListQuery,
} from '@/queries/requests';
import { trpc } from '@/lib/trpc/client';
import { useNotifications } from '@/components/providers/NotificationsProvider';
import ChecklistCompletion from '@/app/(dashboard)/checklists/_components/ChecklistCompletion';
import ShiftUploads from '@/app/(dashboard)/shifts/_components/ShiftUploads';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

type ShiftViewDialogProps = DialogProps<
    inferRouterOutputs<AppRouter>['shifts']['byId'] | undefined | null
>;

// Simple Checklist Link Component
function ChecklistLink({ shift }: { shift?: any }) {
    const [openChecklistDialog, setOpenChecklistDialog] = useState(false);

    // Determine if a checklist is attached by checking both Checklist object and checklistId
    const hasChecklist = !!(shift?.Checklist || shift?.checklistId);

    const handleOpenChecklist = () => {
        setOpenChecklistDialog(true);
    };

    const handleCloseChecklist = () => {
        setOpenChecklistDialog(false);
    };

    if (!hasChecklist) {
        return (
            <Box sx={{ mt: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <AssignmentIcon sx={{ mr: 1.5, color: 'primary.main' }} />
                    <Typography variant="body2" fontWeight="bold">
                        Checklist
                    </Typography>
                </Box>
                <Typography variant="body2" gutterBottom>
                    No checklist attached to this shift.
                </Typography>
            </Box>
        );
    }

    return (
        <>
            <Box sx={{ mt: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <AssignmentIcon sx={{ mr: 1.5, color: 'primary.main' }} />
                    <Typography variant="body2" fontWeight="bold">
                        Checklist
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ mr: 2 }}>
                        {shift.Checklist?.name || 'Checklist Attached'}
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={handleOpenChecklist}
                    >
                        View Checklist
                    </Button>
                </Box>
            </Box>

            {/* Checklist Dialog */}
            <Dialog
                open={openChecklistDialog}
                onClose={handleCloseChecklist}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    {shift?.title} - {shift?.Checklist?.name || 'Checklist'}
                </DialogTitle>
                <DialogContent>
                    {shift && (
                        <ChecklistCompletion
                            shift={shift}
                            onClose={handleCloseChecklist}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

export default function ShiftViewDialog({
    payload,
    open,
    onClose,
}: ShiftViewDialogProps) {
    // Get user session and role
    const { data: session } = useAuthQuery();
    const role = session?.user?.role ?? 'guest';
    const isAdmin = ['admin', 'owner'].includes(role);
    const memberId = session?.user?.memberId;

    // Get team users lookup data for resolving member names
    const { data: userLookup } = useTeamUsersLookupQuery();

    // State for location view dialog
    const [isLocationViewOpen, setIsLocationViewOpen] = useState(false);
    const [viewLocationId, setViewLocationId] = useState<string | null>(null);

    // Access dialogs for opening edit dialog
    const dialogs = useDialogs();
    const notifications = useNotifications();

    // Get the user's shift requests
    const { data: userRequests = [] } = useShiftRequestsListQuery();

    // Create shift request mutation
    const createRequestMutation = useShiftRequestCreateMutation();

    // Handle opening the edit dialog (for admins only)
    const handleEdit = () => {
        if (payload) {
            onClose();
            dialogs.open(ShiftDialog, payload);
        }
    };

    // Handle duplicating a shift
    const handleDuplicate = () => {
        if (payload) {
            // Create a new shift object with the necessary fields from the current shift
            const duplicatedShift = {
                ...payload,
                id: undefined, // Remove ID to create a new shift
                shiftAssignments: [], // Don't duplicate people assigned
                isNew: true, // Mark as a new shift
                isDuplicate: true, // Mark as a duplicated shift to preserve time values
                isCancelled: false, // Don't duplicate cancelled status
            };

            onClose();
            dialogs.open(ShiftDialog, duplicatedShift as any);
        }
    };

    // Handle requesting a shift (for non-admins)
    const handleRequestShift = async () => {
        if (!payload?.id) {
            notifications.show('Shift ID is required', {
                severity: 'error',
                autoHideDuration: 3000,
            });
            return;
        }

        try {
            await createRequestMutation.mutateAsync({
                shiftId: payload.id,
                reason: '',
            });

            notifications.show('Shift request submitted', {
                severity: 'success',
                autoHideDuration: 3000,
            });
            onClose();
        } catch (error: any) {
            console.error('Error requesting shift:', error);
            notifications.show(error.message || 'Failed to request shift', {
                severity: 'error',
                autoHideDuration: 3000,
            });
        }
    };

    // Check if user is assigned to this shift
    const isAssigned = memberId
        ? payload?.shiftAssignments?.some((a) => a.memberId === memberId)
        : false;

    // Check if shift has available slots
    const slots = payload?.slots || 1;
    const assignmentsCount = payload?.shiftAssignments?.length || 0;
    const hasAvailableSlots = assignmentsCount < slots;

    // Check if user has already requested this shift
    const hasRequested = payload?.id
        ? userRequests.some(
              (request) =>
                  request.shiftId === payload.id && request.status === 'pending'
          )
        : false;

    // Check if user has a rejected request for this shift
    const hasRejectedRequest = payload?.id
        ? userRequests.some(
              (request) =>
                  request.shiftId === payload.id &&
                  request.status === 'rejected'
          )
        : false;

    // Format date and time with timezone
    const timezone = payload?.timezone || 'UTC';
    const formattedDate = payload?.startTime
        ? dayjs(payload.startTime).tz(timezone).format('dddd, MMMM D, YYYY')
        : '';
    const formattedStartTime = payload?.startTime
        ? dayjs(payload.startTime).tz(timezone).format('h:mm A')
        : '';
    const formattedEndTime = payload?.endTime
        ? dayjs(payload.endTime).tz(timezone).format('h:mm A')
        : '';
    const formattedDateTime = `${formattedDate}  —  ${formattedStartTime} – ${formattedEndTime} (${timezone})`;

    // Get location information
    const locationName =
        payload?.location?.name ||
        payload?.legacyLocation ||
        'No location specified';

    // Animation for dialog
    const dialogTransition = {
        enter: {
            transform: 'scale(0.9)',
            opacity: 0,
        },
        enterActive: {
            transform: 'scale(1)',
            opacity: 1,
            transition: 'all 0.2s ease-out',
        },
        exit: {
            transform: 'scale(0.9)',
            opacity: 0,
            transition: 'all 0.2s ease-in',
        },
    };

    return (
        <Dialog
            open={open}
            onClose={onClose as any}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    boxShadow: 3,
                },
            }}
        >
            <DialogTitle>
                <Box display="flex" alignItems="center">
                    <Box flexGrow={1}>
                        <Typography variant="h6" component="div">
                            {payload?.title || 'Shift Details'}
                        </Typography>
                    </Box>
                    <IconButton
                        edge="end"
                        color="inherit"
                        onClick={onClose as any}
                        aria-label="close"
                    >
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent dividers>
                <Stack spacing={2}>
                    {/* Date and Time Section - Compact Format */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CalendarTodayIcon
                            sx={{ mr: 1.5, color: 'primary.main' }}
                        />
                        <Typography variant="body1">
                            {formattedDateTime}
                        </Typography>
                    </Box>

                    <Divider />

                    {/* Location Section - Compact Format */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <MapIcon sx={{ mr: 1.5, color: 'primary.main' }} />
                        <Box flexGrow={1}>
                            <Typography variant="body1" component="span">
                                {locationName}
                            </Typography>
                            {payload?.location?.address && (
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    component="span"
                                    sx={{ ml: 1 }}
                                >
                                    — {payload.location.address}
                                </Typography>
                            )}
                        </Box>
                        {/*{payload?.locationId && (*/}
                        {/*    <IconButton*/}
                        {/*        size="small"*/}
                        {/*        color="primary"*/}
                        {/*        onClick={() => {*/}
                        {/*            setViewLocationId(payload.locationId);*/}
                        {/*            setIsLocationViewOpen(true);*/}
                        {/*        }}*/}
                        {/*        aria-label="view location"*/}
                        {/*    >*/}
                        {/*        <LocationOnIcon />*/}
                        {/*    </IconButton>*/}
                        {/*)}*/}
                    </Box>

                    <Divider />

                    {/* Assignments Section - Compact Format */}
                    <Box sx={{ mt: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <PeopleIcon
                                sx={{ mr: 1.5, color: 'primary.main' }}
                            />
                            <Typography variant="body1" sx={{ mr: 1 }}>
                                {assignmentsCount} of {slots} slots filled
                            </Typography>
                            {hasAvailableSlots ? (
                                <Chip
                                    label="Open"
                                    color="success"
                                    size="small"
                                    variant="outlined"
                                    sx={{ ml: 1 }}
                                />
                            ) : (
                                <Chip
                                    label="Full"
                                    color="default"
                                    size="small"
                                    variant="outlined"
                                    sx={{ ml: 1 }}
                                />
                            )}
                        </Box>

                        {/* List of assigned members - more compact */}
                        {payload?.shiftAssignments &&
                        payload.shiftAssignments.length > 0 ? (
                            <Box sx={{ ml: 4, mt: 1 }}>
                                {payload.shiftAssignments.map(
                                    (assignment, index) => {
                                        // Try to get user name from different sources
                                        const userName =
                                            // First try to get from assignment.member.user.name (if available)
                                            (assignment as any).member?.user
                                                ?.name ||
                                            // Then try to get from userLookup using memberId
                                            (userLookup &&
                                                assignment.memberId &&
                                                userLookup[assignment.memberId]
                                                    ?.name) ||
                                            // Fallback to Unknown User
                                            'Unknown User';

                                        return (
                                            <Typography
                                                key={assignment.id}
                                                variant="body2"
                                                sx={{ mb: 0.5 }}
                                            >
                                                {userName}
                                            </Typography>
                                        );
                                    }
                                )}
                            </Box>
                        ) : (
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ ml: 4, mt: 0.5 }}
                            >
                                No members assigned yet
                            </Typography>
                        )}
                    </Box>

                    <Divider sx={{ mt: 1 }} />

                    {/* Notes Section - Compact Format */}
                    {payload?.notes && (
                        <Box sx={{ mt: 1 }}>
                            <Typography
                                variant="body2"
                                fontWeight="bold"
                                sx={{ mb: 0.5 }}
                            >
                                Notes:
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{ whiteSpace: 'pre-wrap', ml: 1 }}
                            >
                                {payload.notes}
                            </Typography>
                        </Box>
                    )}

                    {/* Admin Notes Section - Compact Format (only visible to admins) */}
                    {isAdmin && payload?.adminNotes && (
                        <>
                            <Divider sx={{ mt: 1 }} />
                            <Box sx={{ mt: 1 }}>
                                <Typography
                                    variant="body2"
                                    fontWeight="bold"
                                    color="error"
                                    sx={{ mb: 0.5 }}
                                >
                                    Admin Notes:
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{ whiteSpace: 'pre-wrap', ml: 1 }}
                                >
                                    {payload.adminNotes}
                                </Typography>
                            </Box>
                        </>
                    )}

                    {/* Checklist Link - Visible to all users with a shift that has a checklist */}
                    {(payload?.Checklist || payload?.checklistId) && (
                        <>
                            <Divider sx={{ mt: 1 }} />
                            <ChecklistLink shift={payload} />
                        </>
                    )}

                    {/* Uploads section */}
                    {payload?.id && (
                        <>
                            <Divider sx={{ mt: 1 }} />
                            <ShiftUploads
                                shiftId={payload.id}
                                readOnly={!isAdmin}
                            />
                        </>
                    )}
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                {/* Show Edit button for admins */}
                {isAdmin && (
                    <Button
                        startIcon={<EditIcon />}
                        variant="contained"
                        onClick={handleEdit}
                        sx={{ mr: 1 }}
                    >
                        Edit
                    </Button>
                )}

                {/* Show Duplicate Shift button for admins */}
                {isAdmin && (
                    <Button
                        variant="contained"
                        color="secondary"
                        onClick={handleDuplicate}
                        sx={{ mr: 1 }}
                    >
                        Duplicate Shift
                    </Button>
                )}

                {/* Show Request Shift button for eligible non-admins */}
                {!isAdmin &&
                    !isAssigned &&
                    hasAvailableSlots &&
                    !hasRequested &&
                    !hasRejectedRequest && (
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleRequestShift}
                        >
                            Request Shift
                        </Button>
                    )}

                {/* Show message when user has a pending request for the shift */}
                {!isAdmin && !isAssigned && hasRequested && (
                    <Typography variant="body2" color="text.secondary">
                        You have already requested this shift
                    </Typography>
                )}

                {/* Show nothing (leave area blank) for rejected requests */}

                <Button variant="outlined" onClick={onClose as any}>
                    Close
                </Button>
            </DialogActions>

            {/* Location View Dialog */}
            <LocationViewDialog
                locationId={viewLocationId}
                open={isLocationViewOpen}
                onClose={() => setIsLocationViewOpen(false)}
            />
        </Dialog>
    );
}
