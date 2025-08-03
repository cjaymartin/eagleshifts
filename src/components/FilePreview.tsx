import React, { useMemo, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Box,
    Typography,
    CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import { useFileUrlQuery } from '@/queries/uploads';
import DocPreview from '@/components/FilePreview/DocPreview';

// List of file types supported for preview
export const SUPPORTED_FILE_TYPES = [
    'jpg',
    'jpeg',
    'png',
    'gif',
    'svg',
    'pdf',
    'docx',
    'xlsx',
    'csv',
    'txt',
];

// Helper function to check if a file type is supported
export const isFileTypeSupported = (fileName: string): boolean => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension ? SUPPORTED_FILE_TYPES.includes(extension) : false;
};

type FilePreviewButtonProps = {
    uploadId: string;
};

// Preview Button Component
export const FilePreviewButton: React.FC<FilePreviewButtonProps> = ({
    uploadId,
}) => {
    const [open, setOpen] = useState(false);
    const { data, isLoading } = useFileUrlQuery(uploadId);

    console.log({ uploadId, data });

    // Don't render anything while loading or if no data
    if (isLoading || !data) {
        return null;
    }

    // Only render the button if the file type is supported
    if (!isFileTypeSupported(data.fileName)) {
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
                uploadId={uploadId}
            />
        </>
    );
};

type FilePreviewDialogProps = {
    open: boolean;
    onClose: () => void;
    uploadId: string;
};

// File Preview Dialog Component
export const FilePreviewDialog: React.FC<FilePreviewDialogProps> = ({
    open,
    onClose,
    uploadId,
}) => {
    const { data, isLoading } = useFileUrlQuery(uploadId);

    const { isStraightRender, isImageRender, isDocRender, cannotRender } =
        useMemo(() => {
            const fileType = data?.fileType?.toLowerCase();
            if (!fileType) return {};

            const isImageRender = [
                'image/jpeg',
                'image/png',
                'image/gif',
                'image/svg+xml',
                'image/bmp',
            ].includes(fileType);
            const isStraightRender =
                !isImageRender && ['application/pdf'].includes(fileType);

            const isDocRender =
                !isStraightRender &&
                !isImageRender &&
                [
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                ] // xlsx
                    .includes(fileType);

            const cannotRender =
                !isStraightRender && !isImageRender && !isDocRender;
            return {
                isStraightRender,
                isImageRender,
                cannotRender,
                isDocRender,
            };
        }, [data?.fileType, data?.url]);

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
                    {isLoading ? (
                        <CircularProgress size={24} />
                    ) : data ? (
                        <>
                            <Typography
                                variant="h6"
                                component="div"
                                sx={{
                                    textOverflow: 'ellipsis',
                                    overflow: 'hidden',
                                    mr: 1,
                                }}
                            >
                                {data.fileName}
                            </Typography>
                            <IconButton
                                size="small"
                                color="primary"
                                component="a"
                                href={data.url}
                                download
                                title="Download file"
                                sx={{ ml: 1 }}
                            >
                                <DownloadIcon fontSize="small" />
                            </IconButton>
                        </>
                    ) : (
                        <Typography variant="h6" component="div">
                            Loading...
                        </Typography>
                    )}
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
                {isLoading ? (
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            height: '100%',
                        }}
                    >
                        <CircularProgress />
                    </Box>
                ) : data ? (
                    <>
                        {isStraightRender && (
                            <iframe
                                src={data.url}
                                title={data.fileName}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    border: 'none',
                                }}
                            />
                        )}
                        {isImageRender && (
                            <img
                                src={data.url}
                                title={data.fileName}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    border: 'none',
                                }}
                            />
                        )}
                        {isDocRender && (
                            <DocPreview
                                fileName={data?.fileName}
                                fileType={data?.fileType}
                                url={data?.url}
                            />
                        )}

                        {cannotRender && (
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    height: '100%',
                                }}
                            >
                                <Typography color="error">
                                    Cannot render this file type. Please
                                    download instead.
                                </Typography>
                            </Box>
                        )}
                    </>
                ) : (
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            height: '100%',
                        }}
                    >
                        <Typography color="error">
                            Failed to load file information
                        </Typography>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default FilePreviewButton;
