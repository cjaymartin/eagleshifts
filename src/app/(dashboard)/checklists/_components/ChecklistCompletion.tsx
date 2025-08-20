import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    List,
    ListItem,
    ListItemText,
    Checkbox,
    Button,
    TextField,
    CircularProgress,
    Alert,
    Divider,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tooltip,
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CommentIcon from '@mui/icons-material/Comment';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { trpc } from '@/lib/trpc/client';
import { useNotifications } from '@/components/providers/NotificationsProvider';
import dayjs from 'dayjs';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useUploadFileMutation, readFileAsBase64, useUploadGroupsQuery } from '@/queries/uploads';

type ChecklistCompletionProps = {
    shift: any;
    onClose: () => void;
};

export default function ChecklistCompletion({
    shift,
    onClose,
}: ChecklistCompletionProps) {
    const [completions, setCompletions] = useState<Record<string, any>>({});
    const [comments, setComments] = useState<Record<string, string>>({});
    const [uploads, setUploads] = useState<Record<string, string>>({});
    const [confirmUncheckItem, setConfirmUncheckItem] = useState<string | null>(
        null
    );
    const [geolocation, setGeolocation] = useState<{
        latitude: number;
        longitude: number;
    } | null>(null);
    const [geoError, setGeoError] = useState<string | null>(null);
    const [uploading, setUploading] = useState<Record<string, boolean>>({});

    const notifications = useNotifications();

    // Upload file mutation
    const uploadFileMutation = useUploadFileMutation();

    // Get upload groups
    const { data: uploadGroups = [] } = useUploadGroupsQuery();

    // Handle file upload
    const handleFileUpload = async (
        itemId: string,
        uploadName: string,
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setUploading((prev) => ({ ...prev, [itemId]: true }));

            // Read file as base64
            const fileData = await readFileAsBase64(file);

            // Find an appropriate upload group
            let uploadGroupId = "";

            // First, try to find a group with "checklist" in the name
            const checklistGroup = uploadGroups.find(group => 
                group.uploadName.toLowerCase().includes('checklist')
            );

            // If not found, use the first available group
            if (checklistGroup) {
                uploadGroupId = checklistGroup.id;
            } else if (uploadGroups.length > 0) {
                uploadGroupId = uploadGroups[0].id;
            } else {
                throw new Error("No upload groups available. Please contact an administrator.");
            }

            // Upload file
            const result = await uploadFileMutation.mutateAsync({
                shiftId: shift.id,
                uploadGroupId: uploadGroupId,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                fileData,
            });

            // Handle successful upload
            if (result?.id) {
                handleFileUploaded(itemId, result.id);
                notifications.success(`File uploaded successfully`);
            }
        } catch (error: any) {
            console.error('Error uploading file:', error);
            notifications.error(`Failed to upload file: ${error.message}`);
        } finally {
            setUploading((prev) => ({ ...prev, [itemId]: false }));
            // Clear the file input
            event.target.value = '';
        }
    };

    // Fetch checklist completions for the shift
    const {
        data: checklistData,
        isLoading,
        error,
        refetch,
    } = trpc.checklists.getShiftCompletions.useQuery({ shiftId: shift.id });

    // Complete checklist item mutation
    const completeItemMutation = trpc.checklists.completeItem.useMutation({
        onSuccess: () => {
            refetch();
            notifications.success('Item updated successfully');
        },
        onError: (error) => {
            notifications.error(`Error updating item: ${error.message}`);
        },
    });

    // Initialize completions, comments, and uploads from fetched data
    useEffect(() => {
        if (checklistData) {
            const newCompletions: Record<string, any> = {};
            const newComments: Record<string, string> = {};
            const newUploads: Record<string, string> = {};

            checklistData.items.forEach((item) => {
                if (item.completions && item.completions.length > 0) {
                    const completion = item.completions[0];
                    newCompletions[item.id] = completion;
                    if (completion.comments) {
                        newComments[item.id] = completion.comments;
                    }
                    if (completion.uploadId) {
                        newUploads[item.id] = completion.uploadId;
                    }
                }
            });

            setCompletions(newCompletions);
            setComments(newComments);
            setUploads(newUploads);
        }
    }, [checklistData]);

    // Get geolocation
    const getGeolocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setGeolocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                    setGeoError(null);
                },
                (error) => {
                    setGeoError(`Error getting location: ${error.message}`);
                    notifications.error(
                        `Error getting location: ${error.message}`
                    );
                }
            );
        } else {
            setGeoError('Geolocation is not supported by this browser');
            notifications.error('Geolocation is not supported by this browser');
        }
    };

    // Handle checkbox change
    const handleCheckboxChange = (item: any) => {
        const isCompleted = !!completions[item.id];

        if (isCompleted) {
            // If unchecking, show confirmation dialog
            setConfirmUncheckItem(item.id);
        } else {
            // If checking, validate required fields
            let canComplete = true;

            // Check if comments are required but missing
            if (
                item.commentsOption === 'required' &&
                (!comments[item.id] || comments[item.id].trim() === '')
            ) {
                notifications.error('Comments are required for this item');
                canComplete = false;
            }

            // Check if upload is required but missing
            if (item.uploadOption === 'required' && !uploads[item.id]) {
                notifications.error('File upload is required for this item');
                canComplete = false;
            }

            // Get geolocation if needed
            if (item.geoLocationEnabled && !geolocation) {
                getGeolocation();
            }

            if (canComplete) {
                completeItemMutation.mutate({
                    itemId: item.id,
                    shiftId: shift.id,
                    completed: true,
                    latitude: geolocation?.latitude,
                    longitude: geolocation?.longitude,
                    comments: comments[item.id],
                    uploadId: uploads[item.id],
                });
            }
        }
    };

    // Handle comment change
    const handleCommentChange = (itemId: string, value: string) => {
        setComments((prev) => ({
            ...prev,
            [itemId]: value,
        }));
    };

    // Handle file upload
    const handleFileUploaded = (itemId: string, uploadId: string) => {
        setUploads((prev) => ({
            ...prev,
            [itemId]: uploadId,
        }));

        // If the item is already completed, update it with the new upload
        if (completions[itemId]) {
            completeItemMutation.mutate({
                itemId: itemId,
                shiftId: shift.id,
                completed: true,
                latitude: completions[itemId].latitude,
                longitude: completions[itemId].longitude,
                comments: comments[itemId],
                uploadId: uploadId,
            });
        }
    };

    // Handle uncheck confirmation
    const handleConfirmUncheck = () => {
        if (confirmUncheckItem) {
            completeItemMutation.mutate({
                itemId: confirmUncheckItem,
                shiftId: shift.id,
                completed: false,
            });
            setConfirmUncheckItem(null);
        }
    };

    // Cancel uncheck
    const handleCancelUncheck = () => {
        setConfirmUncheckItem(null);
    };

    // Format date
    const formatDate = (date: Date) => {
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
                Error loading checklist: {error.message}
            </Alert>
        );
    }

    if (!checklistData) {
        return (
            <Alert severity="warning" sx={{ mb: 2 }}>
                Checklist not found
            </Alert>
        );
    }

    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
                Shift: {shift.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
                {formatDate(shift.startTime)} - {formatDate(shift.endTime)}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
                Location:{' '}
                {shift.location?.name ||
                    shift.legacyLocation ||
                    'No location specified'}
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>
                {checklistData.name}
            </Typography>

            {checklistData.description && (
                <Typography variant="body2" color="text.secondary" paragraph>
                    {checklistData.description}
                </Typography>
            )}

            {geoError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {geoError}
                </Alert>
            )}

            <List>
                {checklistData.items.map((item, index) => {
                    const isCompleted = !!completions[item.id];
                    const hasRequiredFields =
                        (item.commentsOption !== 'required' ||
                            (comments[item.id] &&
                                comments[item.id].trim() !== '')) &&
                        (item.uploadOption !== 'required' || uploads[item.id]);

                    return (
                        <Paper
                            key={item.id}
                            variant="outlined"
                            sx={{
                                mb: 2,
                                bgcolor: isCompleted
                                    ? 'success.light'
                                    : 'background.paper',
                                opacity: isCompleted ? 0.9 : 1,
                            }}
                        >
                            <ListItem>
                                <Checkbox
                                    checked={isCompleted}
                                    onChange={() => handleCheckboxChange(item)}
                                    color="primary"
                                />
                                <ListItemText
                                    primary={
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <Typography
                                                variant="subtitle1"
                                                sx={{
                                                    textDecoration: isCompleted
                                                        ? 'line-through'
                                                        : 'none',
                                                    color: isCompleted
                                                        ? 'text.secondary'
                                                        : 'text.primary',
                                                }}
                                            >
                                                {index + 1}. {item.name}
                                            </Typography>
                                            {isCompleted && (
                                                <Tooltip title="Completed">
                                                    <CheckCircleIcon
                                                        color="success"
                                                        sx={{ ml: 1 }}
                                                    />
                                                </Tooltip>
                                            )}
                                            {!isCompleted &&
                                                !hasRequiredFields && (
                                                    <Tooltip title="Required fields missing">
                                                        <ErrorIcon
                                                            color="error"
                                                            sx={{ ml: 1 }}
                                                        />
                                                    </Tooltip>
                                                )}
                                        </Box>
                                    }
                                    secondary={
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: 1,
                                                mt: 1,
                                            }}
                                        >
                                            {item.geoLocationEnabled && (
                                                <Chip
                                                    icon={<LocationOnIcon />}
                                                    label="Location Required"
                                                    size="small"
                                                    color={
                                                        geolocation
                                                            ? 'success'
                                                            : 'primary'
                                                    }
                                                    variant="outlined"
                                                />
                                            )}

                                            {item.commentsOption !== 'off' && (
                                                <Chip
                                                    icon={<CommentIcon />}
                                                    label={
                                                        item.commentsOption ===
                                                        'required'
                                                            ? 'Comments Required'
                                                            : 'Comments Optional'
                                                    }
                                                    size="small"
                                                    color={
                                                        item.commentsOption ===
                                                        'required'
                                                            ? 'secondary'
                                                            : 'default'
                                                    }
                                                    variant="outlined"
                                                />
                                            )}

                                            {item.uploadOption !== 'off' && (
                                                <Chip
                                                    icon={<AttachFileIcon />}
                                                    label={
                                                        item.uploadOption ===
                                                        'required'
                                                            ? 'Upload Required'
                                                            : 'Upload Optional'
                                                    }
                                                    size="small"
                                                    color={
                                                        item.uploadOption ===
                                                        'required'
                                                            ? 'secondary'
                                                            : 'default'
                                                    }
                                                    variant="outlined"
                                                />
                                            )}
                                        </Box>
                                    }
                                />
                            </ListItem>

                            {(item.commentsOption !== 'off' ||
                                item.uploadOption !== 'off') && (
                                <Box sx={{ px: 2, pb: 2 }}>
                                    {item.commentsOption !== 'off' && (
                                        <TextField
                                            label={
                                                item.commentsOption ===
                                                'required'
                                                    ? 'Required Comments'
                                                    : 'Comments (Optional)'
                                            }
                                            fullWidth
                                            multiline
                                            rows={2}
                                            value={comments[item.id] || ''}
                                            onChange={(e) =>
                                                handleCommentChange(
                                                    item.id,
                                                    e.target.value
                                                )
                                            }
                                            margin="normal"
                                            required={
                                                item.commentsOption ===
                                                'required'
                                            }
                                            error={
                                                item.commentsOption ===
                                                    'required' &&
                                                (!comments[item.id] ||
                                                    comments[item.id].trim() ===
                                                        '')
                                            }
                                            helperText={
                                                item.commentsOption ===
                                                    'required' &&
                                                (!comments[item.id] ||
                                                    comments[item.id].trim() ===
                                                        '')
                                                    ? 'Comments are required'
                                                    : ''
                                            }
                                            disabled={isCompleted}
                                        />
                                    )}

                                    {item.uploadOption !== 'off' && (
                                        <Box sx={{ mt: 2 }}>
                                            {uploads[item.id] ? (
                                                <Alert
                                                    severity="success"
                                                    sx={{ mb: 1 }}
                                                >
                                                    File uploaded successfully
                                                </Alert>
                                            ) : (
                                                <Box>
                                                    <input
                                                        accept="*/*"
                                                        style={{ display: 'none' }}
                                                        id={`upload-file-${item.id}`}
                                                        type="file"
                                                        onChange={(e) =>
                                                            handleFileUpload(
                                                                item.id,
                                                                `${checklistData.name} - ${item.name}`,
                                                                e
                                                            )
                                                        }
                                                        disabled={isCompleted || uploading[item.id]}
                                                    />
                                                    <label
                                                        htmlFor={`upload-file-${item.id}`}
                                                    >
                                                        <Button
                                                            variant="outlined"
                                                            component="span"
                                                            startIcon={
                                                                uploading[item.id] ? (
                                                                    <CircularProgress
                                                                        size={20}
                                                                    />
                                                                ) : (
                                                                    <CloudUploadIcon />
                                                                )
                                                            }
                                                            disabled={
                                                                isCompleted || uploading[item.id]
                                                            }
                                                            color={item.uploadOption === 'required' ? "secondary" : "primary"}
                                                        >
                                                            {uploading[item.id]
                                                                ? 'Uploading...'
                                                                : item.uploadOption === 'required'
                                                                ? 'Upload Required File'
                                                                : 'Upload File'}
                                                        </Button>
                                                    </label>
                                                </Box>
                                            )}
                                        </Box>
                                    )}
                                </Box>
                            )}

                            {isCompleted && completions[item.id] && (
                                <Box
                                    sx={{
                                        px: 2,
                                        pb: 2,
                                        color: 'text.secondary',
                                    }}
                                >
                                    <Typography
                                        variant="caption"
                                        display="block"
                                    >
                                        Completed by:{' '}
                                        {completions[item.id].member?.name ||
                                            'You'}{' '}
                                        at{' '}
                                        {formatDate(
                                            completions[item.id].completedAt
                                        )}
                                    </Typography>
                                </Box>
                            )}
                        </Paper>
                    );
                })}
            </List>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button onClick={onClose} variant="contained">
                    Close
                </Button>
            </Box>

            {/* Confirm Uncheck Dialog */}
            <Dialog open={!!confirmUncheckItem} onClose={handleCancelUncheck}>
                <DialogTitle>Confirm Uncheck</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to uncheck this item? This will
                        remove any associated comments and uploads.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancelUncheck}>Cancel</Button>
                    <Button onClick={handleConfirmUncheck} color="error">
                        Uncheck
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
