import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Box,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';

// List of file types supported for preview
export const SUPPORTED_FILE_TYPES = [
    'jpg', 'jpeg', 'png', 'gif', 'svg',
    'pdf', 'docx', 'xlsx', 'csv', 'txt',
];

// Helper function to check if a file type is supported
export const isFileTypeSupported = (fileName: string): boolean => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension ? SUPPORTED_FILE_TYPES.includes(extension) : false;
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
                <Box sx={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                    <Typography
                        variant="h6"
                        component="div"
                        sx={{ textOverflow: 'ellipsis', overflow: 'hidden', mr: 1 }}
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
            <DialogContent sx={{ flex: 1, overflow: 'hidden' }}>
                <iframe
                    src={fileUrl}
                    title={fileName}
                    style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                    }}
                />
            </DialogContent>
        </Dialog>
    );
};

export default FilePreviewButton;
