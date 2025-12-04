'use client';

import React, { useState } from 'react';
import { Container, Tab, Typography, Link, Box } from '@mui/material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter } from 'next/navigation';
import BusinessProfileForm from './_components/BusinessProfileForm';
import BusinessNotificationsForm from './_components/BusinessNotificationsForm';
import BusinessShiftSettingsForm from './_components/BusinessShiftSettingsForm';
import { useAuthQuery } from '@/queries/users';

export default function BusinessPage() {
    const [activeTab, setActiveTab] = useState('profile');
    const router = useRouter();
    const { data: session } = useAuthQuery();
    const role = session?.user?.role || 'member';
    const isAdmin = ['admin', 'owner'].includes(role);

    // Redirect non-admin users
    React.useEffect(() => {
        if (session && !isAdmin) {
            router.push('/calendar');
        }
    }, [session, isAdmin, router]);

    const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
        setActiveTab(newValue);
    };

    if (!isAdmin) {
        return (
            <Container maxWidth="lg">
                <Typography variant="h4" sx={{ mt: 4 }}>
                    You don&apos;t have permission to access this page.
                </Typography>
            </Container>
        );
    }

    return (
        <TabContext value={activeTab}>
            <Container maxWidth="lg">
                <Link
                    component="button"
                    onClick={() => router.push('/calendar')}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        mb: 2,
                        fontSize: 18,
                        color: 'primary.main',
                        '&:hover': { textDecoration: 'underline' },
                    }}
                >
                    <ArrowBackIcon fontSize="small" />
                    Back
                </Link>

                <Typography variant="h3" sx={{ mb: 3 }}>
                    Business Settings
                </Typography>

                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    <TabList
                        onChange={handleTabChange}
                        aria-label="Business settings tabs"
                    >
                        <Tab label="Profile" value="profile" />
                        <Tab label="Notifications" value="notifications" />
                        <Tab label="Shift Settings" value="shift_settings" />
                    </TabList>
                </Box>

                <TabPanel value="profile">
                    <Typography variant="h4" sx={{ mb: 2 }}>
                        Business Profile
                    </Typography>
                    <BusinessProfileForm />
                </TabPanel>

                <TabPanel value="notifications">
                    <Typography variant="h4" sx={{ mb: 2 }}>
                        Notification Settings
                    </Typography>
                    <BusinessNotificationsForm />
                </TabPanel>

                <TabPanel value="shift_settings">
                    <Typography variant="h4" sx={{ mb: 2 }}>
                        Shift Settings
                    </Typography>
                    <BusinessShiftSettingsForm />
                </TabPanel>
            </Container>
        </TabContext>
    );
}
