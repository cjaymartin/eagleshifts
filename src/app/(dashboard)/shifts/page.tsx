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
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import Download from '@mui/icons-material/Download';
import { useShiftListQuery } from '@/queries/shifts';
import { ShiftRow } from './_components/ShiftRow';
import { useAuthQuery } from '@/queries/user';
import { ShiftFilters, ShiftFilterSchema } from './_components/ShiftFilters';
//import { useTeamUsers } from '../../store/TeamUser';

export default function Shifts() {
    //const { setNew: openAddShiftDialog } = useShiftDialogHelpers();

    function openAddShiftDialog() {}

    const { data: session } = useAuthQuery();
    const role = session?.user?.role ?? 'guest';
    //const role = 'owner';
    const isAdmin = ['admin', 'owner'].includes(role);
    const [filters, setFilters] = useState<ShiftFilterSchema>();
    //const { userLookup } = useTeamUsers();
    const userLookup = {};

    //let { shifts } = useFilteredShifts({ ...(filters || {}) });
    const { data: shifts } = useShiftListQuery(filters);

    console.log({ shifts });

    const fileType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    const fileExtension = '.xlsx';

    const exportToXLSX = () => {
        const fileName = 'shifts-' + dayjs().format('YYYY-MM-DD');

        const csvData = shifts?.map((x) => {
            const { title, location, date, startTime, endTime, slots } = x;
            const assignments = x.assignments
                .map((x) => userLookup[x])
                .map((x) => x.displayName || x.email)
                .join(', ');
            return {
                Shift: title,
                Location: location,
                Date: date,
                'Start Time': startTime,
                'End Time': endTime,
                Slots: slots,
                Assignments: assignments,
            };
        });

        const ws = XLSX.utils.json_to_sheet(csvData);
        const wb = { Sheets: { data: ws }, SheetNames: ['data'] };
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: fileType });
        FileSaver.saveAs(data, fileName + fileExtension);
    };

    return (
        <Box>
            <Box>
                <ShiftFilters filters={filters} setFilters={setFilters} />
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
                            {shifts
                                ? shifts.map((shift) => {
                                      return (
                                          <TableRow
                                              key={shift.id}
                                              size={{ xs: 12, sm: 6, md: 4 }}
                                          >
                                              <ShiftRow shift={shift} />
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
                    <IconButton onClick={() => openAddShiftDialog()}>
                        <AddIcon /> Add Shift
                    </IconButton>
                </Container>
            )}
        </Box>
    );
}
