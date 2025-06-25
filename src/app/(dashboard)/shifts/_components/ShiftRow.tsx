'use client';

import React, { useContext, useEffect } from 'react';
//import { DialogContext } from '../../context/DialogContext'
import { IconButton, TableCell } from '@mui/material';
import dayjs from 'dayjs';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuthQuery } from '@/queries/user';
import { useDialogs } from '@toolpad/core';
import ShiftDialog from '@/app/(dashboard)/shifts/_components/ShiftDialog';
//import useAuth from '../../components/hooks/useAuth'

// Helper function to format time from ISO to AM/PM format
const formatTime = (time) => {
    if (!time) return '';

    // Handle ISO format strings
    if (typeof time === 'string' && time.includes('T')) {
        // Parse the ISO string and convert to AM/PM format
        return dayjs(time).format('hh:mm a');
    }

    // Return as is if it's the old format
    return time;
};

export function ShiftRow(props) {
    const dialogs = useDialogs();

    const shift = props?.shift || {};
    //const linkLocation = useLocation();
    //const [_, setDialog] = useContext(DialogContext);
    const { setNew: openAddShiftDialog } = props;
    const { data: session } = useAuthQuery();
    const role = session?.user?.role ?? 'guest';

    const isAdmin = ['admin', 'owner'].includes(role);

    //This catches a view/edit request from the "ShiftRequests" page...
    //const { shiftId: fromShiftId } = linkLocation.state || {};
    // useEffect(() => {
    //     if (fromShiftId && fromShiftId === shift.id) {
    //         handleEdit();
    //     }
    // }, [fromShiftId]);

    const id = shift?.id;

    function handleEdit() {
        dialogs.open(ShiftDialog, shift);
        // setDialog({
        //     type: 'shift',
        //     open: true,
        //     doc: shift,
        //     form: shift,
        // });
    }

    function handleDelete() {
        shift.delete();
    }

    const filledSlots = shift.assignments?.length || 0;

    return (
        <React.Fragment>
            {/*<CardMedia component="img" src={props.featuredImage} />*/}
            <TableCell>{shift.title}</TableCell>
            <TableCell>{shift.location}</TableCell>

            <TableCell>
                {shift.date && dayjs(shift.date).format('YYYY-MM-DD')}
            </TableCell>
            <TableCell>
                {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
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
