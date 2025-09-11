import React, { useState, useEffect } from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
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
    Skeleton, // Add Skeleton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CommentIcon from '@mui/icons-material/Comment';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { trpc } from '@/lib/trpc/client';
import { useNotifications } from '@/components/providers/NotificationsProvider';
import dayjs from 'dayjs';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import {
    useUploadFileMutation,
    readFileAsBase64,
    useUploadGroupsQuery,
    useCreateChecklistUploadGroupMutation,
    useShiftUploadsQuery,
    useFileUrlQuery,
    useDeleteFileMutation,
} from '@/queries/uploads';
import LocationMap from '@/components/locations/LocationMap';
import {
    isFileTypeSupported,
    FilePreviewDialog,
} from '@/components/FilePreview';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';

// Component to display upload details
const UploadDetails = ({ upload, itemId, setUploads, completeItemMutation, completions, shift, refetchChecklistData, refetchShiftUploads, notifications, deleteFileMutation, isClearingFile, setIsClearingFile }: {
    upload: any;
    itemId: string;
    setUploads: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    completeItemMutation: any;
    completions: Record<string, any>;
    shift: any;
    refetchChecklistData: () => void;
    refetchShiftUploads: () => void;
    notifications: any;
    deleteFileMutation: any;
    isClearingFile: boolean;
    setIsClearingFile: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) => {
    // Use the useFileUrlQuery hook at the top level of the component
    const { data } = useFileUrlQuery(upload.id);
    const [previewOpen, setPreviewOpen] = useState(false);
    const isPreviewable = upload.fileName
        ? isFileTypeSupported(upload.fileName)
        : false;

    const handleClearFile = async () => {
        setIsClearingFile((prev) => ({ ...prev, [itemId]: true })); // Set clearing status to true

        // Update local state immediately for responsiveness
        setUploads((prev) => {
            const newUploads = { ...prev };
            delete newUploads[itemId];
            return newUploads;
        });

        try {
            // Determine current completion status and other details
            const currentCompletion = completions[itemId];
            const isCurrentlyCompleted = !!currentCompletion;

            const mutationPayload: any = {
                itemId: itemId,
                shiftId: shift.id, // Use shift.id from ChecklistCompletion props
                completed: isCurrentlyCompleted, // Maintain current completion status
                uploadId: undefined, // Explicitly clear the uploadId
            };

            // Include comments, latitude, longitude if they exist in the current completion
            if (currentCompletion) {
                if (currentCompletion.comments) {
                    mutationPayload.comments = currentCompletion.comments;
                }
                if (currentCompletion.latitude !== null && currentCompletion.latitude !== undefined) {
                    mutationPayload.latitude = currentCompletion.latitude;
                }
                if (currentCompletion.longitude !== null && currentCompletion.longitude !== undefined) {
                    mutationPayload.longitude = currentCompletion.longitude;
                }
            }

            await completeItemMutation.mutateAsync(mutationPayload);

            // Now, delete the actual upload record
            if (upload.id) { // Ensure upload.id exists before attempting to delete
                await deleteFileMutation.mutateAsync({ uploadId: upload.id });
            }

            // Refetch data to ensure UI is consistent with backend
            refetchChecklistData(); // Refetch checklistData
            refetchShiftUploads(); // Refetch shiftUploads

            notifications.show('File cleared successfully', {
                severity: 'success',
                autoHideDuration: 3000,
            });

        } catch (error: any) {
            console.error('Error clearing file:', error);
            notifications.show(`Failed to clear file: ${error.message}`, {
                severity: 'error',
                autoHideDuration: 3000,
            });
            // Revert local state if mutation fails
            setUploads((prev) => ({ ...prev, [itemId]: upload.id }));
        } finally {
            setIsClearingFile((prev) => ({ ...prev, [itemId]: false })); // Always set to false when done
        }
    };

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
                {/* New Clear File Button */}
                {upload && !completions[itemId] && ( // Only show if there's an upload and the item is not completed
                    <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={handleClearFile}
                        sx={{ mt: 1 }}
                    >
                        Clear File
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
    shiftUploads,
    setUploads,
    completeItemMutation,
    completions,
    shift,
    refetchChecklistData,
    refetchShiftUploads,
    notifications,
    deleteFileMutation,
    isClearingFile,
    setIsClearingFile,
}: {
    itemId: string;
    uploadId: string;
    shiftUploads: any[];
    setUploads: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    completeItemMutation: any;
    completions: Record<string, any>;
    shift: any;
    refetchChecklistData: () => void;
    refetchShiftUploads: () => void;
    notifications: any;
    deleteFileMutation: any;
    isClearingFile: boolean;
    setIsClearingFile: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) => {
    if (!uploadId) return null;

    // Find the group upload that contains this upload
    const groupUpload = shiftUploads.find(
        (g) => g.upload && g.upload.id === uploadId
    );
    if (!groupUpload || !groupUpload.upload) {
        console.log(
            `No matching upload found for item ${itemId} with uploadId ${uploadId}`
        );
        return null;
    }

    const upload = groupUpload.upload;
    console.log(`Found matching upload for item ${itemId}:`, upload);

    return (
        <UploadDetails
            upload={upload}
            itemId={itemId}
            setUploads={setUploads}
            completeItemMutation={completeItemMutation}
            completions={completions}
            shift={shift}
            refetchChecklistData={refetchChecklistData}
            refetchShiftUploads={refetchShiftUploads}
            notifications={notifications}
            deleteFileMutation={deleteFileMutation}
            isClearingFile={isClearingFile}
            setIsClearingFile={setIsClearingFile}
        />
    );
};

// Component to display a download icon and handle download logic
const DownloadIcon = ({
    uploadId,
    upload,
}: {
    uploadId: string;
    upload: any;
}) => {
    const { data } = useFileUrlQuery(uploadId);
    const [previewOpen, setPreviewOpen] = useState(false);
    const isPreviewable = upload?.fileName
        ? isFileTypeSupported(upload.fileName)
        : false;

    const handleIconClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent accordion from toggling
        if (data?.url) {
            if (isPreviewable) {
                setPreviewOpen(true);
            } else {
                window.open(data.url, '_blank');
            }
        }
    };

    if (!data?.url) {
        return (
            <CloudUploadIcon
                sx={{ color: 'text.secondary', ml: 1, cursor: 'not-allowed' }}
            />
        );
    }

    return (
        <>
            <Tooltip title={isPreviewable ? 'Preview File' : 'Download File'}>
                <Box
                    onClick={handleIconClick}
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        width: 24, // Approximate size of small IconButton
                        height: 24, // Approximate size of small IconButton
                        cursor: 'pointer',
                        ml: 1,
                        '&:hover': {
                            bgcolor: 'action.hover', // Mimic hover effect
                        },
                    }}
                    aria-label={
                        isPreviewable ? 'Preview File' : 'Download File'
                    }
                >
                    {isPreviewable ? (
                        <VisibilityIcon fontSize="small" color="action" />
                    ) : (
                        <FileDownloadIcon fontSize="small" color="action" />
                    )}
                </Box>
            </Tooltip>

            {/* File Preview Dialog */}
            {isPreviewable && (
                <FilePreviewDialog
                    open={previewOpen}
                    onClose={() => setPreviewOpen(false)}
                    uploadId={uploadId}
                />
            )}
        </>
    );
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
    const [expanded, setExpanded] = useState<string | false>(false);
    const [isClearingFile, setIsClearingFile] = useState<Record<string, boolean>>({}); // State to track clearing status per item

    const notifications = useNotifications();

    // Upload file mutation
    const uploadFileMutation = useUploadFileMutation();

    // Get upload groups
    const { data: uploadGroups = [], refetch: refetchUploadGroups } =
        useUploadGroupsQuery({ includeInactiveChecklistGroup: true });
    console.log('Current uploadGroups state:', uploadGroups);

    // Create checklist upload group mutation
    const createChecklistUploadGroupMutation =
        useCreateChecklistUploadGroupMutation();

    // Delete file mutation
    const deleteFileMutation = useDeleteFileMutation();

    // Get uploads for the shift
    const { data: shiftUploads = [], refetch: refetchShiftUploads } =
        useShiftUploadsQuery(shift.id);

    // Fetch checklist completions for the shift
    const {
        data: checklistData,
        isLoading,
        error,
        refetch,
    } = trpc.checklists.getShiftCompletions.useQuery({ shiftId: shift.id });

    // Initialize completions, comments, and uploads from fetched data
    useEffect(() => {
        if (checklistData) {
            console.log('Initializing from checklistData:', checklistData);
            const newCompletions: Record<string, any> = {};
            const newComments: Record<string, string> = {};
            const newUploads: Record<string, string> = {}; // This will be our source of truth for uploads

            checklistData.items.forEach((item) => {
                console.log(`Processing item ${item.id} (${item.name}):`, item);
                if (item.completions && item.completions.length > 0) {
                    const completion = item.completions[0];
                    console.log(
                        `Found completion for item ${item.id}:`,
                        completion
                    );
                    newCompletions[item.id] = completion;
                    if (completion.comments) {
                        newComments[item.id] = completion.comments;
                    }
                    // Only set uploadId if the upload actually exists in shiftUploads and is not deleted
                    const associatedUpload = shiftUploads.find(
                        (groupUpload) =>
                            groupUpload.upload &&
                            groupUpload.upload.id === completion.uploadId
                    );
                    if (associatedUpload && associatedUpload.upload) {
                        console.log(
                            `Found uploadId for item ${item.id} in shiftUploads:`,
                            completion.uploadId
                        );
                        newUploads[item.id] = completion.uploadId!;
                    } else {
                        // If completion has an uploadId but the upload is not in shiftUploads (e.g., deleted), clear it
                        console.log(
                            `Upload for item ${item.id} (ID: ${completion.uploadId}) not found in shiftUploads, clearing.`
                        );
                        delete newUploads[item.id]; // Ensure it's not carried over
                    }
                }
            });

            // Now, handle unassociated uploads from shiftUploads
            // This part is for associating newly uploaded files that aren't yet linked to a completion
            const itemsWithRequiredUploads =
                checklistData?.items.filter(
                    (item) => item.uploadOption === 'required'
                ) || [];

            shiftUploads.forEach((groupUpload) => {
                if (groupUpload.upload) {
                    // Check if this upload is already associated with an item in newUploads
                    const isAlreadyAssociated = Object.values(
                        newUploads
                    ).includes(groupUpload.upload.id);

                    // If not already associated and we have items that need uploads
                    if (
                        !isAlreadyAssociated &&
                        itemsWithRequiredUploads.length > 0
                    ) {
                        // Find the first item that needs an upload and doesn't have one yet
                        const itemToAssociate = itemsWithRequiredUploads.find(
                            (item) =>
                                !newUploads[item.id] && !newCompletions[item.id]
                        );

                        if (itemToAssociate) {
                            console.log(
                                `Associating unassociated upload ${groupUpload.upload.id} with item ${itemToAssociate.id}`
                            );
                            newUploads[itemToAssociate.id] =
                                groupUpload.upload.id;
                        }
                    }
                }
            });

            console.log('Setting state with:', {
                completions: newCompletions,
                comments: newComments,
                uploads: newUploads,
            });
            setCompletions(newCompletions);
            setComments(newComments);
            setUploads(newUploads);
        }
    }, [checklistData, shiftUploads]);

    // Handle file upload
    const handleFileUpload = async (
        itemId: string,
        uploadName: string,
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        console.log(`handleFileUpload called for item ${itemId}`, {
            uploadName,
        });
        const file = event.target.files?.[0];
        if (!file) return;

        console.log('File selected:', {
            name: file.name,
            size: file.size,
            type: file.type,
        });

        try {
            setUploading((prev) => ({ ...prev, [itemId]: true }));

            // Read file as base64
            const fileData = await readFileAsBase64(file);
            console.log(
                'File read as base64 (truncated):',
                fileData.substring(0, 50) + '...'
            );

            let currentUploadGroupId = '';

            console.log('handleFileUpload: Starting. Current uploadGroups:', uploadGroups); // Added

            // Always call createChecklistUploadGroupMutation to ensure the group is active or created
            console.log('handleFileUpload: Ensuring checklist upload group is active or created.');
            notifications.show(
                'Ensuring checklist upload group is ready...',
                { severity: 'info', autoHideDuration: 3000 }
            );
            try {
                const ensuredGroup = await createChecklistUploadGroupMutation.mutateAsync();
                if (ensuredGroup && ensuredGroup.id) {
                    currentUploadGroupId = ensuredGroup.id;
                    console.log('handleFileUpload: Ensured checklist upload group:', ensuredGroup);
                    await refetchUploadGroups(); // Refresh the upload groups list to reflect any changes
                    notifications.show(
                        'Checklist upload group ready.',
                        { severity: 'success', autoHideDuration: 3000 }
                    );
                } else {
                    throw new Error('Failed to ensure checklist upload group: Invalid response.');
                }
            } catch (groupError: any) {
                console.error('handleFileUpload: Error ensuring checklist upload group:', groupError);
                notifications.show(
                    `Failed to prepare upload group: ${groupError.message}`,
                    { severity: 'error', autoHideDuration: 5000 }
                );
                throw new Error('Failed to prepare checklist upload group.');
            }

            // If for some reason currentUploadGroupId is still empty, throw an error
            if (!currentUploadGroupId) {
                console.error('handleFileUpload: currentUploadGroupId is empty before uploadFileMutation.'); // Added
                throw new Error('Failed to determine a valid upload group for checklist upload.');
            }

            console.log('handleFileUpload: Final uploadGroupId before mutation:', currentUploadGroupId); // Added

            console.log('Uploading file with params:', {
                shiftId: shift.id,
                uploadGroupId: currentUploadGroupId,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
            });

            // Upload file
            const result = await uploadFileMutation.mutateAsync({
                shiftId: shift.id,
                uploadGroupId: currentUploadGroupId,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                fileData,
            });

            console.log('Upload result:', result);

            // Handle successful upload
            if (result?.upload?.id) {
                handleFileUploaded(itemId, result.upload.id);
                notifications.show(`File uploaded successfully`, {
                    severity: 'success',
                    autoHideDuration: 3000,
                });
            }
        } catch (error: any) {
            console.error('Error uploading file:', error);
            notifications.show(`Failed to upload file: ${error.message}`, {
                severity: 'error',
                autoHideDuration: 3000,
            });
        } finally {
            setUploading((prev) => ({ ...prev, [itemId]: false }));
            // Clear the file input
            event.target.value = '';
        }
    };

    // Complete checklist item mutation
    const completeItemMutation = trpc.checklists.completeItem.useMutation({
        onSuccess: (data, variables) => {
            console.log('completeItemMutation succeeded:', { data, variables });
            refetch();
            notifications.show('Item updated successfully', {
                severity: 'success',
                autoHideDuration: 3000,
            });
        },
        onError: (error, variables) => {
            console.error('completeItemMutation failed:', { error, variables });
            notifications.show(`Error updating item: ${error.message}`, {
                severity: 'error',
                autoHideDuration: 3000,
            });
        },
    });

    // Initialize completions, comments, and uploads from fetched data
    useEffect(() => {
        if (checklistData) {
            console.log('Initializing from checklistData:', checklistData);
            const newCompletions: Record<string, any> = {};
            const newComments: Record<string, string> = {};
            const newUploads: Record<string, string> = {};

            checklistData.items.forEach((item) => {
                console.log(`Processing item ${item.id} (${item.name}):`, item);
                if (item.completions && item.completions.length > 0) {
                    const completion = item.completions[0];
                    console.log(
                        `Found completion for item ${item.id}:`,
                        completion
                    );
                    newCompletions[item.id] = completion;
                    if (completion.comments) {
                        newComments[item.id] = completion.comments;
                    }
                    if (completion.uploadId) {
                        console.log(
                            `Found uploadId for item ${item.id}:`,
                            completion.uploadId
                        );
                        newUploads[item.id] = completion.uploadId;
                    }
                }
            });

            console.log('Setting state with:', {
                completions: newCompletions,
                comments: newComments,
                uploads: newUploads,
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
            notifications.show('Geolocation is not supported by this browser', {
                severity: 'error',
                autoHideDuration: 3000,
            });
        }
    };

    // Handle checkbox change
    const handleCheckboxChange = (item: any) => {
        console.log(
            `handleCheckboxChange called for item ${item.id} (${item.name})`
        );
        const isCompleted = !!completions[item.id];
        console.log(
            `Item is currently ${isCompleted ? 'completed' : 'not completed'}`
        );

        if (isCompleted) {
            // If unchecking, show confirmation dialog
            console.log('Showing confirmation dialog for unchecking item');
            setConfirmUncheckItem(item.id);
        } else {
            // If checking, validate required fields
            let canComplete = true;
            console.log('Validating required fields for item:', {
                commentsOption: item.commentsOption,
                hasComments: !!comments[item.id],
                uploadOption: item.uploadOption,
                hasUpload: !!uploads[item.id],
                geoLocationEnabled: item.geoLocationEnabled,
                hasGeolocation: !!geolocation,
            });

            // Check if comments are required but missing
            if (
                item.commentsOption === 'required' &&
                (!comments[item.id] || comments[item.id].trim() === '')
            ) {
                console.log('Comments are required but missing');
                notifications.show('Comments are required for this item', {
                    severity: 'error',
                    autoHideDuration: 3000,
                });
                canComplete = false;
            }

            // Check if upload is required but missing
            if (item.uploadOption === 'required' && !uploads[item.id]) {
                console.log('Upload is required but missing');
                console.log('Current uploads state:', uploads);
                notifications.show('File upload is required for this item', {
                    severity: 'error',
                    autoHideDuration: 3000,
                });
                canComplete = false;
            }

            // Get geolocation if needed
            if (item.geoLocationEnabled && !geolocation) {
                console.log(
                    'Geolocation is required but missing, requesting it now'
                );
                getGeolocation();
            }

            if (canComplete) {
                console.log('All validation passed, completing item with:', {
                    itemId: item.id,
                    shiftId: shift.id,
                    completed: true,
                    latitude: geolocation?.latitude,
                    longitude: geolocation?.longitude,
                    comments: comments[item.id],
                    uploadId: uploads[item.id],
                });

                const mutationPayload: any = {
                    itemId: item.id,
                    shiftId: shift.id,
                    completed: true,
                };

                if (item.geoLocationEnabled && geolocation) {
                    mutationPayload.latitude = geolocation.latitude;
                    mutationPayload.longitude = geolocation.longitude;
                }

                if (comments[item.id]) {
                    mutationPayload.comments = comments[item.id];
                }

                if (uploads[item.id]) {
                    mutationPayload.uploadId = uploads[item.id];
                }

                completeItemMutation.mutate(mutationPayload);
            } else {
                console.log('Validation failed, cannot complete item');
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
        console.log(
            `handleFileUploaded called for item ${itemId} with uploadId ${uploadId}`
        );

        console.log('Current uploads state before update:', uploads);
        setUploads((prev) => {
            const newUploads = {
                ...prev,
                [itemId]: uploadId,
            };
            console.log('New uploads state:', newUploads);
            return newUploads;
        });

        // If the item is already completed, update it with the new upload
        if (completions[itemId]) {
            // Find the item to check if geoLocationEnabled is true
            const item = checklistData?.items.find((i) => i.id === itemId);

            const mutationPayload: any = {
                itemId: itemId,
                shiftId: shift.id,
                completed: true,
            };

            if (item?.geoLocationEnabled && completions[itemId]) {
                mutationPayload.latitude = completions[itemId].latitude;
                mutationPayload.longitude = completions[itemId].longitude;
            }

            if (comments[itemId]) {
                mutationPayload.comments = comments[itemId];
            }

            mutationPayload.uploadId = uploadId; // uploadId is always a string here

            completeItemMutation.mutate(mutationPayload);

            console.log(
                `Item ${itemId} is already completed, updating with new upload:`,
                mutationPayload
            );

            completeItemMutation.mutate(mutationPayload);
        } else {
            console.log(
                `Item ${itemId} is not completed yet. Upload has been associated but item needs to be checked.`
            );
        }

        // Refresh the shift uploads to show the new upload
        console.log('Refreshing shift uploads...');
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

    const handleAccordionChange =
        (panel: string) =>
        (event: React.SyntheticEvent, isExpanded: boolean) => {
            setExpanded(isExpanded ? panel : false);
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
                    {geolocation
                        ? `Current location: ${geolocation.latitude.toFixed(6)}, ${geolocation.longitude.toFixed(6)}`
                        : 'Getting your location...'}
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
                                itemName: 'Current Location',
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

            <Box>
                {checklistData.items.map((item, index) => {
                    const isCompleted =
                        !!completions[item.id] &&
                        completions[item.id].completed === true;
                    const hasComments =
                        comments[item.id] && comments[item.id].trim() !== '';
                    const hasUpload = !!uploads[item.id];
                    const unassociatedUploads = shiftUploads.filter(
                        (groupUpload) =>
                            groupUpload.upload &&
                            !Object.values(uploads).includes(
                                groupUpload.upload.id
                            )
                    );
                    const hasUploadInShiftUploads =
                        (uploads[item.id] &&
                            shiftUploads.some(
                                (groupUpload) =>
                                    groupUpload.upload &&
                                    groupUpload.upload.id === uploads[item.id]
                            )) ||
                        (item.uploadOption === 'required' &&
                            !uploads[item.id] &&
                            unassociatedUploads.length > 0);
                    const isAlreadyCompleted = isCompleted;
                    const hasRequiredFields =
                        isAlreadyCompleted ||
                        ((item.commentsOption !== 'required' || hasComments) &&
                            (item.uploadOption !== 'required' ||
                                hasUpload ||
                                hasUploadInShiftUploads));

                    if (
                        item.uploadOption === 'required' &&
                        !uploads[item.id] &&
                        unassociatedUploads.length > 0 &&
                        !isCompleted
                    ) {
                        const uploadToAssociate = unassociatedUploads[0].upload;
                        if (uploadToAssociate) {
                            setTimeout(() => {
                                setUploads((prev) => ({
                                    ...prev,
                                    [item.id]: uploadToAssociate.id,
                                }));
                            }, 0);
                        }
                    }

                    const canBeExpanded =
                        item.commentsOption !== 'off' ||
                        item.uploadOption !== 'off';
                    const isExpanded = expanded === item.id;

                    return (
                        <Accordion
                            key={item.id}
                            expanded={canBeExpanded && isExpanded}
                            onChange={
                                canBeExpanded
                                    ? handleAccordionChange(item.id)
                                    : undefined
                            }
                            sx={{
                                mb: 1,
                                '&:before': {
                                    display: 'none',
                                },
                                bgcolor: isCompleted
                                    ? 'grey.100'
                                    : 'background.paper',
                                opacity: isCompleted ? 0.9 : 1,
                            }}
                        >
                            <AccordionSummary
                                expandIcon={
                                    canBeExpanded ? <ExpandMoreIcon /> : null
                                }
                                aria-controls={`${item.id}-content`}
                                id={`${item.id}-header`}
                                sx={{
                                    '& .MuiAccordionSummary-content': {
                                        alignItems: 'center',
                                    },
                                    cursor: canBeExpanded
                                        ? 'pointer'
                                        : 'default',
                                }}
                            >
                                <Tooltip
                                    title={
                                        !isCompleted && !hasRequiredFields
                                            ? 'Required fields missing'
                                            : (!isCompleted && hasRequiredFields
                                                ? 'Click to mark as completed'
                                                : '')
                                    }
                                >
                                    <Checkbox
                                        checked={isCompleted}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            handleCheckboxChange(item);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        disabled={!isCompleted && !hasRequiredFields}
                                        color={
                                            !isCompleted && hasRequiredFields
                                                ? 'success'
                                                : 'primary'
                                        }
                                        sx={{
                                            p: 0,
                                            mr: 1,
                                            animation:
                                                !isCompleted &&
                                                hasRequiredFields
                                                    ? 'pulse 1.5s infinite'
                                                    : 'none',
                                            '@keyframes pulse': {
                                                '0%': {
                                                    boxShadow:
                                                        '0 0 0 0 rgba(76, 175, 80, 0.4)',
                                                },
                                                '70%': {
                                                    boxShadow:
                                                        '0 0 0 10px rgba(76, 175, 80, 0)',
                                                },
                                                '100%': {
                                                    boxShadow:
                                                        '0 0 0 0 rgba(76, 175, 80, 0)',
                                                },
                                            },
                                        }}
                                    />
                                </Tooltip>
                                <Typography
                                    sx={{
                                        flexGrow: 1,
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

                                {/*{item.commentsOption !== 'off' && (*/}
                                {/*    <CommentIcon*/}
                                {/*        sx={{ color: 'text.secondary', ml: 1 }}*/}
                                {/*    />*/}
                                {/*)}*/}
                                {item.uploadOption !== 'off' &&
                                    (hasUpload ? (
                                        <DownloadIcon
                                            uploadId={uploads[item.id]}
                                            upload={
                                                shiftUploads.find(
                                                    (gu) =>
                                                        gu.upload?.id ===
                                                        uploads[item.id]
                                                )?.upload
                                            }
                                        />
                                    ) : (
                                        <CloudUploadIcon
                                            sx={{
                                                color: 'text.secondary',
                                                ml: 1,
                                            }}
                                        />
                                    ))}

                                {isCompleted && (
                                    <Tooltip title="Completed">
                                        <CheckCircleIcon
                                            color="success"
                                            sx={{ ml: 1 }}
                                        />
                                    </Tooltip>
                                )}
                                {/* Show grey LocationOnIcon if GPS is involved and not yet completed */}
                                {!isCompleted && item.geoLocationEnabled && (
                                    <Tooltip title="Geolocation required">
                                        <LocationOnIcon sx={{ color: 'action.active', ml: 1 }} />
                                    </Tooltip>
                                )}
                                {isCompleted &&
                                    completions[item.id] &&
                                    completions[item.id].latitude &&
                                    completions[item.id].longitude &&
                                    item.geoLocationEnabled && (
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedLocation({
                                                    latitude:
                                                        completions[item.id]
                                                            .latitude,
                                                    longitude:
                                                        completions[item.id]
                                                            .longitude,
                                                    itemName: item.name,
                                                });
                                                setLocationModalOpen(true);
                                            }}
                                        >
                                            <LocationOnIcon />
                                        </div>
                                    )}
                            </AccordionSummary>
                            <AccordionDetails>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: 1,
                                        mb: 2,
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
                                                item.uploadOption === 'required'
                                                    ? 'Upload Required'
                                                    : 'Upload Optional'
                                            }
                                            size="small"
                                            color={
                                                item.uploadOption === 'required'
                                                    ? 'secondary'
                                                    : 'default'
                                            }
                                            variant="outlined"
                                        />
                                    )}
                                </Box>

                                {item.commentsOption !== 'off' && (
                                    <TextField
                                        label={
                                            item.commentsOption === 'required'
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
                                            item.commentsOption === 'required'
                                        }
                                        error={
                                            item.commentsOption ===
                                                'required' &&
                                            (!comments[item.id] ||
                                                comments[item.id].trim() === '')
                                        }
                                        helperText={
                                            item.commentsOption ===
                                                'required' &&
                                            (!comments[item.id] ||
                                                comments[item.id].trim() === '')
                                                ? 'Comments are required'
                                                : ''
                                        }
                                        disabled={isCompleted}
                                    />
                                )}

                                {item.uploadOption !== 'off' && (
                                    <Box sx={{ mt: 2 }}>
                                        {isClearingFile[item.id] ? (
                                            <Skeleton variant="rectangular" width="100%" height={100} sx={{ mt: 1 }} />
                                        ) : uploads[item.id] ? (
                                            <Box>
                                                <Alert
                                                    severity="success"
                                                    sx={{ mb: 1 }}
                                                >
                                                    File uploaded successfully.{' '}
                                                    {!isCompleted &&
                                                        item.uploadOption ===
                                                            'required' &&
                                                        'You can now check this item.'}
                                                </Alert>
                                                <UploadDetailsContainer
                                                    itemId={item.id}
                                                    uploadId={uploads[item.id]}
                                                    shiftUploads={shiftUploads}
                                                    setUploads={setUploads}
                                                    completeItemMutation={
                                                        completeItemMutation
                                                    }
                                                    completions={completions}
                                                    shift={shift}
                                                    refetchChecklistData={
                                                        refetch
                                                    }
                                                    refetchShiftUploads={
                                                        refetchShiftUploads
                                                    }
                                                    notifications={
                                                        notifications
                                                    }
                                                    deleteFileMutation={
                                                        deleteFileMutation
                                                    }
                                                    isClearingFile={isClearingFile[item.id]}
                                                    setIsClearingFile={setIsClearingFile}
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
                                                    disabled={
                                                        isCompleted ||
                                                        uploading[item.id]
                                                    }
                                                />
                                                <label
                                                    htmlFor={`upload-file-${item.id}`}
                                                >
                                                    <Button
                                                        variant="outlined"
                                                        component="span"
                                                        startIcon={
                                                            uploading[
                                                                item.id
                                                            ] ? (
                                                                <CircularProgress
                                                                    size={20}
                                                                />
                                                            ) : (
                                                                <CloudUploadIcon />
                                                            )
                                                        }
                                                        disabled={
                                                            isCompleted ||
                                                            uploading[item.id]
                                                        }
                                                        color={
                                                            item.uploadOption ===
                                                            'required'
                                                                ? 'secondary'
                                                                : 'primary'
                                                        }
                                                    >
                                                        {uploading[item.id]
                                                            ? 'Uploading...'
                                                            : item.uploadOption ===
                                                                'required'
                                                              ? 'Upload Required File'
                                                              : 'Upload File'}
                                                    </Button>
                                                </label>
                                            </Box>
                                        )}
                                    </Box>
                                )}

                                {isCompleted && completions[item.id] && (
                                    <Box
                                        sx={{ mt: 2, color: 'text.secondary' }}
                                    >
                                        <Typography
                                            variant="caption"
                                            display="block"
                                        >
                                            Completed by:{' '}
                                            {completions[item.id].member
                                                ?.name || 'You'}{' '}
                                            at{' '}
                                            {formatDate(
                                                completions[item.id].completedAt
                                            )}
                                        </Typography>
                                    </Box>
                                )}
                            </AccordionDetails>
                        </Accordion>
                    );
                })}
            </Box>

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
                    Location Map:{' '}
                    {selectedLocation?.itemName === 'Current Location'
                        ? 'Your Current Location'
                        : `Where "${selectedLocation?.itemName}" was completed`}
                </DialogTitle>
                <DialogContent>
                    {selectedLocation && (
                        <Box sx={{ py: 2 }}>
                            <Typography variant="body2" gutterBottom>
                                Coordinates:{' '}
                                {selectedLocation.latitude.toFixed(6)},{' '}
                                {selectedLocation.longitude.toFixed(6)}
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
