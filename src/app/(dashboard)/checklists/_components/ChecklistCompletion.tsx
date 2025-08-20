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
import { useUploadFileMutation, readFileAsBase64, useUploadGroupsQuery, useCreateChecklistUploadGroupMutation, useShiftUploadsQuery, useFileUrlQuery } from '@/queries/uploads';
import LocationMap from '@/components/locations/LocationMap';
import { isFileTypeSupported, FilePreviewDialog } from '@/components/FilePreview';
import VisibilityIcon from '@mui/icons-material/Visibility';

// Component to display upload details
const UploadDetails = ({ upload }: { upload: any }) => {
    // Use the useFileUrlQuery hook at the top level of the component
    const { data } = useFileUrlQuery(upload.id);
    const [previewOpen, setPreviewOpen] = useState(false);
    const isPreviewable = upload.fileName ? isFileTypeSupported(upload.fileName) : false;

    return (
        <Box sx={{ mt: 1, p: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}>
            <Typography variant="body2" gutterBottom>
                <strong>File:</strong> {upload.fileName}
            </Typography>
            <Typography variant="body2" gutterBottom>
                <strong>Size:</strong> {(upload.fileSize / 1024).toFixed(2)} KB
            </Typography>
            <Typography variant="body2" gutterBottom>
                <strong>Type:</strong> {upload.fileType}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                {data?.url && (
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AttachFileIcon />}
                        href={data.url}
                        download
                        sx={{ mt: 1 }}
                    >
                        Download File
                    </Button>
                )}
                {data?.url && isPreviewable && (
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => setPreviewOpen(true)}
                        sx={{ mt: 1 }}
                    >
                        Preview File
                    </Button>
                )}
            </Box>

            {/* File Preview Dialog */}
            {isPreviewable && (
                <FilePreviewDialog
                    open={previewOpen}
                    onClose={() => setPreviewOpen(false)}
                    uploadId={upload.id}
                />
            )}
        </Box>
    );
};

// Component to find and display upload details
const UploadDetailsContainer = ({ 
    itemId, 
    uploadId, 
    shiftUploads 
}: { 
    itemId: string; 
    uploadId: string; 
    shiftUploads: any[] 
}) => {
    if (!uploadId) return null;

    // Find the group upload that contains this upload
    const groupUpload = shiftUploads.find(g => g.upload && g.upload.id === uploadId);
    if (!groupUpload || !groupUpload.upload) {
        console.log(`No matching upload found for item ${itemId} with uploadId ${uploadId}`);
        return null;
    }

    const upload = groupUpload.upload;
    console.log(`Found matching upload for item ${itemId}:`, upload);

    return <UploadDetails upload={upload} />;
};

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
    const [locationModalOpen, setLocationModalOpen] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<{
        latitude: number;
        longitude: number;
        itemName: string;
    } | null>(null);

    const notifications = useNotifications();

    // Upload file mutation
    const uploadFileMutation = useUploadFileMutation();

    // Get upload groups
    const { data: uploadGroups = [], refetch: refetchUploadGroups } = useUploadGroupsQuery();

    // Create checklist upload group mutation
    const createChecklistUploadGroupMutation = useCreateChecklistUploadGroupMutation();

    // Get uploads for the shift
    const { data: shiftUploads = [], refetch: refetchShiftUploads } = useShiftUploadsQuery(shift.id);

    // Fetch checklist completions for the shift
    const {
        data: checklistData,
        isLoading,
        error,
        refetch,
    } = trpc.checklists.getShiftCompletions.useQuery({ shiftId: shift.id });

    // Log shift uploads whenever they change and update uploads state
    useEffect(() => {
        console.log("shiftUploads data updated:", shiftUploads);

        // If we have shift uploads, update the uploads state to include them
        if (shiftUploads && shiftUploads.length > 0) {
            // Find all checklist items that require uploads
            const itemsWithRequiredUploads = checklistData?.items.filter(
                item => item.uploadOption === 'required'
            ) || [];

            // Check if we have any uploads that aren't already in the uploads state
            const newUploads: Record<string, string> = { ...uploads };
            let hasNewUploads = false;

            // For each upload in shiftUploads
            shiftUploads.forEach(groupUpload => {
                if (groupUpload.upload) {
                    console.log("Found upload in shiftUploads:", groupUpload.upload);

                    // Check if this upload is already associated with an item
                    const isAlreadyAssociated = Object.values(uploads).includes(groupUpload.upload.id);

                    // If not already associated and we have items that need uploads
                    if (!isAlreadyAssociated && itemsWithRequiredUploads.length > 0) {
                        // Find the first item that needs an upload and doesn't have one yet
                        const itemToAssociate = itemsWithRequiredUploads.find(
                            item => !uploads[item.id] && !completions[item.id]
                        );

                        if (itemToAssociate) {
                            console.log(`Associating upload ${groupUpload.upload.id} with item ${itemToAssociate.id}`);
                            newUploads[itemToAssociate.id] = groupUpload.upload.id;
                            hasNewUploads = true;
                        }
                    }
                }
            });

            // Update uploads state if we found new uploads
            if (hasNewUploads) {
                console.log("Updating uploads state with new uploads:", newUploads);
                setUploads(newUploads);
            }
        }
    }, [shiftUploads, checklistData, uploads, completions]);

    // Handle file upload
    const handleFileUpload = async (
        itemId: string,
        uploadName: string,
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        console.log(`handleFileUpload called for item ${itemId}`, { uploadName });
        const file = event.target.files?.[0];
        if (!file) return;

        console.log("File selected:", { name: file.name, size: file.size, type: file.type });

        try {
            setUploading((prev) => ({ ...prev, [itemId]: true }));

            // Read file as base64
            const fileData = await readFileAsBase64(file);
            console.log("File read as base64 (truncated):", fileData.substring(0, 50) + "...");

            // Find an appropriate upload group
            let uploadGroupId = "";

            console.log("Available upload groups:", uploadGroups);

            // First, try to find a group with "checklist" in the name
            const checklistGroup = uploadGroups.find(group => 
                group.uploadName.toLowerCase().includes('checklist')
            );

            // If not found, use the first available group
            if (checklistGroup) {
                uploadGroupId = checklistGroup.id;
                console.log("Using checklist upload group:", checklistGroup);
            } else if (uploadGroups.length > 0) {
                uploadGroupId = uploadGroups[0].id;
                console.log("Using first available upload group:", uploadGroups[0]);
            } else {
                console.log("No upload groups available, attempting to create one");
                // No upload groups available - try to create a default checklist upload group
                try {
                    notifications.show("No upload groups found. Creating a default checklist upload group...", { severity: 'info', autoHideDuration: 3000 });

                    const newGroup = await createChecklistUploadGroupMutation.mutateAsync();
                    console.log("Created new upload group:", newGroup);

                    if (newGroup && newGroup.id) {
                        uploadGroupId = newGroup.id;
                        // Refresh the upload groups list
                        await refetchUploadGroups();
                        notifications.show("Created a default checklist upload group.", { severity: 'success', autoHideDuration: 3000 });
                    } else {
                        throw new Error("Failed to create a default checklist upload group.");
                    }
                } catch (error: any) {
                    console.error('Error creating checklist upload group:', error);
                    notifications.show(
                        "No upload groups available and failed to create a default one. Please ask an administrator to set up upload groups in the Business Settings page.",
                        { severity: 'error', autoHideDuration: 3000 }
                    );
                    throw new Error("No upload groups available. Please ask an administrator to set up upload groups in the Business Settings page.");
                }
            }

            console.log("Uploading file with params:", {
                shiftId: shift.id,
                uploadGroupId,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
            });

            // Upload file
            const result = await uploadFileMutation.mutateAsync({
                shiftId: shift.id,
                uploadGroupId: uploadGroupId,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                fileData,
            });

            console.log("Upload result:", result);

            // Handle successful upload
            if (result?.id) {
                handleFileUploaded(itemId, result.id);
                notifications.show(`File uploaded successfully`, { severity: 'success', autoHideDuration: 3000 });
            }
        } catch (error: any) {
            console.error('Error uploading file:', error);
            notifications.show(`Failed to upload file: ${error.message}`, { severity: 'error', autoHideDuration: 3000 });
        } finally {
            setUploading((prev) => ({ ...prev, [itemId]: false }));
            // Clear the file input
            event.target.value = '';
        }
    };

    // Complete checklist item mutation
    const completeItemMutation = trpc.checklists.completeItem.useMutation({
        onSuccess: (data, variables) => {
            console.log("completeItemMutation succeeded:", { data, variables });
            refetch();
            notifications.show('Item updated successfully', { severity: 'success', autoHideDuration: 3000 });
        },
        onError: (error, variables) => {
            console.error("completeItemMutation failed:", { error, variables });
            notifications.show(`Error updating item: ${error.message}`, { severity: 'error', autoHideDuration: 3000 });
        },
    });

    // Initialize completions, comments, and uploads from fetched data
    useEffect(() => {
        if (checklistData) {
            console.log("Initializing from checklistData:", checklistData);
            const newCompletions: Record<string, any> = {};
            const newComments: Record<string, string> = {};
            const newUploads: Record<string, string> = {};

            checklistData.items.forEach((item) => {
                console.log(`Processing item ${item.id} (${item.name}):`, item);
                if (item.completions && item.completions.length > 0) {
                    const completion = item.completions[0];
                    console.log(`Found completion for item ${item.id}:`, completion);
                    newCompletions[item.id] = completion;
                    if (completion.comments) {
                        newComments[item.id] = completion.comments;
                    }
                    if (completion.uploadId) {
                        console.log(`Found uploadId for item ${item.id}:`, completion.uploadId);
                        newUploads[item.id] = completion.uploadId;
                    }
                }
            });

            console.log("Setting state with:", {
                completions: newCompletions,
                comments: newComments,
                uploads: newUploads
            });
            setCompletions(newCompletions);
            setComments(newComments);
            setUploads(newUploads);
        }
    }, [checklistData]);

    // Automatically get geolocation when component mounts
    useEffect(() => {
        getGeolocation();
    }, []);

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
                    notifications.show(
                        `Error getting location: ${error.message}`,
                        { severity: 'error', autoHideDuration: 3000 }
                    );
                }
            );
        } else {
            setGeoError('Geolocation is not supported by this browser');
            notifications.show('Geolocation is not supported by this browser', { severity: 'error', autoHideDuration: 3000 });
        }
    };

    // Handle checkbox change
    const handleCheckboxChange = (item: any) => {
        console.log(`handleCheckboxChange called for item ${item.id} (${item.name})`);
        const isCompleted = !!completions[item.id];
        console.log(`Item is currently ${isCompleted ? 'completed' : 'not completed'}`);

        if (isCompleted) {
            // If unchecking, show confirmation dialog
            console.log("Showing confirmation dialog for unchecking item");
            setConfirmUncheckItem(item.id);
        } else {
            // If checking, validate required fields
            let canComplete = true;
            console.log("Validating required fields for item:", {
                commentsOption: item.commentsOption,
                hasComments: !!comments[item.id],
                uploadOption: item.uploadOption,
                hasUpload: !!uploads[item.id],
                geoLocationEnabled: item.geoLocationEnabled,
                hasGeolocation: !!geolocation
            });

            // Check if comments are required but missing
            if (
                item.commentsOption === 'required' &&
                (!comments[item.id] || comments[item.id].trim() === '')
            ) {
                console.log("Comments are required but missing");
                notifications.show('Comments are required for this item', { severity: 'error', autoHideDuration: 3000 });
                canComplete = false;
            }

            // Check if upload is required but missing
            if (item.uploadOption === 'required' && !uploads[item.id]) {
                console.log("Upload is required but missing");
                console.log("Current uploads state:", uploads);
                notifications.show('File upload is required for this item', { severity: 'error', autoHideDuration: 3000 });
                canComplete = false;
            }

            // Get geolocation if needed
            if (item.geoLocationEnabled && !geolocation) {
                console.log("Geolocation is required but missing, requesting it now");
                getGeolocation();
            }

            if (canComplete) {
                console.log("All validation passed, completing item with:", {
                    itemId: item.id,
                    shiftId: shift.id,
                    completed: true,
                    latitude: geolocation?.latitude,
                    longitude: geolocation?.longitude,
                    comments: comments[item.id],
                    uploadId: uploads[item.id],
                });

                completeItemMutation.mutate({
                    itemId: item.id,
                    shiftId: shift.id,
                    completed: true,
                    latitude: geolocation?.latitude,
                    longitude: geolocation?.longitude,
                    comments: comments[item.id],
                    uploadId: uploads[item.id],
                });
            } else {
                console.log("Validation failed, cannot complete item");
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
        console.log(`handleFileUploaded called for item ${itemId} with uploadId ${uploadId}`);

        console.log("Current uploads state before update:", uploads);
        setUploads((prev) => {
            const newUploads = {
                ...prev,
                [itemId]: uploadId,
            };
            console.log("New uploads state:", newUploads);
            return newUploads;
        });

        // If the item is already completed, update it with the new upload
        if (completions[itemId]) {
            console.log(`Item ${itemId} is already completed, updating with new upload:`, {
                itemId,
                shiftId: shift.id,
                completed: true,
                latitude: completions[itemId].latitude,
                longitude: completions[itemId].longitude,
                comments: comments[itemId],
                uploadId,
            });

            completeItemMutation.mutate({
                itemId: itemId,
                shiftId: shift.id,
                completed: true,
                latitude: completions[itemId].latitude,
                longitude: completions[itemId].longitude,
                comments: comments[itemId],
                uploadId: uploadId,
            });
        } else {
            console.log(`Item ${itemId} is not completed yet. Upload has been associated but item needs to be checked.`);
        }

        // Refresh the shift uploads to show the new upload
        console.log("Refreshing shift uploads...");
        refetchShiftUploads();
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

            {/* Map button section at the top of the checklist */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, mt: 1 }}>
                <LocationOnIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    {geolocation ? 
                        `Current location: ${geolocation.latitude.toFixed(6)}, ${geolocation.longitude.toFixed(6)}` : 
                        "Getting your location..."}
                </Typography>

                {/* View map button - only visible when geolocation is available */}
                {geolocation && (
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<LocationOnIcon />}
                        onClick={() => {
                            setSelectedLocation({
                                latitude: geolocation.latitude,
                                longitude: geolocation.longitude,
                                itemName: "Current Location"
                            });
                            setLocationModalOpen(true);
                        }}
                        size="small"
                        sx={{ ml: 2 }}
                    >
                        View Map
                    </Button>
                )}
            </Box>

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
                    const isCompleted = !!completions[item.id] && completions[item.id].completed === true;
                    // Check if all required fields are filled
                    const hasComments = comments[item.id] && comments[item.id].trim() !== '';
                    const hasUpload = !!uploads[item.id];

                    // Get unassociated uploads before checking hasUploadInShiftUploads
                    const unassociatedUploads = shiftUploads.filter(groupUpload => 
                        groupUpload.upload && !Object.values(uploads).includes(groupUpload.upload.id)
                    );

                    // Check if there's an upload in shiftUploads that matches this item's upload ID
                    const hasUploadInShiftUploads = (
                        // Either the item already has an upload ID and it exists in shiftUploads
                        (uploads[item.id] && shiftUploads.some(groupUpload => 
                            groupUpload.upload && groupUpload.upload.id === uploads[item.id]
                        )) ||
                        // Or there's an unassociated upload in shiftUploads and this item requires an upload
                        (item.uploadOption === 'required' && !uploads[item.id] && unassociatedUploads.length > 0)
                    );

                    // If the item is already completed, it has all required fields
                    const isAlreadyCompleted = isCompleted;

                    const hasRequiredFields = isAlreadyCompleted || (
                        // Check if required comments are filled
                        (item.commentsOption !== 'required' || hasComments) &&
                        // Check if required upload is present (either in uploads state or in shiftUploads)
                        (item.uploadOption !== 'required' || hasUpload || hasUploadInShiftUploads)
                    );

                    // Reusing unassociatedUploads from above

                    // If this item requires an upload and doesn't have one yet, but there are unassociated uploads,
                    // automatically associate the first unassociated upload with this item
                    if (item.uploadOption === 'required' && !uploads[item.id] && unassociatedUploads.length > 0 && !isCompleted) {
                        const uploadToAssociate = unassociatedUploads[0].upload;
                        if (uploadToAssociate) {
                            console.log(`Auto-associating upload ${uploadToAssociate.id} with item ${item.id}`);

                            // Update the uploads state
                            setTimeout(() => {
                                setUploads(prev => ({
                                    ...prev,
                                    [item.id]: uploadToAssociate.id
                                }));
                            }, 0);
                        }
                    }

                    console.log(`hasRequiredFields for item ${item.id} (${item.name}):`, {
                        hasRequiredFields,
                        isAlreadyCompleted,
                        commentsOption: item.commentsOption,
                        hasComments,
                        uploadOption: item.uploadOption,
                        hasUpload,
                        hasUploadInShiftUploads,
                        uploadId: uploads[item.id],
                        uploads,
                        shiftUploadsCount: shiftUploads.length,
                        shiftUploadsWithUpload: shiftUploads.filter(g => g.upload).length,
                        unassociatedUploadsCount: unassociatedUploads.length,
                        unassociatedUploads: unassociatedUploads.map(g => g.upload?.id)
                    });

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
                                <Tooltip title={!isCompleted && hasRequiredFields ? "Click to mark as completed" : ""}>
                                    <Checkbox
                                        checked={isCompleted}
                                        onChange={() => handleCheckboxChange(item)}
                                        color={!isCompleted && hasRequiredFields ? "success" : "primary"}
                                        sx={{
                                            '&:hover': {
                                                backgroundColor: !isCompleted && hasRequiredFields ? 'rgba(76, 175, 80, 0.1)' : undefined,
                                            },
                                            animation: !isCompleted && hasRequiredFields ? 'pulse 1.5s infinite' : 'none',
                                            '@keyframes pulse': {
                                                '0%': { boxShadow: '0 0 0 0 rgba(76, 175, 80, 0.4)' },
                                                '70%': { boxShadow: '0 0 0 10px rgba(76, 175, 80, 0)' },
                                                '100%': { boxShadow: '0 0 0 0 rgba(76, 175, 80, 0)' },
                                            },
                                        }}
                                    />
                                </Tooltip>
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
                                            {isCompleted && completions[item.id] && completions[item.id].latitude && completions[item.id].longitude && item.geoLocationEnabled && (
                                                <Tooltip title="View location where this item was completed">
                                                    <Button
                                                        variant="outlined"
                                                        size="small"
                                                        startIcon={<LocationOnIcon />}
                                                        color="primary"
                                                        sx={{ 
                                                            ml: 1,
                                                            borderColor: 'primary.main',
                                                            backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                                            '&:hover': {
                                                                backgroundColor: 'rgba(25, 118, 210, 0.15)',
                                                            }
                                                        }}
                                                        onClick={() => {
                                                            setSelectedLocation({
                                                                latitude: completions[item.id].latitude,
                                                                longitude: completions[item.id].longitude,
                                                                itemName: item.name
                                                            });
                                                            setLocationModalOpen(true);
                                                        }}
                                                    >
                                                        View Map
                                                    </Button>
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
                                />
                            </ListItem>

                            {/* Chips section - moved outside of ListItemText to avoid nesting div in p */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 1,
                                    mt: 1,
                                    ml: 9, // Align with the text above
                                    mb: 1,
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
                                                <Box>
                                                    <Alert
                                                        severity="success"
                                                        sx={{ mb: 1 }}
                                                    >
                                                        File uploaded successfully. {!isCompleted && item.uploadOption === 'required' && "You can now check this item."}
                                                    </Alert>
                                                    {/* Display uploaded file details */}
                                                    {console.log(`Rendering uploads for item ${item.id}:`, { 
                                                        uploadId: uploads[item.id], 
                                                        shiftUploads
                                                    })}

                                                    {/* Display upload details using the container component */}
                                                    <UploadDetailsContainer 
                                                        itemId={item.id} 
                                                        uploadId={uploads[item.id]} 
                                                        shiftUploads={shiftUploads} 
                                                    />
                                                </Box>
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

            {/* Location Map Modal */}
            <Dialog 
                open={locationModalOpen} 
                onClose={() => setLocationModalOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    Location Map: {selectedLocation?.itemName === "Current Location" 
                        ? "Your Current Location" 
                        : `Where "${selectedLocation?.itemName}" was completed`}
                </DialogTitle>
                <DialogContent>
                    {selectedLocation && (
                        <Box sx={{ py: 2 }}>
                            <Typography variant="body2" gutterBottom>
                                Coordinates: {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                            </Typography>
                            <Box sx={{ mt: 2, height: 400 }}>
                                <LocationMap 
                                    latitude={selectedLocation.latitude}
                                    longitude={selectedLocation.longitude}
                                    zoom={15}
                                    height={400}
                                    popupContent={selectedLocation.itemName}
                                />
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setLocationModalOpen(false)}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
