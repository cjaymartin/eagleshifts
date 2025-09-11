import React from 'react';
import {
    Box,
    Typography,
    Paper,
    List,
    ListItem,
    ListItemText,
    Chip,
    Divider,
    Button,
    CircularProgress,
    Alert,
    Tooltip,
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CommentIcon from '@mui/icons-material/Comment';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { trpc } from '@/lib/trpc/client';

type ChecklistDetailProps = {
    checklistId: string;
    onClose: () => void;
};

export default function ChecklistDetail({
    checklistId,
    onClose,
}: ChecklistDetailProps) {
    // Fetch checklist details
    const {
        data: checklist,
        isLoading,
        error,
    } = trpc.checklists.get.useQuery({ id: checklistId });

    // Render item features (geolocation, comments, uploads)
    const renderItemFeatures = (item: any) => {
        return (
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                {item.geoLocationEnabled && (
                    <Tooltip title="Geolocation Enabled">
                        <Chip
                            icon={<LocationOnIcon />}
                            label="Location"
                            size="small"
                            color="primary"
                            variant="outlined"
                        />
                    </Tooltip>
                )}

                {item.commentsOption !== 'off' && (
                    <Tooltip title={`Comments: ${item.commentsOption}`}>
                        <Chip
                            icon={<CommentIcon />}
                            label={
                                item.commentsOption === 'required'
                                    ? 'Required'
                                    : 'Optional'
                            }
                            size="small"
                            color={
                                item.commentsOption === 'required'
                                    ? 'secondary'
                                    : 'default'
                            }
                            variant="outlined"
                        />
                    </Tooltip>
                )}

                {item.uploadOption !== 'off' && (
                    <Tooltip title={`File Upload: ${item.uploadOption}`}>
                        <Chip
                            icon={<AttachFileIcon />}
                            label={
                                item.uploadOption === 'required'
                                    ? 'Required'
                                    : 'Optional'
                            }
                            size="small"
                            color={
                                item.uploadOption === 'required'
                                    ? 'secondary'
                                    : 'default'
                            }
                            variant="outlined"
                        />
                    </Tooltip>
                )}
            </Box>
        );
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

    if (!checklist) {
        return (
            <Alert severity="warning" sx={{ mb: 2 }}>
                Checklist not found
            </Alert>
        );
    }

    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
                {checklist.name}
            </Typography>

            {checklist.description && (
                <Typography variant="body1" color="text.secondary" paragraph>
                    {checklist.description}
                </Typography>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" gutterBottom>
                Checklist Items ({checklist.items.length})
            </Typography>

            {checklist.items.length === 0 ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                    This checklist has no items.
                </Alert>
            ) : (
                <Paper variant="outlined" sx={{ mt: 2 }}>
                    <List>
                        {checklist.items.map((item, index) => (
                            <React.Fragment key={item.id}>
                                {index > 0 && <Divider component="li" />}
                                <ListItem sx={{ py: 2 }}>
                                    <ListItemText
                                        primary={
                                            <Typography variant="subtitle1">
                                                {index + 1}. {item.name}
                                            </Typography>
                                        }
                                        secondary={renderItemFeatures(item)}
                                    />
                                </ListItem>
                            </React.Fragment>
                        ))}
                    </List>
                </Paper>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button onClick={onClose}>Close</Button>
            </Box>
        </Box>
    );
}
