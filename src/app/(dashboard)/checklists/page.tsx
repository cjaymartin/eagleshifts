'use client';

import React from 'react';
import { Typography, Box, Container, Paper, Tabs, Tab } from '@mui/material';
import { useAuthQuery } from '@/queries/users';
import ChecklistList from './_components/ChecklistList';
import MemberChecklistView from './_components/MemberChecklistView';

export default function ChecklistsPage() {
    const [tabValue, setTabValue] = React.useState(0);
    const { data: auth } = useAuthQuery();
    const isAdmin =
        auth?.user?.role === 'admin' || auth?.user?.role === 'owner';

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    return (
        <Container maxWidth="lg">
            <Box sx={{ my: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Checklists
                </Typography>

                {isAdmin ? (
                    <Paper sx={{ width: '100%', mb: 2 }}>
                        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                            <Tabs
                                value={tabValue}
                                onChange={handleTabChange}
                                aria-label="checklist tabs"
                            >
                                <Tab label="Manage Checklists" />
                                <Tab label="Upcoming Checklists" />
                            </Tabs>
                        </Box>
                        <Box sx={{ p: 3 }}>
                            {tabValue === 0 && <ChecklistList />}
                            {tabValue === 1 && <MemberChecklistView />}
                        </Box>
                    </Paper>
                ) : (
                    <Paper sx={{ width: '100%', mb: 2, p: 3 }}>
                        <MemberChecklistView />
                    </Paper>
                )}
            </Box>
        </Container>
    );
}
