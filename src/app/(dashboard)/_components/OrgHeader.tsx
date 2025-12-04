'use client';

import { Chip, CircularProgress } from '@mui/material';
import { useRouter } from 'next/navigation';
import React from 'react';
import { useAuthQuery } from '@/queries/users';

export default function OrgHeader() {
    const router = useRouter();
    const { data: session, isLoading } = useAuthQuery();

    if (isLoading) {
        return (
            <Chip
                sx={{ width: 75 }}
                label={<CircularProgress size={10} />}
                style={{ cursor: 'wait' }}
            />
        );
    }

    if (!session?.organization?.name) {
        return <React.Fragment />;
    }

    // Check if this is the admin organization by name
    // We use name instead of ID because org IDs vary across environments
    if (session.organization.name === 'Admin') {
        return (
            <Chip
                variant="outlined"
                onClick={() => router.push('/superadmin')}
                label={session.organization.name}
                sx={{ cursor: 'pointer' }}
            />
        );
    }

    return <Chip label={session.organization.name} />;
}
