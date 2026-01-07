import {
    Collapse,
    IconButton,
    TableCell,
    TableRow,
    TextField,
} from '@mui/material';
import OutcomeSelect from './OutcomeSelect';
import {
    Delete,
    KeyboardArrowDown,
    KeyboardArrowUp,
} from '@mui/icons-material';
import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { ShiftAssignmentToolAssignmentRow } from '@/app/(dashboard)/shifts/_components/ShiftAssignmentTool';
import { useTeamUserByIdQuery, useAuthQuery } from '@/queries/users';

export type ShiftAssignmentToolRowProps = {
    row: ShiftAssignmentToolAssignmentRow;
    onChange: (row: ShiftAssignmentToolAssignmentRow) => void;
    onDelete: () => void;
    readOnly?: boolean;
};

export default function ShiftAssignmentToolRow({
    row,
    onChange,
    readOnly,
    onDelete,
}: ShiftAssignmentToolRowProps) {
    const { data: session } = useAuthQuery();
    const currentUser = session?.user;
    const isCurrentUserRow = row?.memberId === currentUser?.memberId;
    const role = currentUser?.role || 'member';
    const isAdmin = ['admin', 'owner'].includes(role);

    // If this is the current user's row, use session data instead of fetching
    // Use cached team lookup for other users to get isActive status
    const { data: fetchedMember, isLoading: isPending } = useTeamUserByIdQuery(
        (isCurrentUserRow ? '' : row?.memberId) as any
    );

    // Use session data for current user, or fetched data for other users
    const member = isCurrentUserRow
        ? { id: currentUser.memberId, name: currentUser.name, isDeleted: false }
        : fetchedMember;

    const [rawOpen, setOpen] = useState(false);

    const shouldShowOpen = row.outcome !== 'assigned';
    const open = rawOpen && shouldShowOpen;

    useEffect(() => {
        if (!member && !isPending) {
            onDelete();
        }
    }, [isPending, member]);

    // If not admin and not current user's row, don't show the row
    if (!isAdmin && !isCurrentUserRow) return null;

    // If pending and not current user's row, or no member data, don't show the row
    if ((isPending && !isCurrentUserRow) || !member) return null;

    return (
        <React.Fragment>
            <TableRow
                key={row.memberId}
                sx={{
                    '&:last-child td, &:last-child th': { border: 0 },
                    '& > *': { borderBottom: 'unset' },
                }}
            >
                <TableCell
                    sx={{
                        color: (member as any).isDeleted
                            ? 'text.disabled'
                            : 'inherit',
                    }}
                >
                    {member.name}
                    {(member as any).isDeleted && ' (Inactive)'}
                </TableCell>
                <TableCell width="small">
                    <OutcomeSelect
                        value={row.outcome || 'waiting'}
                        onChange={(value) => {
                            onChange({
                                ...row,
                                outcome: value,
                            });
                        }}
                        readOnly={!isAdmin}
                    />
                    {shouldShowOpen && isAdmin && (
                        <IconButton
                            aria-label="expand row"
                            size="small"
                            onClick={() => setOpen(!open)}
                        >
                            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                        </IconButton>
                    )}
                </TableCell>

                {/*<TableCell>{row.reason}</TableCell>*/}
                {!readOnly && isAdmin && (
                    <TableCell align="right" width="small">
                        <IconButton onClick={() => onDelete()}>
                            <Delete />
                        </IconButton>
                    </TableCell>
                )}
            </TableRow>
            <TableRow>
                <TableCell
                    style={{ paddingBottom: 0, paddingTop: 0 }}
                    colSpan={4}
                >
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1 }}>
                            <Typography
                                variant="h6"
                                gutterBottom
                                component="div"
                            >
                                Reason
                            </Typography>
                            <TextField
                                value={row.reason}
                                onChange={(event) => {
                                    onChange({
                                        ...row,
                                        reason: event.target.value,
                                    });
                                }}
                                slotProps={{
                                    input: {
                                        readOnly: !isAdmin,
                                    },
                                }}
                            />
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
}
