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
import { DateTime } from 'luxon';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import Download from '@mui/icons-material/Download';
import { useBusinessProfileQuery } from '@/queries/team';
import { ShiftRow } from './_components/ShiftRow';
import { DraftRow } from './_components/DraftRow';
import { useAuthQuery, useTeamUsersLookupQuery } from '@/queries/users';
import { ShiftFilters, ShiftFilterSchema } from './_components/ShiftFilters';
import { trpc } from '@/lib/trpc/client';
import { useDialogs } from '@toolpad/core';
import ShiftForm from '@/app/(dashboard)/shifts/_components/ShiftForm';
import ShiftDialog from '@/app/(dashboard)/shifts/_components/ShiftDialog';
import { useBatchCheckShiftChecklistsQuery } from '@/queries/shifts';
import {
    useShiftDraftsListQuery,
    useShiftDraftDeleteMutation,
} from '@/queries/shiftDrafts';

export default function Shifts() {
    //const { setNew: openAddShiftDialog } = useShiftDialogHelpers();
    const dialogs = useDialogs();

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

    // Get checklist completion status for all shifts in a single batch query
    const shiftIds = shifts?.map((shift) => shift.id) || [];
    const { data: checklistStatuses } =
        useBatchCheckShiftChecklistsQuery(shiftIds);

    const fileType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    const fileExtension = '.xlsx';

    const exportToXLSX = () => {
        const fileName = 'shifts-' + DateTime.utc().toFormat('yyyy-MM-dd');

        const csvData = shifts?.map((x) => {
            const { title, location, startTime, endTime, slots } = x;

            // Use the shift's timezone, or organization's timezone, or default to UTC
            const shiftTimezone =
                x.timezone || businessProfile?.timezone || 'UTC';

            // Format times using the appropriate timezone
            const formattedDate = DateTime.fromJSDate(startTime)
                .setZone(shiftTimezone)
                .toFormat('yyyy-MM-dd');
            const formattedStartTime = DateTime.fromJSDate(startTime)
                .setZone(shiftTimezone)
                .toFormat('hh:mm a');
            const formattedEndTime = DateTime.fromJSDate(endTime)
                .setZone(shiftTimezone)
                .toFormat('hh:mm a');

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
                                {/*{!filters?.departmentIds?.length && (*/}
                                {/*    <TableCell>Department</TableCell>*/}
                                {/*)}*/}
                                <TableCell>Date</TableCell>
                                <TableCell>Time</TableCell>
                                <TableCell>Slots</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {/* Draft shifts - shown at the TOP */}
                            {draftShifts.map((draft) => {
                                return (
                                    <TableRow key={`draft-${draft.id}`}>
                                        <DraftRow
                                            draft={draft}
                                            isDepartmentFilterActive={
                                                !!filters?.departmentIds?.length
                                            }
                                        />
                                    </TableRow>
                                );
                            })}

                            {/* Regular shifts */}
                            {shifts
                                ? shifts.map((shift) => {
                                      return (
                                          <TableRow key={shift.id}>
                                              <ShiftRow
                                                  shift={shift as any}
                                                  isDepartmentFilterActive={
                                                      !!filters?.departmentIds
                                                          ?.length
                                                  }
                                                  isChecklistComplete={
                                                      checklistStatuses
                                                          ? checklistStatuses[
                                                                shift.id
                                                            ]
                                                          : false
                                                  }
                                              />
                                          </TableRow>
                                      );
                                  })
                                : null}
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
