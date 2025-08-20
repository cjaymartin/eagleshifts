import React, { useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    List,
    ListItem,
    ListItemText,
    Button,
    CircularProgress,
    Alert,
    Chip,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    Grid,
    Card,
    CardContent,
    CardActions,
    LinearProgress,
} from '@mui/material';
import { trpc } from '@/lib/trpc/client';
import dayjs from 'dayjs';
import ChecklistCompletion from './ChecklistCompletion';

export default function MemberChecklistView() {
    const [selectedShift, setSelectedShift] = useState<any>(null);
    const [openCompletionDialog, setOpenCompletionDialog] = useState(false);

    // Fetch upcoming shifts with checklists
    const {
        data: shifts = [],
        isLoading,
        error,
        refetch,
    } = trpc.checklists.getUpcomingShiftsWithChecklists.useQuery();

    const handleViewChecklist = (shift: any) => {
        setSelectedShift(shift);
        setOpenCompletionDialog(true);
    };

    const handleCloseCompletionDialog = () => {
        setOpenCompletionDialog(false);
        refetch();
    };

    // Calculate completion percentage for a checklist
    const calculateCompletionPercentage = (checklist: any) => {
        if (!checklist || !checklist.items || checklist.items.length === 0) {
            return 0;
        }

        const completedItems = checklist.items.filter(
            (item: any) =>
                item.completions &&
                item.completions.length > 0 &&
                item.completions[0].completed
        ).length;

        return Math.round((completedItems / checklist.items.length) * 100);
    };

    // Format date and time
    const formatDateTime = (date: Date) => {
        return dayjs(date).format('MMM D, YYYY h:mm A');
    };

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ mb: 2 }}>
                Error loading checklists: {error.message}
            </Alert>
        );
    }

    if (shifts.length === 0) {
        return (
            <Alert severity="info" sx={{ mb: 2 }}>
                You don't have any upcoming shifts with checklists to complete.
            </Alert>
        );
    }

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                Your Upcoming Shifts with Checklists
            </Typography>

            <Grid container spacing={2} sx={{ mt: 1 }}>
                {shifts.map((shift) => {
                    const completionPercentage = calculateCompletionPercentage(
                        shift.Checklist
                    );

                    return (
                        <Grid item xs={12} sm={6} md={4} key={shift.id}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        {shift.title}
                                    </Typography>

                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                    >
                                        {formatDateTime(shift.startTime)} -{' '}
                                        {formatDateTime(shift.endTime)}
                                    </Typography>

                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ mb: 1 }}
                                    >
                                        {shift.location?.name ||
                                            shift.legacyLocation ||
                                            'No location specified'}
                                    </Typography>

                                    <Divider sx={{ my: 1 }} />

                                    <Typography
                                        variant="subtitle2"
                                        gutterBottom
                                    >
                                        Checklist: {shift.Checklist?.name}
                                    </Typography>

                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            mt: 1,
                                        }}
                                    >
                                        <Box sx={{ width: '100%', mr: 1 }}>
                                            <LinearProgress
                                                variant="determinate"
                                                value={completionPercentage}
                                                color={
                                                    completionPercentage === 100
                                                        ? 'success'
                                                        : 'primary'
                                                }
                                            />
                                        </Box>
                                        <Box sx={{ minWidth: 35 }}>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                {completionPercentage}%
                                            </Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                                <CardActions>
                                    <Button
                                        size="small"
                                        color="primary"
                                        onClick={() =>
                                            handleViewChecklist(shift)
                                        }
                                    >
                                        {completionPercentage === 100
                                            ? 'View Completed'
                                            : 'Complete Checklist'}
                                    </Button>
                                </CardActions>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>

            {/* Checklist Completion Dialog */}
            <Dialog
                open={openCompletionDialog}
                onClose={handleCloseCompletionDialog}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    {selectedShift?.title} - {selectedShift?.Checklist?.name}
                </DialogTitle>
                <DialogContent>
                    {selectedShift && (
                        <ChecklistCompletion
                            shift={selectedShift}
                            onClose={handleCloseCompletionDialog}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
}
