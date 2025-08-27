'use client';

import React from 'react';
import { Chip, IconButton, TableCell, Tooltip } from '@mui/material';
import dayjs from 'dayjs';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuthQuery } from '@/queries/users';
import { useDialogs } from '@toolpad/core';
import ShiftDialog from '@/app/(dashboard)/shifts/_components/ShiftDialog';
import { useShiftDraftDeleteMutation } from '@/queries/shiftDrafts';
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

export type DraftRowProps = {
    draft: any; // Using any for now, should be properly typed
    isDepartmentFilterActive?: boolean;
};

export function DraftRow(props: DraftRowProps) {
    const dialogs = useDialogs();

    const draft = props?.draft || {};
    const { data: session } = useAuthQuery();
    const role = session?.user?.role ?? 'guest';

    // Get organization profile data for timezone
    const { data: businessProfile } = useBusinessProfileQuery();

    // Use the draft's timezone, or organization's timezone, or default to UTC
    const timezone = draft.timezone || businessProfile?.timezone || 'UTC';

    function handleEdit() {
        // Convert draft to shift format for the ShiftDialog
        const shiftFromDraft = {
            ...draft,
            id: undefined, // Remove ID to create a new shift
            isNew: true, // Mark as a new shift
            isDraft: true, // Mark as coming from a draft
            draftId: draft.id, // Store the draft ID for later deletion
            isCancelled: false,
            shiftAssignments: [], // No assignments for drafts
        };

        dialogs.open(ShiftDialog, shiftFromDraft as any);
    }

    const { mutate: deleteDraft } = useShiftDraftDeleteMutation();

    async function handleDelete() {
        deleteDraft({ id: draft.id });
    }

    return (
        <React.Fragment>
            <TableCell>
                {draft.title}
                <Chip
                    label="Draft"
                    variant="outlined"
                    color="info"
                    sx={{ ml: 2 }}
                />
            </TableCell>
            <TableCell sx={{ maxWidth: 300 }}>
                {draft.location?.name || draft.legacyLocation || ''}
                {draft.location?.address && (
                    <div
                        style={{
                            fontSize: '0.8rem',
                            color: 'rgba(0, 0, 0, 0.6)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {draft.location.address}
                    </div>
                )}
            </TableCell>

            {!props.isDepartmentFilterActive && (
                <TableCell>
                    {draft.department ? (
                        <div
                            style={{
                                display: 'inline-block',
                                backgroundColor: draft.department.color || '#f0f0f0',
                                color: draft.department.color ? 
                                    (draft.department.color.toLowerCase() === '#ffffff' ? '#000000' : 
                                     draft.department.color.toLowerCase() === '#fff' ? '#000000' : 
                                     draft.department.color.match(/^#[0-9a-f]{6}$/i) && 
                                     (parseInt(draft.department.color.slice(1, 3), 16) * 0.299 + 
                                      parseInt(draft.department.color.slice(3, 5), 16) * 0.587 + 
                                      parseInt(draft.department.color.slice(5, 7), 16) * 0.114) > 186 ? 
                                     '#000000' : '#ffffff') : 
                                    '#000000',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.8125rem',
                            }}
                        >
                            {draft.department.name}
                        </div>
                    ) : draft.location?.defaultDepartment ? (
                        <div
                            style={{
                                display: 'inline-block',
                                backgroundColor: draft.location.defaultDepartment.color || '#f0f0f0',
                                color: draft.location.defaultDepartment.color ? 
                                    (draft.location.defaultDepartment.color.toLowerCase() === '#ffffff' ? '#000000' : 
                                     draft.location.defaultDepartment.color.toLowerCase() === '#fff' ? '#000000' : 
                                     draft.location.defaultDepartment.color.match(/^#[0-9a-f]{6}$/i) && 
                                     (parseInt(draft.location.defaultDepartment.color.slice(1, 3), 16) * 0.299 + 
                                      parseInt(draft.location.defaultDepartment.color.slice(3, 5), 16) * 0.587 + 
                                      parseInt(draft.location.defaultDepartment.color.slice(5, 7), 16) * 0.114) > 186 ? 
                                     '#000000' : '#ffffff') : 
                                    '#000000',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.8125rem',
                                opacity: 0.7, // Slightly faded to indicate it's inherited from location
                            }}
                        >
                            {draft.location.defaultDepartment.name}
                        </div>
                    ) : (
                        '-'
                    )}
                </TableCell>
            )}

            <TableCell>
                {draft.date &&
                    dayjs(draft.date).tz(timezone).format('YYYY-MM-DD')}
            </TableCell>
            <TableCell>
                {draft.startTime
                    ? formatTime(draft.startTime.toString(), timezone)
                    : 'TBD'}
                {draft.startTime || draft.endTime ? ' - ' : ''}
                {draft.endTime
                    ? formatTime(draft.endTime.toString(), timezone)
                    : draft.startTime
                      ? 'TBD'
                      : ''}
            </TableCell>
            <TableCell>0 / {draft.slots}</TableCell>
            <TableCell sx={{ minWidth: 152 }}>
                <Tooltip title="Edit">
                    <IconButton onClick={handleEdit}>
                        <EditIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                    <IconButton onClick={handleDelete}>
                        <DeleteIcon />
                    </IconButton>
                </Tooltip>
            </TableCell>
        </React.Fragment>
    );
}
