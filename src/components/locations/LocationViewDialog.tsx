'use client';

import React from 'react';
import {
    Box,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    IconButton,
    Paper,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import GroupIcon from '@mui/icons-material/Group';
import TagIcon from '@mui/icons-material/LocalOffer';
import { useLocationQuery } from '@/queries/locations';
import LocationMap from './LocationMap';

export type LocationViewDialogProps = {
    locationId: string | null;
    open: boolean;
    onClose: () => void;
};

export default function LocationViewDialog({
    locationId,
    open,
    onClose,
}: LocationViewDialogProps) {
    // Fetch location data
    const { data: location, isLoading } = useLocationQuery(locationId || '');

    // Handle close
    function handleClose() {
        onClose();
    }

    return (
        <Dialog
            fullWidth={true}
            maxWidth="md"
            open={open}
            onClose={handleClose}
            aria-labelledby="location-dialog-title"
            aria-describedby="location-dialog-description"
        >
            <DialogTitle>
                <Box display="flex" alignItems="center">
                    <LocationOnIcon
                        sx={{
                            mr: 1,
                            color: location?.group?.color || 'inherit',
                        }}
                    />
                    <Box flexGrow={1}>Location Details</Box>
                    <Box>
                        <IconButton onClick={handleClose}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </Box>
            </DialogTitle>
            <DialogContent>
                {isLoading ? (
                    <Typography>Loading location details...</Typography>
                ) : location ? (
                    <Grid container spacing={3}>
                        {/* Location details */}
                        <Grid size={{ xs: 12 }}>
                            <Typography variant="h5">
                                {location.name}
                            </Typography>
                            <Typography variant="body1" color="textSecondary">
                                {location.address}
                            </Typography>
                        </Grid>

                        {/* Group */}
                        {location.group && (
                            <Grid size={{ xs: 12 }}>
                                <Box display="flex" alignItems="center" mb={1}>
                                    <GroupIcon sx={{ mr: 1 }} />
                                    <Typography variant="subtitle1">
                                        Group
                                    </Typography>
                                </Box>
                                <Chip
                                    label={location.group.name}
                                    sx={{
                                        backgroundColor: location.group.color,
                                        color: '#fff',
                                    }}
                                />
                            </Grid>
                        )}

                        {/* Tags */}
                        {location.tags && location.tags.length > 0 && (
                            <Grid size={{ xs: 12 }}>
                                <Box display="flex" alignItems="center" mb={1}>
                                    <TagIcon sx={{ mr: 1 }} />
                                    <Typography variant="subtitle1">
                                        Tags
                                    </Typography>
                                </Box>
                                <Box>
                                    {location.tags.map((tag: any) => (
                                        <Chip
                                            key={tag}
                                            label={tag}
                                            sx={{ mr: 1, mb: 1 }}
                                        />
                                    ))}
                                </Box>
                            </Grid>
                        )}

                        {/* Map */}
                        <Grid size={{ xs: 12 }}>
                            <Divider sx={{ my: 2 }} />
                            <Paper
                                elevation={1}
                                sx={{
                                    height: 400,
                                    width: '100%',
                                    overflow: 'hidden',
                                }}
                            >
                                <LocationMap
                                    latitude={location.latitude as any}
                                    longitude={location.longitude as any}
                                    popupContent={
                                        <div>
                                            <Typography variant="subtitle1">
                                                {location.name}
                                            </Typography>
                                            <Typography variant="body2">
                                                {location.address}
                                            </Typography>
                                        </div>
                                    }
                                />
                            </Paper>
                        </Grid>
                    </Grid>
                ) : (
                    <Typography>Location not found</Typography>
                )}
            </DialogContent>
        </Dialog>
    );
}
