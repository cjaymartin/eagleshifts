'use client';

import React, { useState } from 'react';
import { Container, Tab, Typography, Link, Box } from '@mui/material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter } from 'next/navigation';
import MyProfileForm from './_components/MyProfileForm';
import NotificationsForm from './_components/NotificationsForm';
import IcalLinkControl from './_components/IcalLinkControl';

export default function AccountPage() {
    const [activeTab, setActiveTab] = useState('profile');
    const router = useRouter();

    const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
        setActiveTab(newValue);
    };

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
                    Account Settings
                </Typography>

                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    <TabList
                        onChange={handleTabChange}
                        aria-label="Account settings tabs"
                    >
                        <Tab label="Profile" value="profile" />
                        <Tab label="Notifications" value="notifications" />
                    </TabList>
                </Box>

                <TabPanel value="profile">
                    <Typography variant="h4" sx={{ mb: 2 }}>
                        My Profile
                    </Typography>
                    <MyProfileForm />

                    <Typography variant="h4" sx={{ mt: 4, mb: 2 }}>
                        iCal Link
                    </Typography>
                    <IcalLinkControl />
                </TabPanel>

                <TabPanel value="notifications">
                    <Typography variant="h4" sx={{ mb: 2 }}>
                        Notification Settings
                    </Typography>
                    <NotificationsForm />
                </TabPanel>
            </Container>
        </TabContext>
    );
}
