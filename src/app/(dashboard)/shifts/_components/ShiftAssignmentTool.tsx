import React from 'react';
import {
    Container,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import ShiftAssignmentToolRow from './ShiftAssignmentTool/ShiftAssignmentToolRow';
import NewTeamMemberRow from './ShiftAssignmentTool/NewTeamMemberRow';
import { useTeamUsersLookupQuery } from '@/queries/users';
import { inferRouterOutputs } from '@trpc/server';
import { AppRouter } from '@/api/trpc/[trpc]';

export type ShiftAssignmentToolProps = {
    date: Date;
    shift: inferRouterOutputs<AppRouter>['shifts']['byId'];
    value: Array<ShiftAssignmentToolAssignmentRow>;
    onChange: (value: Array<ShiftAssignmentToolAssignmentRow>) => void;
    readOnly?: boolean;
};

export type ShiftAssignmentToolAssignmentRow = {
    userId: string;
    outcome: 'assigned' | 'waiting' | 'refused';
    reason?: string;
};

export default function ShiftAssignmentTool({
    shift,
    readOnly,
    date,
    value: rawAssignments,
    onChange,
}: ShiftAssignmentToolProps) {
    const { data: userLookup } = useTeamUsersLookupQuery();
    const assignments = rawAssignments || [];

    // Get list of user IDs to exclude from the new member dropdown
    const exclude = assignments.map((x) => x.userId);

    // Handler for adding a new team member to the assignments
    function handleAdd(userId: string) {
        if (readOnly) return;

        const newAssignmentRow: ShiftAssignmentToolAssignmentRow = {
            userId: userId,
            outcome: 'waiting',
            reason: '',
        };

        onChange([...assignments, newAssignmentRow]);
    }

    return (
        <Container maxWidth="md">
            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Member</TableCell>
                            <TableCell>Outcome</TableCell>
                            <TableCell align="right"></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {assignments.map((row) => (
                            <ShiftAssignmentToolRow
                                row={row}
                                onChange={(data) => {
                                    console.dir(data);
                                    //splice the newly added data into the row dynamically
                                    const newAssignments = assignments.map(
                                        (x) =>
                                            x.userId === row.userId
                                                ? { ...x, ...data }
                                                : x
                                    );
                                    console.log({ newAssignments, data });
                                    onChange(newAssignments);
                                }}
                                onDelete={() => {
                                    const newAssignments = assignments.filter(
                                        (x) => x.userId !== row.userId
                                    );
                                    console.log(
                                        'Delete assignment for user:',
                                        row.userId
                                    );
                                    onChange(newAssignments);
                                }}
                                key={row.userId}
                            />
                        ))}
                        <TableRow>
                            <TableCell
                                colSpan={4}
                                sx={{
                                    backgroundColor: '#e1e1e1',
                                    height: '2px',
                                    padding: '1px',
                                }}
                            />
                        </TableRow>
                        {!readOnly && (
                            <NewTeamMemberRow
                                onAdd={handleAdd}
                                exclude={exclude}
                                date={date}
                            />
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Container>
    );
}
