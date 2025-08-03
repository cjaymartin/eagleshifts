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
import { useTeamUsersLookupQuery, useAuthQuery } from '@/queries/users';
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
    memberId: string;
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
    const { data: session } = useAuthQuery();
    const user = session?.user;
    const currentMemberId = user?.memberId;
    const role = user?.role || 'member';
    const isAdmin = ['admin', 'owner'].includes(role);

    const assignments = rawAssignments || [];

    // Get list of member IDs to exclude from the new member dropdown
    const exclude = assignments.map((x) => x.memberId);

    // Check if the current user is in the assignments list
    const isCurrentUserAssigned =
        isAdmin ||
        assignments.some(
            (assignment) => assignment.memberId === currentMemberId
        );

    // If the user is not an admin and not in the assignments list, don't show the tool
    if (!isAdmin && !isCurrentUserAssigned) {
        return null;
    }

    // Handler for adding a new team member to the assignments
    function handleAdd(memberId: string) {
        if (readOnly) return;

        const newAssignmentRow: ShiftAssignmentToolAssignmentRow = {
            memberId: memberId,
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
                                            x.memberId === row.memberId
                                                ? { ...x, ...data }
                                                : x
                                    );
                                    onChange(newAssignments);
                                }}
                                onDelete={() => {
                                    const newAssignments = assignments.filter(
                                        (x) => x.memberId !== row.memberId
                                    );
                                    onChange(newAssignments);
                                }}
                                key={row.memberId}
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
