import React from 'react';
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
import PeopleIcon from '@mui/icons-material/People';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { DialogProps } from '@toolpad/core';
import { inferRouterOutputs } from '@trpc/server';
import { AppRouter } from '@/api/trpc/[trpc]';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { useAuthQuery } from '@/queries/users';
import { useDialogs } from '@toolpad/core';
import ShiftDialog from '@/app/(dashboard)/shifts/_components/ShiftDialog';

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
    ? payload?.shiftAssignments?.some(a => a.memberId === memberId)
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

  // Get location information
  const locationName = payload?.location?.name || payload?.legacyLocation || 'No location specified';

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
      onClose={onClose}
      maxWidth="md"
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
          <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {/* Date and Time Section */}
          <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
            <Stack spacing={2}>
              <Box display="flex" alignItems="center">
                <CalendarTodayIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="subtitle1" fontWeight="bold">
                  Date
                </Typography>
              </Box>
              <Typography variant="body1">{formattedDate}</Typography>

              <Box display="flex" alignItems="center">
                <AccessTimeIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="subtitle1" fontWeight="bold">
                  Time
                </Typography>
              </Box>
              <Typography variant="body1">
                {formattedStartTime} - {formattedEndTime} ({timezone})
              </Typography>
            </Stack>
          </Paper>

          {/* Location Section */}
          <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
            <Stack spacing={2}>
              <Box display="flex" alignItems="center">
                <LocationOnIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="subtitle1" fontWeight="bold">
                  Location
                </Typography>
              </Box>
              <Typography variant="body1">{locationName}</Typography>
              {payload?.location?.address && (
                <Typography variant="body2" color="text.secondary">
                  {payload.location.address}
                </Typography>
              )}
            </Stack>
          </Paper>

          {/* Assignments Section */}
          <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
            <Stack spacing={2}>
              <Box display="flex" alignItems="center">
                <PeopleIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="subtitle1" fontWeight="bold">
                  Assignments
                </Typography>
              </Box>
              <Box display="flex" alignItems="center">
                <Typography variant="body1" fontWeight="bold" sx={{ mr: 1 }}>
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

              {/* List of assigned members */}
              {payload?.shiftAssignments && payload.shiftAssignments.length > 0 ? (
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {payload.shiftAssignments.map((assignment) => (
                    <Box 
                      key={assignment.id} 
                      sx={{ 
                        p: 1, 
                        borderRadius: 1,
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <Typography variant="body2">
                        {assignment.member?.user?.name || 'Unknown User'}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No members assigned yet
                </Typography>
              )}
            </Stack>
          </Paper>

          {/* Notes Section */}
          {payload?.notes && (
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
              <Stack spacing={2}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Notes
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {payload.notes}
                </Typography>
              </Stack>
            </Paper>
          )}

          {/* Admin Notes Section (only visible to admins) */}
          {isAdmin && payload?.adminNotes && (
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
              <Stack spacing={2}>
                <Typography variant="subtitle1" fontWeight="bold" color="error">
                  Admin Notes
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {payload.adminNotes}
                </Typography>
              </Stack>
            </Paper>
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

        <Button variant="outlined" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
