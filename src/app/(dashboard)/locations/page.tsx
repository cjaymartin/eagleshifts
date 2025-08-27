'use client';

import React, { useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Container,
    Dialog,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    Paper,
    Stack,
    Tab,
    Tabs,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import { Add, Close, Delete, Edit, LocationOn } from '@mui/icons-material';
import { useDialogs } from '@toolpad/core';
import { useNotifications } from '@/components/providers/NotificationsProvider';
import { useAuthQuery } from '@/queries/users';
import {
    useLocationsQuery,
    useLocationDeleteMutation,
    useLocationGroupsQuery,
} from '@/queries/locations';
import LocationForm from '@/components/locations/LocationForm';
import LocationViewDialog from '@/components/locations/LocationViewDialog';
import LocationGroupsTab from '@/components/locations/LocationGroupsTab';
import { getTextColor } from '@/utils/colorUtils';

// Tab panel component
interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`locations-tabpanel-${index}`}
            aria-labelledby={`locations-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );
}

export default function LocationsPage() {
    const [tabValue, setTabValue] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
        null
    );
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
    const [editLocationId, setEditLocationId] = useState<string | null>(null);

    const notifications = useNotifications();
    const dialogs = useDialogs();

    // Get user role to determine if they can create/edit/delete locations
    const { data: session } = useAuthQuery();
    const isAdmin =
        session?.user?.role === 'admin' || session?.user?.role === 'owner';

    // Fetch locations and location groups
    const {
        data: locationsData,
        isLoading,
        refetch,
    } = useLocationsQuery({
        name: searchTerm.length > 2 ? searchTerm : undefined,
    });

    const { data: locationGroups } = useLocationGroupsQuery();

    // Delete mutation
    const deleteMutation = useLocationDeleteMutation();

    // Handle tab change
    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    // Handle view location
    const handleViewLocation = (locationId: string) => {
        setSelectedLocationId(locationId);
        setIsViewDialogOpen(true);
    };

    // Handle edit location
    const handleEditLocation = (locationId: string) => {
        setEditLocationId(locationId);
        setIsFormDialogOpen(true);
    };

    // Handle delete location
    const handleDeleteLocation = async (locationId: string) => {
        try {
            const confirmed = await dialogs.confirm({
                title: 'Delete Location',
                message:
                    'Are you sure you want to delete this location? This action cannot be undone.',
                confirmText: 'Delete',
                cancelText: 'Cancel',
            } as any);

            if (confirmed) {
                await deleteMutation.mutateAsync({ id: locationId });
                notifications.show('Location deleted successfully', {
                    severity: 'success',
                    autoHideDuration: 3000,
                });
                refetch();
            }
        } catch (error: any) {
            notifications.show(error.message || 'Failed to delete location', {
                severity: 'error',
                autoHideDuration: 3000,
            });
        }
    };

    // Handle form submission
    const handleFormSubmit = () => {
        setIsFormDialogOpen(false);
        setEditLocationId(null);
        refetch();
    };

    return (
        <Container maxWidth="lg">
            <Stack spacing={3}>
                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                >
                    <Typography variant="h4">Locations</Typography>
                    {isAdmin && tabValue === 0 && (
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<Add />}
                            onClick={() => {
                                setEditLocationId(null);
                                setIsFormDialogOpen(true);
                            }}
                        >
                            Add Location
                        </Button>
                    )}
                </Box>

                <Paper elevation={0} sx={{ p: 2 }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs
                            value={tabValue}
                            onChange={handleTabChange}
                            aria-label="locations tabs"
                        >
                            <Tab
                                label="Locations"
                                id="locations-tab-0"
                                aria-controls="locations-tabpanel-0"
                            />
                            <Tab
                                label="Groups"
                                id="locations-tab-1"
                                aria-controls="locations-tabpanel-1"
                            />
                        </Tabs>
                    </Box>

                    <TabPanel value={tabValue} index={0}>
                        <TextField
                            fullWidth
                            label="Search Locations"
                            variant="outlined"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by name, address, group, or department..."
                            sx={{ mb: 2 }}
                        />

                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Name</TableCell>
                                        <TableCell>Address</TableCell>
                                        <TableCell>Group</TableCell>
                                        <TableCell>Department</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={5}
                                                align="center"
                                            >
                                                Loading...
                                            </TableCell>
                                        </TableRow>
                                    ) : locationsData?.locations &&
                                      locationsData.locations.length > 0 ? (
                                        locationsData.locations.map(
                                            (location) => (
                                                <TableRow key={location.id}>
                                                    <TableCell>
                                                        <Box
                                                            display="flex"
                                                            alignItems="center"
                                                        >
                                                            <LocationOn
                                                                sx={{
                                                                    mr: 1,
                                                                    color:
                                                                        location
                                                                            .group
                                                                            ?.color ||
                                                                        'inherit',
                                                                }}
                                                            />
                                                            {location.name}
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                        {location.address}
                                                    </TableCell>
                                                    <TableCell width={200}>
                                                        {location.group ? (
                                                            <Box
                                                                component="span"
                                                                sx={{
                                                                    backgroundColor:
                                                                        location
                                                                            .group
                                                                            .color,
                                                                    color: getTextColor(
                                                                        location
                                                                            .group
                                                                            .color
                                                                    ),
                                                                    px: 1,
                                                                    py: 0.5,
                                                                    borderRadius: 1,
                                                                }}
                                                            >
                                                                {
                                                                    location
                                                                        .group
                                                                        .name
                                                                }
                                                            </Box>
                                                        ) : (
                                                            '-'
                                                        )}
                                                    </TableCell>
                                                    <TableCell width={200}>
                                                        {location.defaultDepartment ? (
                                                            <Box
                                                                component="span"
                                                                sx={{
                                                                    backgroundColor:
                                                                        location
                                                                            .defaultDepartment
                                                                            .color || '#f0f0f0',
                                                                    color: getTextColor(
                                                                        location
                                                                            .defaultDepartment
                                                                            .color || '#f0f0f0'
                                                                    ),
                                                                    px: 1,
                                                                    py: 0.5,
                                                                    borderRadius: 1,
                                                                }}
                                                            >
                                                                {
                                                                    location
                                                                        .defaultDepartment
                                                                        .name
                                                                }
                                                            </Box>
                                                        ) : (
                                                            '-'
                                                        )}
                                                    </TableCell>
                                                    <TableCell width={134}>
                                                        <IconButton
                                                            onClick={() =>
                                                                handleViewLocation(
                                                                    location.id
                                                                )
                                                            }
                                                            size="small"
                                                        >
                                                            <LocationOn />
                                                        </IconButton>
                                                        {isAdmin && (
                                                            <>
                                                                <IconButton
                                                                    onClick={() =>
                                                                        handleEditLocation(
                                                                            location.id
                                                                        )
                                                                    }
                                                                    size="small"
                                                                >
                                                                    <Edit />
                                                                </IconButton>
                                                                <IconButton
                                                                    onClick={() =>
                                                                        handleDeleteLocation(
                                                                            location.id
                                                                        )
                                                                    }
                                                                    size="small"
                                                                    color="error"
                                                                >
                                                                    <Delete />
                                                                </IconButton>
                                                            </>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        )
                                    ) : (
                                        <TableRow>
                                            <TableCell
                                                colSpan={5}
                                                align="center"
                                            >
                                                No locations found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </TabPanel>

                    <TabPanel value={tabValue} index={1}>
                        <LocationGroupsTab />
                    </TabPanel>
                </Paper>
            </Stack>

            {/* View Location Dialog */}
            <LocationViewDialog
                locationId={selectedLocationId}
                open={isViewDialogOpen}
                onClose={() => setIsViewDialogOpen(false)}
            />

            {/* Create/Edit Location Dialog */}
            {isFormDialogOpen && (
                <Dialog
                    fullWidth={true}
                    maxWidth="md"
                    open={isFormDialogOpen}
                    onClose={() => {
                        setIsFormDialogOpen(false);
                        setEditLocationId(null);
                    }}
                >
                    <DialogTitle>
                        <Box display="flex" alignItems="center">
                            <Box flexGrow={1}>
                                {editLocationId
                                    ? 'Edit Location'
                                    : 'Create New Location'}
                            </Box>
                            <Box>
                                <IconButton
                                    onClick={() => {
                                        setIsFormDialogOpen(false);
                                        setEditLocationId(null);
                                    }}
                                >
                                    <Close />
                                </IconButton>
                            </Box>
                        </Box>
                    </DialogTitle>
                    <DialogContent>
                        <LocationForm
                            locationId={editLocationId!}
                            onSubmit={handleFormSubmit}
                            onCancel={() => {
                                setIsFormDialogOpen(false);
                                setEditLocationId(null);
                            }}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </Container>
    );
}
