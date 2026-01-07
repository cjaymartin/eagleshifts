'use client';

import React from 'react';
import { Chip, IconButton, TableCell, Tooltip, Box } from '@mui/material';
import dayjs from 'dayjs';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAuthQuery, useTeamUsersLookupQuery } from '@/queries/users';
import { useDialogs } from '@toolpad/core';
import ShiftDialog from '@/app/(dashboard)/shifts/_components/ShiftDialog';
import ShiftViewDialog from '@/components/calendar/ShiftViewDialog';
import { inferRouterOutputs } from '@trpc/server';
import { AppRouter } from '@/api/trpc/[trpc]';
import { useShiftDeleteMutation } from '@/queries/shifts';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { useBusinessProfileQuery } from '@/queries/team';

dayjs.extend(utc);
dayjs.extend(timezone);

// Helper function to format time from ISO to AM/PM format using the appropriate timezone
const formatTime = (time: string, timezone: string) => {
    if (!time) return '';

    // Handle ISO format strings
    if (time.includes('T')) {
        // Parse the ISO string, convert to the appropriate timezone, and format to AM/PM
        return dayjs(time).tz(timezone).format('hh:mm a');
    }

    // Return as is if it's the old format
    return time;
};

export type ShiftRowProps = {
    shift: inferRouterOutputs<AppRouter>['shifts']['byId'];
    isDepartmentFilterActive?: boolean;
    isChecklistComplete?: boolean;
};

export function ShiftRow(props: ShiftRowProps) {
    const dialogs = useDialogs();

    const shift = props?.shift || {};
    const { data: session } = useAuthQuery();
    const role = session?.user?.role ?? 'guest';

    // Get organization profile data for timezone
    const { data: businessProfile } = useBusinessProfileQuery();

    // Use the shift's timezone, or organization's timezone, or default to UTC
    const timezone = shift.timezone || businessProfile?.timezone || 'UTC';

    const isAdmin = ['admin', 'owner'].includes(role);

    function handleView() {
        dialogs.open(ShiftViewDialog, shift);
    }

    function handleEdit() {
        dialogs.open(ShiftDialog, shift);
    }

    function handleDuplicate() {
        // Create a new shift object with the necessary fields from the current shift
        const duplicatedShift = {
            ...shift,
            id: undefined, // Remove ID to create a new shift
            shiftAssignments: [], // Don't duplicate people assigned
            isNew: true, // Mark as a new shift
            isDuplicate: true, // Mark as a duplicated shift to preserve time values
            isCancelled: false, // Don't duplicate cancelled status
        };

        dialogs.open(ShiftDialog, duplicatedShift as any);
    }

    const { mutate: deleteShift } = useShiftDeleteMutation();

    async function handleDelete() {
        deleteShift(shift);
    }

    const { data: userLookup } = useTeamUsersLookupQuery();

    const activeAssignments =
        shift.shiftAssignments?.filter((assignment) => {
            // If userLookup is not ready, we default to showing them to avoid 0 flash,
            // UNLESS we are debugging locally, then maybe we want to be strict?
            // But for "2/1" bug, we suspect they are showing when they shouldn't.
            if (!userLookup) return true;

            const member = userLookup[assignment.memberId];
            // If member not found in lookup, they are likely deleted or hard-deleted.
            if (!member) return false;

            return !(member as any).isDeleted;
        }) || [];

    const filledSlots = activeAssignments.length;
    const totalAssignments = shift.shiftAssignments?.length || 0;

    return (
        <React.Fragment>
            {/*<CardMedia component="img" src={props.featuredImage} />*/}
            <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {shift.title}
                    {props.isChecklistComplete && (
                        <Tooltip title="Checklist Complete">
                            <CheckCircleIcon color="success" sx={{ ml: 1 }} />
                        </Tooltip>
                    )}
                    {shift.isCancelled && (
                        <Chip
                            label="Cancelled"
                            variant="outlined"
                            color="warning"
                            sx={{ ml: 2 }}
                        />
                    )}
                </Box>
            </TableCell>
            <TableCell sx={{ maxWidth: 300 }}>
                {shift.location?.name || shift.legacyLocation || ''}
                {shift.location?.address && (
                    <div
                        style={{
                            fontSize: '0.8rem',
                            color: 'rgba(0, 0, 0, 0.6)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {shift.location.address}
                    </div>
                )}
            </TableCell>
            {/*{!props.isDepartmentFilterActive && (*/}
            {/*    <TableCell>*/}
            {/*        {shift.department ? (*/}
            {/*            <div*/}
            {/*                style={{*/}
            {/*                    display: 'inline-block',*/}
            {/*                    backgroundColor: shift.department.color || '#f0f0f0',*/}
            {/*                    color: shift.department.color ? */}
            {/*                        (shift.department.color.toLowerCase() === '#ffffff' ? '#000000' : */}
            {/*                         shift.department.color.toLowerCase() === '#fff' ? '#000000' : */}
            {/*                         shift.department.color.match(/^#[0-9a-f]{6}$/i) && */}
            {/*                         (parseInt(shift.department.color.slice(1, 3), 16) * 0.299 + */}
            {/*                          parseInt(shift.department.color.slice(3, 5), 16) * 0.587 + */}
            {/*                          parseInt(shift.department.color.slice(5, 7), 16) * 0.114) > 186 ? */}
            {/*                         '#000000' : '#ffffff') : */}
            {/*                        '#000000',*/}
            {/*                    padding: '2px 8px',*/}
            {/*                    borderRadius: '4px',*/}
            {/*                    fontSize: '0.8125rem',*/}
            {/*                }}*/}
            {/*            >*/}
            {/*                {shift.department.name}*/}
            {/*            </div>*/}
            {/*        ) : shift.location?.defaultDepartment ? (*/}
            {/*            <div*/}
            {/*                style={{*/}
            {/*                    display: 'inline-block',*/}
            {/*                    backgroundColor: shift.location.defaultDepartment.color || '#f0f0f0',*/}
            {/*                    color: shift.location.defaultDepartment.color ? */}
            {/*                        (shift.location.defaultDepartment.color.toLowerCase() === '#ffffff' ? '#000000' : */}
            {/*                         shift.location.defaultDepartment.color.toLowerCase() === '#fff' ? '#000000' : */}
            {/*                         shift.location.defaultDepartment.color.match(/^#[0-9a-f]{6}$/i) && */}
            {/*                         (parseInt(shift.location.defaultDepartment.color.slice(1, 3), 16) * 0.299 + */}
            {/*                          parseInt(shift.location.defaultDepartment.color.slice(3, 5), 16) * 0.587 + */}
            {/*                          parseInt(shift.location.defaultDepartment.color.slice(5, 7), 16) * 0.114) > 186 ? */}
            {/*                         '#000000' : '#ffffff') : */}
            {/*                        '#000000',*/}
            {/*                    padding: '2px 8px',*/}
            {/*                    borderRadius: '4px',*/}
            {/*                    fontSize: '0.8125rem',*/}
            {/*                    opacity: 0.7, // Slightly faded to indicate it's inherited from location*/}
            {/*                }}*/}
            {/*            >*/}
            {/*                {shift.location.defaultDepartment.name}*/}
            {/*            </div>*/}
            {/*        ) : (*/}
            {/*            '-'*/}
            {/*        )}*/}
            {/*    </TableCell>*/}
            {/*)}*/}
            <TableCell>
                {shift.startTime &&
                    dayjs(shift.startTime).tz(timezone).format('YYYY-MM-DD')}
            </TableCell>
            <TableCell>
                {formatTime(shift.startTime.toString(), timezone)} -{' '}
                {formatTime(shift.endTime.toString(), timezone)}
            </TableCell>
            <TableCell>
                {filledSlots} / {shift.slots}
            </TableCell>
            <TableCell sx={{ minWidth: 152 }}>
                <Tooltip title="View">
                    <IconButton onClick={handleView}>
                        <VisibilityIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Edit">
                    <IconButton onClick={handleEdit}>
                        <EditIcon />
                    </IconButton>
                </Tooltip>
                {isAdmin && (
                    <Tooltip title="Duplicate">
                        <IconButton onClick={handleDuplicate} color="secondary">
                            <ContentCopyIcon />
                        </IconButton>
                    </Tooltip>
                )}
                {isAdmin && (
                    <Tooltip title="Delete">
                        <IconButton onClick={handleDelete}>
                            <DeleteIcon />
                        </IconButton>
                    </Tooltip>
                )}
            </TableCell>
        </React.Fragment>
    );
}
