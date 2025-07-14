'use client';

import React, { useState } from 'react';
import {
    Box,
    Button,
    Container,
    FormControlLabel,
    FormGroup,
    IconButton,
    Paper,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import Download from '@mui/icons-material/Download';
import { useAuthQuery, useTeamUsersLookupQuery } from '@/queries/users';
import { trpc } from '@/lib/trpc/client';
import { useDialogs, useNotifications } from '@toolpad/core';
import RequestDialog from './_components/RequestDialog';
import {
    useShiftRequestsListQuery,
    useShiftRequestDeleteOldMutation,
    useShiftRequestSeedQuery,
} from '@/queries/requests';

export default function Requests() {
    const dialogs = useDialogs();
    const notifications = useNotifications();
    const { data: session } = useAuthQuery();
    const role = session?.user?.role ?? 'guest';
    const isAdmin = ['admin', 'owner'].includes(role);
    const [pendingOnly, setPendingOnly] = useState(true);
    const { data: userLookupData } = useTeamUsersLookupQuery();
    const userLookup = userLookupData || {};

    // Get requests from the API
    const { data: requests } = useShiftRequestsListQuery(pendingOnly);

    // Get the seed query
    const seedQuery = useShiftRequestSeedQuery();

    // Function to open the request dialog for a specific request
    const openRequestDialog = (request) => {
        dialogs.open(RequestDialog, request);
    };

    // Function to open the request dialog for a new request
    const openNewRequestDialog = () => {
        dialogs.open(RequestDialog, null);
    };

    // Function to export requests to XLSX
    const exportToXLSX = () => {
        const fileName = 'shift-requests-' + dayjs.utc().format('YYYY-MM-DD');

        const csvData =
            requests?.map((request) => {
                const { createdAt, status, reason } = request;
                const shift = request.shift;
                const member = request.member;
                const userName =
                    userLookup[member.userId]?.name || member.userId;

                return {
                    'Request Date': dayjs(createdAt).format('YYYY-MM-DD'),
                    Shift: shift.title,
                    Location: shift.location || '',
                    'Shift Date': dayjs(shift.date).format('YYYY-MM-DD'),
                    'Start Time': dayjs(shift.startTime).format('h:mm A'),
                    'End Time': dayjs(shift.endTime).format('h:mm A'),
                    User: userName,
                    Status: status.charAt(0).toUpperCase() + status.slice(1),
                    Reason: reason || '',
                };
            }) || [];

        const ws = XLSX.utils.json_to_sheet(csvData);
        const wb = { Sheets: { data: ws }, SheetNames: ['data'] };
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
        });
        FileSaver.saveAs(data, fileName + '.xlsx');
    };

    // Function to handle deleting old requests
    const deleteOldMutation = useShiftRequestDeleteOldMutation();
    const handleDeleteOldRequests = async () => {
        try {
            await deleteOldMutation.mutateAsync();
            notifications.show('Old requests deleted successfully', {
                severity: 'success',
            });
        } catch (error) {
            console.error('Error deleting old requests:', error);
            notifications.show(`Error: ${error.message}`, {
                severity: 'error',
            });
        }
    };

    // Function to handle seeding requests
    const handleSeedRequests = async () => {
        try {
            const result = await seedQuery.refetch();
            if (result.data?.success) {
                notifications.show(result.data.message, {
                    severity: 'success',
                });
            }
        } catch (error) {
            console.error('Error seeding requests:', error);
            notifications.show(`Error: ${error.message}`, {
                severity: 'error',
            });
        }
    };

    // Status lookup for display
    const statusLookup = {
        pending: 'Pending',
        approved: 'Approved',
        rejected: 'Rejected',
    };

    return (
        <Box>
            <h2>Shift Requests</h2>
            <Box>
                <FormGroup>
                    <FormControlLabel
                        label="Pending Only"
                        control={
                            <Switch
                                defaultChecked
                                value={pendingOnly}
                                onChange={(_, checked) =>
                                    setPendingOnly(checked)
                                }
                            />
                        }
                    />
                </FormGroup>
            </Box>
            <Box>
                <IconButton onClick={exportToXLSX}>
                    <Download /> Download XLSX
                </IconButton>
            </Box>
            <TableContainer component={Paper}>
                <Table spacing={4} size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Request Date</TableCell>
                            <TableCell>Shift</TableCell>
                            <TableCell>Shift Date</TableCell>
                            <TableCell>User</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {requests?.map((request) => {
                            //TODO: This be fugly.  The API route should include the user name info
                            // and the underlying logic should be DRY'd somewhere
                            const userName =
                                request?.member?.name ||
                                request?.member?.user?.name ||
                                request?.member?.user?.email ||
                                request?.member?.userId;

                            //const userName = request.member.user.name;

                            return (
                                <TableRow key={request.id}>
                                    <TableCell>
                                        {dayjs(request.createdAt).format(
                                            'YYYY-MM-DD'
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {request.shift.title}
                                        <br />
                                        {request.shift.location}
                                    </TableCell>
                                    <TableCell>
                                        {dayjs(request.shift.date).format(
                                            'YYYY-MM-DD'
                                        )}
                                    </TableCell>
                                    <TableCell>{userName}</TableCell>
                                    <TableCell>
                                        {statusLookup[request.status]}
                                    </TableCell>
                                    <TableCell>
                                        <IconButton
                                            onClick={() =>
                                                openRequestDialog(request)
                                            }
                                        >
                                            <VisibilityIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            {/*<Container>*/}
            {/*    <Button onClick={openNewRequestDialog}>*/}
            {/*        <AddIcon /> New Request*/}
            {/*    </Button>*/}
            {/*</Container>*/}

            {isAdmin && (
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <Tooltip title="Deletes requests for shifts over 4 weeks in the past">
                        <Button
                            onClick={handleDeleteOldRequests}
                            variant="outlined"
                            color="warning"
                        >
                            Delete Old Requests
                        </Button>
                    </Tooltip>

                    <Tooltip title="Creates random requests for existing shifts">
                        <Button
                            onClick={handleSeedRequests}
                            variant="outlined"
                            color="primary"
                            disabled={seedQuery.isFetching}
                        >
                            {seedQuery.isFetching
                                ? 'Seeding...'
                                : 'Seed Random Requests'}
                        </Button>
                    </Tooltip>
                </Box>
            )}
        </Box>
    );
}
