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
import { useTeamUserByIdQuery } from '@/queries/users';

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
    const { data: user, isPending } = useTeamUserByIdQuery(row?.userId);

    const [rawOpen, setOpen] = useState(false);

    const shouldShowOpen = row.outcome !== 'assigned';
    const open = rawOpen && shouldShowOpen;

    useEffect(() => {
        if (!user && !isPending) {
            onDelete();
        }
    }, [isPending, user]);

    if (isPending || !user) return null;

    return (
        <React.Fragment>
            <TableRow
                key={row.userId}
                sx={{
                    '&:last-child td, &:last-child th': { border: 0 },
                    '& > *': { borderBottom: 'unset' },
                }}
            >
                <TableCell>{user.name}</TableCell>
                <TableCell width="small">
                    <OutcomeSelect
                        value={row.outcome || 'waiting'}
                        onChange={(value) => {
                            onChange({
                                ...row,
                                outcome: value,
                            });
                        }}
                    />
                    {shouldShowOpen && (
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
                {!readOnly && (
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
                            />
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
}
