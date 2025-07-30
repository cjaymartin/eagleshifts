import React, { useState } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Grid,
    IconButton,
    Paper,
    Typography,
    useTheme,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import { useNotifications } from '@toolpad/core';
import {
    useShiftUploadsQuery,
    useUploadFileMutation,
    useDeleteFileMutation,
    readFileAsBase64,
} from '@/queries/uploads';
import FilePreviewButton from '@/components/FilePreview';

type ShiftUploadsProps = {
    shiftId: string;
    readOnly: boolean;
};

export default function ShiftUploads({ shiftId, readOnly }: ShiftUploadsProps) {
    const theme = useTheme();
    const notifications = useNotifications();
    const [uploading, setUploading] = useState<Record<string, boolean>>({});

    // Get uploads for this shift
    const {
        data: uploadData,
        isLoading,
        refetch: refetchUploads,
    } = useShiftUploadsQuery(shiftId);

    // Mutations for uploading and deleting files
    const uploadFileMutation = useUploadFileMutation();
    const deleteFileMutation = useDeleteFileMutation();

    // Handle file upload
    const handleFileUpload = async (
        uploadGroupId: string,
        groupName: string,
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setUploading((prev) => ({ ...prev, [uploadGroupId]: true }));

            // Read file as base64
            const fileData = await readFileAsBase64(file);

            // Upload file
            await uploadFileMutation.mutateAsync({
                shiftId,
                uploadGroupId,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                fileData,
            });

            // Refetch uploads
            await refetchUploads();
            notifications.show(`${groupName} uploaded successfully`, {
                severity: 'success',
            });
        } catch (error: any) {
            console.error('Error uploading file:', error);
            notifications.show(
                `Failed to upload ${groupName}: ${error.message}`,
                { severity: 'error' }
            );
        } finally {
            setUploading((prev) => ({ ...prev, [uploadGroupId]: false }));
            // Clear the file input
            event.target.value = '';
        }
    };

    // Handle file deletion
    const handleDeleteFile = async (uploadId: string, fileName: string) => {
        if (!confirm(`Are you sure you want to delete ${fileName}?`)) return;

        try {
            await deleteFileMutation.mutateAsync({ uploadId });
            await refetchUploads();
            notifications.show(`File deleted successfully`, {
                severity: 'success',
            });
        } catch (error: any) {
            console.error('Error deleting file:', error);
            notifications.show(`Failed to delete file: ${error.message}`, {
                severity: 'error',
            });
        }
    };

    // Handle file view
    const handleViewFile = (upload: any) => {
        // Open the file in a new tab
        window.open(`/api/uploads/view/${upload.id}`, '_blank');
    };

    // If there are no upload groups, don't render anything
    if (!isLoading && (!uploadData || uploadData.length === 0)) {
        return null;
    }

    return (
        <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
                Uploads
            </Typography>

            {isLoading ? (
                <CircularProgress size={24} />
            ) : (
                <Box 
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 2,
                        '& > div': {
                            flexGrow: 1,
                            flexBasis: {
                                xs: '100%',
                                md: 'calc(50% - 16px)',
                                lg: 'calc(25% - 16px)',
                            },
                            minWidth: {
                                xs: '100%',
                                md: 'calc(50% - 16px)',
                                lg: 'calc(25% - 16px)',
                            },
                            maxWidth: '100%',
                        }
                    }}
                >
                    {uploadData?.map(({ group, upload }) => (
                        <Box key={group.id}>
                            <Paper
                                elevation={1}
                                sx={{
                                    p: 2,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    backgroundColor:
                                        theme.palette.background.default,
                                }}
                            >
                                <Typography variant="body1">
                                    {group.uploadName}
                                </Typography>

                                {upload ? (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Typography
                                            variant="body2"
                                            sx={{ mr: 1 }}
                                        >
                                            {upload.fileName}
                                        </Typography>

                                        <FilePreviewButton 
                                            fileName={upload.fileName}
                                            fileUrl={`/api/uploads/view/${upload.id}`}
                                        />
                                        <IconButton
                                            size="small"
                                            onClick={() =>
                                                handleViewFile(upload)
                                            }
                                            title="Download file"
                                        >
                                            <DownloadIcon fontSize="small" />
                                        </IconButton>

                                        {!readOnly && (
                                            <IconButton
                                                size="small"
                                                onClick={() =>
                                                    handleDeleteFile(
                                                        upload.id,
                                                        upload.fileName
                                                    )
                                                }
                                                title="Delete file"
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        )}
                                    </Box>
                                ) : (
                                    !readOnly && (
                                        <Box>
                                            <input
                                                accept="*/*"
                                                style={{ display: 'none' }}
                                                id={`upload-file-${group.id}`}
                                                type="file"
                                                onChange={(e) =>
                                                    handleFileUpload(
                                                        group.id,
                                                        group.uploadName,
                                                        e
                                                    )
                                                }
                                                disabled={uploading[group.id]}
                                            />
                                            <label
                                                htmlFor={`upload-file-${group.id}`}
                                            >
                                                <Button
                                                    variant="outlined"
                                                    component="span"
                                                    startIcon={
                                                        uploading[group.id] ? (
                                                            <CircularProgress
                                                                size={20}
                                                            />
                                                        ) : (
                                                            <CloudUploadIcon />
                                                        )
                                                    }
                                                    disabled={
                                                        uploading[group.id]
                                                    }
                                                >
                                                    {uploading[group.id]
                                                        ? 'Uploading...'
                                                        : 'Upload'}
                                                </Button>
                                            </label>
                                        </Box>
                                    )
                                )}
                            </Paper>
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
}
