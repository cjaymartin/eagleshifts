'use client';

import React, { useState } from 'react';
import {
    Box,
    Container,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import Download from '@mui/icons-material/Download';
import { useBusinessProfileQuery } from '@/queries/team';

dayjs.extend(utc);
dayjs.extend(timezone);
import { ShiftRow } from './_components/ShiftRow';
import { DraftRow } from './_components/DraftRow';
import { useAuthQuery, useTeamUsersLookupQuery } from '@/queries/users';
import { ShiftFilters, ShiftFilterSchema } from './_components/ShiftFilters';
import { trpc } from '@/lib/trpc/client';
import { useDialogs } from '@toolpad/core';
import ShiftForm from '@/app/(dashboard)/shifts/_components/ShiftForm';
import ShiftDialog from '@/app/(dashboard)/shifts/_components/ShiftDialog';
import { useShiftDraftsListQuery, useShiftDraftDeleteMutation } from '@/queries/shiftDrafts';

export default function Shifts() {
    //const { setNew: openAddShiftDialog } = useShiftDialogHelpers();
    const dialogs = useDialogs();
    function openAddShiftDialog() {}

    const { data: session } = useAuthQuery();
    const role = session?.user?.role ?? 'guest';
    const isAdmin = ['admin', 'owner'].includes(role);
    const [filters, setFilters] = useState<ShiftFilterSchema>();
    const { data: userLookupData } = useTeamUsersLookupQuery();
    const userLookup = userLookupData || {};

    // Get organization profile data for timezone
    const { data: businessProfile } = useBusinessProfileQuery();
    const { data: shifts } = trpc.shifts.list.useQuery(filters as any);
    const { data: draftShifts = [] } = useShiftDraftsListQuery();

    const fileType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    const fileExtension = '.xlsx';

    const exportToXLSX = () => {
        const fileName = 'shifts-' + dayjs.utc().format('YYYY-MM-DD');

        const csvData = shifts?.map((x) => {
            const { title, location, startTime, endTime, slots } = x;

            // Use the shift's timezone, or organization's timezone, or default to UTC
            const shiftTimezone =
                x.timezone || businessProfile?.timezone || 'UTC';

            // Format times using the appropriate timezone
            const formattedDate = dayjs(startTime)
                .tz(shiftTimezone)
                .format('YYYY-MM-DD');
            const formattedStartTime = dayjs(startTime)
                .tz(shiftTimezone)
                .format('hh:mm a');
            const formattedEndTime = dayjs(endTime)
                .tz(shiftTimezone)
                .format('hh:mm a');

            const assignments = x.shiftAssignments
                .map((assignment) => userLookup[assignment.memberId])
                .filter(Boolean) // Filter out undefined values
                .map((user) => user.name || user.email)
                .join(', ');
            return {
                Shift: title,
                Location: location,
                Date: formattedDate,
                'Start Time': formattedStartTime,
                'End Time': formattedEndTime,
                Slots: slots,
                Assignments: assignments,
            };
        });

        const ws = XLSX.utils.json_to_sheet(csvData as any);
        const wb = { Sheets: { data: ws }, SheetNames: ['data'] };
        const excelBuffer = XLSX.write(wb, {
            bookType: 'xlsx',
            type: 'array',
        } as any);
        const data = new Blob([excelBuffer], { type: fileType });
        FileSaver.saveAs(data, fileName + fileExtension);
    };

    return (
        <Box>
            <Box>
                <ShiftFilters
                    filters={filters as any}
                    setFilters={setFilters}
                />
                <Box>
                    <IconButton onClick={exportToXLSX}>
                        <Download /> Download XLSX
                    </IconButton>
                </Box>
                <TableContainer component={Paper}>
                    {/*<ShiftDialog />*/}
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Title</TableCell>
                                <TableCell>Location</TableCell>

                                <TableCell>Date</TableCell>
                                <TableCell>Time</TableCell>
                                <TableCell>Slots</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {/* Regular shifts */}
                            {shifts
                                ? shifts.map((shift) => {
                                      return (
                                          <TableRow key={shift.id}>
                                              <ShiftRow shift={shift as any} />
                                          </TableRow>
                                      );
                                  })
                                : null}

                            {/* Draft shifts */}
                            {draftShifts.map((draft) => {
                                return (
                                    <TableRow key={`draft-${draft.id}`}>
                                        <DraftRow draft={draft} />
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
            {isAdmin && (
                <Container>
                    <IconButton onClick={() => dialogs.open(ShiftDialog, null)}>
                        <AddIcon /> Add Shift
                    </IconButton>
                </Container>
            )}
        </Box>
    );
}
