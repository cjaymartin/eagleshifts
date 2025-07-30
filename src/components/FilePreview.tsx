import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Box,
    Typography,
    CircularProgress,
    Paper,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';

import FileViewer from 'react-file-viewer';

// List of file types supported by react-file-viewer
export const SUPPORTED_FILE_TYPES = [
    // Images
    'jpg',
    'jpeg',
    'png',
    'gif',
    'svg',
    // Documents
    'pdf',
    'docx',
    'xlsx',
    'csv',
    'txt',
    // Media
    'mp4',
    'mp3',
    // Code
    'js',
    'ts',
    'json',
    'html',
    'css',
];

// Helper function to check if a file type is supported
export const isFileTypeSupported = (fileName: string): boolean => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension ? SUPPORTED_FILE_TYPES.includes(extension) : false;
};

// Helper function to get the file type for react-file-viewer
export const getFileType = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';

    // Map file extensions to react-file-viewer types
    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) return 'image';
    if (extension === 'pdf') return 'pdf';
    if (extension === 'docx') return 'docx';
    if (extension === 'xlsx') return 'xlsx';
    if (extension === 'csv') return 'csv';
    if (['mp4'].includes(extension)) return 'video';
    if (['mp3'].includes(extension)) return 'audio';

    // Default to plain text for other supported types
    return 'text';
};

type FilePreviewButtonProps = {
    fileName: string;
    fileUrl: string;
};

// Preview Button Component
export const FilePreviewButton: React.FC<FilePreviewButtonProps> = ({
    fileName,
    fileUrl,
}) => {
    const [open, setOpen] = useState(false);

    // Only render the button if the file type is supported
    if (!isFileTypeSupported(fileName)) {
        return null;
    }

    return (
        <>
            <IconButton
                size="small"
                onClick={() => setOpen(true)}
                title="Preview file"
            >
                <VisibilityIcon fontSize="small" />
            </IconButton>

            <FilePreviewDialog
                open={open}
                onClose={() => setOpen(false)}
                fileName={fileName}
                fileUrl={fileUrl}
            />
        </>
    );
};

type FilePreviewDialogProps = {
    open: boolean;
    onClose: () => void;
    fileName: string;
    fileUrl: string;
};

// File Preview Dialog Component
export const FilePreviewDialog: React.FC<FilePreviewDialogProps> = ({
    open,
    onClose,
    fileName,
    fileUrl,
}) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const fileType = getFileType(fileName);

    const handleError = (error: Error) => {
        console.error('Error in file preview:', error);
        setError('Failed to preview file. Please try downloading it instead.');
        setLoading(false);
    };

    const handleLoad = () => {
        setLoading(false);
    };

    console.log({ fileUrl });

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: {
                    height: '80vh',
                    maxHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column',
                },
            }}
        >
            <DialogTitle
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        overflow: 'hidden',
                    }}
                >
                    <Typography
                        variant="h6"
                        component="div"
                        sx={{
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            mr: 1,
                        }}
                    >
                        {fileName}
                    </Typography>
                    <IconButton
                        size="small"
                        color="primary"
                        component="a"
                        href={fileUrl}
                        download
                        title="Download file"
                        sx={{ ml: 1 }}
                    >
                        <DownloadIcon fontSize="small" />
                    </IconButton>
                </Box>
                <IconButton
                    edge="end"
                    color="inherit"
                    onClick={onClose}
                    aria-label="close"
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent
                sx={{
                    flex: 1,
                    overflow: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {error && (
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            height: '100%',
                        }}
                    >
                        <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
                            <Typography color="error">{error}</Typography>
                            <Typography variant="body2" sx={{ mt: 2 }}>
                                Please try downloading the file instead.
                            </Typography>
                        </Paper>
                    </Box>
                )}

                <Box
                    sx={{
                        flex: 1,
                        display: error ? 'none' : 'block',
                        overflow: 'auto',
                        '& .pg-viewer-wrapper': {
                            height: '100%',
                            overflow: 'auto',
                        },
                        '& .pg-viewer': {
                            overflow: 'auto',
                        },
                        '& .pdf-viewer-container': {
                            overflow: 'auto',
                            height: '100%',
                        },
                        '& .pdf-viewer': {
                            overflow: 'auto',
                        },
                    }}
                >
                    <FileViewer
                        fileType={fileType}
                        filePath={fileUrl}
                        onError={handleError}
                        unsupportedComponent={
                            <Box sx={{ p: 3, textAlign: 'center' }}>
                                <Typography>
                                    Preview not available for this file type.
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 2 }}>
                                    Please download the file to view it.
                                </Typography>
                            </Box>
                        }
                    />
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default FilePreviewButton;
