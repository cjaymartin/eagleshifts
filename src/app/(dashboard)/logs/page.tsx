'use client';

import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Typography,
    IconButton,
    Link,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import { useAuthQuery, useTeamUsersLookupQuery } from '@/queries/users';
import { useLogsQuery, useLogTypesQuery } from '../../../queries/logs';
import { useShiftGetQuery } from '@/queries/shifts';
import { LogFilters } from './_components/LogFilters';
import { LogEntityType } from '@/lib/logging';
import { useDialogs } from '@toolpad/core';
import ShiftDialog from '@/app/(dashboard)/shifts/_components/ShiftDialog';
import { trpc } from '@/lib/trpc/client';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

export default function Logs() {
    const { data: session } = useAuthQuery();
    const role = session?.user?.role ?? 'guest';
    const isAdmin = ['admin', 'owner'].includes(role);
    const dialogs = useDialogs();
    const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
    const { data: selectedShift, isLoading: isLoadingShift } = useShiftGetQuery(
        selectedShiftId || ''
    );

    // Open the dialog when the shift data is loaded
    useEffect(() => {
        if (selectedShift && !isLoadingShift) {
            dialogs.open(ShiftDialog, selectedShift);
            setSelectedShiftId(null); // Reset the selected shift ID
        }
    }, [selectedShift, isLoadingShift, dialogs]);

    // State for filters and pagination
    const [filters, setFilters] = useState({
        actionType: undefined,
        startDate: undefined,
        endDate: undefined,
        userId: undefined,
        page: 0,
        limit: 25,
        sortBy: 'timestamp',
        sortDirection: 'desc' as 'asc' | 'desc',
    });

    // Fetch logs with current filters
    const { data: logsData, isLoading } = useLogsQuery({
        ...filters,
        page: filters.page + 1, // API uses 1-based pagination, UI uses 0-based
    });

    // Fetch log types for filter dropdown
    const { data: logTypes } = useLogTypesQuery();

    // Fetch user lookup data for displaying user names
    const { data: userLookupData } = useTeamUsersLookupQuery();
    const userLookup = userLookupData || {};

    // Redirect non-admin users
    if (!isAdmin) {
        return (
            <Container>
                <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>
                    Access Denied
                </Typography>
                <Typography>
                    You need administrator privileges to view the logs.
                </Typography>
            </Container>
        );
    }

    // Handle pagination changes
    const handleChangePage = (event: unknown, newPage: number) => {
        setFilters((prev) => ({ ...prev, page: newPage }));
    };

    const handleChangeRowsPerPage = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        setFilters((prev) => ({
            ...prev,
            limit: parseInt(event.target.value, 10),
            page: 0,
        }));
    };

    // Handle sorting changes
    const handleSort = (column: string) => {
        setFilters((prev) => ({
            ...prev,
            sortBy: column,
            sortDirection:
                prev.sortBy === column && prev.sortDirection === 'asc'
                    ? 'desc'
                    : 'asc',
        }));
    };

    // Export logs to Excel
    const exportToExcel = () => {
        if (!logsData?.logs) return;

        const fileName = 'activity-logs-' + dayjs.utc().format('YYYY-MM-DD');
        const fileType =
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
        const fileExtension = '.xlsx';

        const excelData = logsData.logs.map((log) => {
            const user = log.user?.name || log.user?.email || 'Unknown User';
            // Explicitly type metadata as any
            const metadata: any = log.metadata;

            // Determine the entity value based on entity type
            let entityValue = '';

            if (log.entityType === LogEntityType.INVITATION) {
                // Don't include an Entity for Invitations
                entityValue = '';
            } else if (
                log.entityType === LogEntityType.SHIFT_REQUEST ||
                log.entityType === LogEntityType.SHIFT_ASSIGNMENT
            ) {
                // For Shift Requests and Shift Assignments, use the related shift information
                if (metadata && metadata['shiftId']) {
                    entityValue =
                        log.description.split(': ')[1] || metadata['shiftId'];
                } else {
                    entityValue = log.entityId || '-';
                }
            } else if (
                log.entityType === LogEntityType.SHIFT &&
                metadata &&
                metadata['shift'] &&
                metadata['shift']['title']
            ) {
                // For Shifts, use the shift title
                entityValue = metadata['shift']['title'];
            } else if (log.entityType && log.entityId) {
                // For other entities, show the entity type and ID
                entityValue = `${log.entityType}: ${log.entityId}`;
            } else {
                // If no entity type or ID, show a dash
                entityValue = log.entityType || log.entityId || '-';
            }

            return {
                Timestamp: dayjs(log.timestamp).format('YYYY-MM-DD HH:mm:ss'),
                User: user,
                Description: log.description,
                Entity: entityValue,
            };
        });

        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = { Sheets: { data: ws }, SheetNames: ['data'] };
        const excelBuffer = XLSX.write(wb, {
            bookType: 'xlsx',
            type: 'array',
        } as any);
        const data = new Blob([excelBuffer], { type: fileType });
        FileSaver.saveAs(data, fileName + fileExtension);
    };

    // Render sort indicator
    const renderSortLabel = (column: string, label: string) => {
        const isActive = filters.sortBy === column;
        const direction = isActive ? filters.sortDirection : 'asc';

        return (
            <TableCell
                onClick={() => handleSort(column)}
                sx={{
                    cursor: 'pointer',
                    fontWeight: isActive ? 'bold' : 'normal',
                }}
            >
                {label} {isActive && (direction === 'asc' ? '↑' : '↓')}
            </TableCell>
        );
    };

    return (
        <Box>
            <Typography variant="h5" sx={{ mb: 3 }}>
                Activity Logs
            </Typography>

            <Box sx={{ mb: 2 }}>
                <LogFilters
                    filters={filters}
                    setFilters={setFilters as any}
                    logTypes={logTypes || []}
                    userLookup={userLookup}
                />

                <Box
                    sx={{
                        mt: 2,
                        mb: 1,
                        display: 'flex',
                        justifyContent: 'flex-end',
                    }}
                >
                    <IconButton
                        onClick={exportToExcel}
                        disabled={!logsData?.logs?.length}
                    >
                        <DownloadIcon /> Export to Excel
                    </IconButton>
                </Box>
            </Box>

            <TableContainer component={Paper} sx={{ position: 'relative' }}>
                {isLoadingShift && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(255, 255, 255, 0.7)',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            zIndex: 1,
                        }}
                    >
                        <Typography>Loading shift data...</Typography>
                    </Box>
                )}
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            {renderSortLabel('timestamp', 'Timestamp')}
                            {renderSortLabel('userId', 'User')}
                            <TableCell>Description</TableCell>
                            <TableCell>Entity</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : !logsData?.logs?.length ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    No logs found
                                </TableCell>
                            </TableRow>
                        ) : (
                            logsData.logs.map((log) => {
                                const user =
                                    log.user?.name ||
                                    log.user?.email ||
                                    'Unknown User';

                                return (
                                    <TableRow key={log.id}>
                                        <TableCell>
                                            {dayjs(log.timestamp).format(
                                                'YYYY-MM-DD HH:mm:ss'
                                            )}
                                        </TableCell>
                                        <TableCell>{user}</TableCell>
                                        <TableCell>{log.description}</TableCell>
                                        <TableCell>
                                            {log.entityType ===
                                            LogEntityType.INVITATION ? (
                                                // Don't display anything for Invitations
                                                ''
                                            ) : log.entityType ===
                                                  LogEntityType.SHIFT_REQUEST ||
                                              log.entityType ===
                                                  LogEntityType.SHIFT_ASSIGNMENT ? (
                                                // For Shift Requests and Shift Assignments, show the related shift with an edit link
                                                log.metadata &&
                                                (log.metadata as any)[
                                                    'shiftId'
                                                ] ? (
                                                    <Link
                                                        component="button"
                                                        variant="body2"
                                                        disabled={
                                                            isLoadingShift
                                                        }
                                                        onClick={() => {
                                                            setSelectedShiftId(
                                                                (
                                                                    log.metadata as any
                                                                )['shiftId']
                                                            );
                                                        }}
                                                    >
                                                        {isLoadingShift &&
                                                        selectedShiftId ===
                                                            (
                                                                log.metadata as any
                                                            )['shiftId']
                                                            ? 'Loading...'
                                                            : log.description.split(
                                                                  ': '
                                                              )[1] ||
                                                              (
                                                                  log.metadata as any
                                                              )['shiftId']}
                                                    </Link>
                                                ) : (
                                                    // If no shiftId in metadata, fall back to entity ID
                                                    log.entityId || '-'
                                                )
                                            ) : log.entityType ===
                                                  LogEntityType.SHIFT &&
                                              log.entityId ? (
                                                // For Shifts, show the shift with an edit link
                                                <Link
                                                    component="button"
                                                    variant="body2"
                                                    disabled={isLoadingShift}
                                                    onClick={() => {
                                                        setSelectedShiftId(
                                                            log.entityId
                                                        );
                                                    }}
                                                >
                                                    {isLoadingShift &&
                                                    selectedShiftId ===
                                                        log.entityId
                                                        ? 'Loading...'
                                                        : (log.metadata &&
                                                              (
                                                                  log.metadata as any
                                                              )['shift'] &&
                                                              (
                                                                  log.metadata as any
                                                              )['shift'][
                                                                  'title'
                                                              ]) ||
                                                          log.description.split(
                                                              ': '
                                                          )[1] ||
                                                          log.entityId}
                                                </Link>
                                            ) : log.entityType &&
                                              log.entityId ? (
                                                // For other entities, show the entity type and ID
                                                `${log.entityType}: ${log.entityId}`
                                            ) : (
                                                // If no entity type or ID, show a dash
                                                log.entityType ||
                                                log.entityId ||
                                                '-'
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>

                {logsData?.pagination && (
                    <TablePagination
                        rowsPerPageOptions={[10, 25, 50, 100]}
                        component="div"
                        count={logsData.pagination.totalCount}
                        rowsPerPage={filters.limit}
                        page={filters.page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                )}
            </TableContainer>
        </Box>
    );
}
