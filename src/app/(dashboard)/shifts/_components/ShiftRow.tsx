'use client';

import React from 'react';
import { IconButton, TableCell } from '@mui/material';
import dayjs from 'dayjs';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuthQuery } from '@/queries/users';
import { useDialogs } from '@toolpad/core';
import ShiftDialog from '@/app/(dashboard)/shifts/_components/ShiftDialog';
import { inferRouterOutputs } from '@trpc/server';
import { AppRouter } from '@/api/trpc/[trpc]';
import { useShiftDeleteMutation } from '@/queries/shifts';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

// Helper function to format time from ISO to AM/PM format
const formatTime = (time: string) => {
    if (!time) return '';

    // Handle ISO format strings
    if (time.includes('T')) {
        // Parse the ISO string and convert to AM/PM format
        return dayjs.utc(time).format('hh:mm a');
    }

    // Return as is if it's the old format
    return time;
};

export type ShiftRowProps = {
    shift: inferRouterOutputs<AppRouter>['shifts']['byId'];
};

export function ShiftRow(props: ShiftRowProps) {
    const dialogs = useDialogs();

    const shift = props?.shift || {};
    const { data: session } = useAuthQuery();
    const role = session?.user?.role ?? 'guest';

    const isAdmin = ['admin', 'owner'].includes(role);

    function handleEdit() {
        dialogs.open(ShiftDialog, shift);
    }

    const { mutate: deleteShift } = useShiftDeleteMutation();

    async function handleDelete() {
        deleteShift(shift);
    }

    const filledSlots = shift.shiftAssignments?.length || 0;

    return (
        <React.Fragment>
            {/*<CardMedia component="img" src={props.featuredImage} />*/}
            <TableCell>{shift.title}</TableCell>
            <TableCell>{shift.location}</TableCell>

            <TableCell>
                {shift.date && dayjs.utc(shift.date).format('YYYY-MM-DD')}
            </TableCell>
            <TableCell>
                {formatTime(shift.startTime.toString())} -{' '}
                {formatTime(shift.endTime.toString())}
            </TableCell>
            <TableCell>
                {filledSlots} / {shift.slots}
            </TableCell>
            <TableCell>
                <IconButton onClick={handleEdit}>
                    <EditIcon />
                </IconButton>
                {isAdmin && (
                    <IconButton onClick={handleDelete}>
                        <DeleteIcon />
                    </IconButton>
                )}
            </TableCell>
        </React.Fragment>
    );
}
