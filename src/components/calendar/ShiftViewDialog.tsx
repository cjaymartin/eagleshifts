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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MapIcon from '@mui/icons-material/Map';
import PeopleIcon from '@mui/icons-material/People';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
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

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

type ShiftViewDialogProps = DialogProps<
    inferRouterOutputs<AppRouter>['shifts']['byId'] | undefined | null
>;

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

    // Handle opening the edit dialog (for admins only)
    const handleEdit = () => {
        if (payload) {
            onClose();
            dialogs.open(ShiftDialog, payload);
        }
    };

    // Handle requesting a shift (for non-admins)
    const handleRequestShift = () => {
        // In a real implementation, this would create a shift request
        // For now, just close the dialog
        onClose();
    };

    // Check if user is assigned to this shift
    const isAssigned = memberId
        ? payload?.shiftAssignments?.some((a) => a.memberId === memberId)
        : false;

    // Check if shift has available slots
    const slots = payload?.slots || 1;
    const assignmentsCount = payload?.shiftAssignments?.length || 0;
    const hasAvailableSlots = assignmentsCount < slots;

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
                        {payload?.locationId && (
                            <IconButton
                                size="small"
                                color="primary"
                                onClick={() => {
                                    setViewLocationId(payload.locationId);
                                    setIsLocationViewOpen(true);
                                }}
                                aria-label="view location"
                            >
                                <LocationOnIcon />
                            </IconButton>
                        )}
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
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                {/* Show Edit button for admins */}
                {isAdmin && (
                    <Button
                        startIcon={<EditIcon />}
                        variant="contained"
                        onClick={handleEdit}
                    >
                        Edit
                    </Button>
                )}

                {/* Show Request Shift button for eligible non-admins */}
                {!isAdmin && !isAssigned && hasAvailableSlots && (
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleRequestShift}
                    >
                        Request Shift
                    </Button>
                )}

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
