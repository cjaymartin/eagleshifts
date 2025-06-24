'use client';

import { authClient } from '@/lib/auth-client';
import { Chip, CircularProgress } from '@mui/material';
import { useRouter } from 'next/navigation';
import React from 'react';

export default function OrgHeader() {
    const router = useRouter();

    const session = authClient.useSession();

    const { data: currentOrganization, isPending: isOrgPending } =
        authClient.useActiveOrganization();

    const isLoading = isOrgPending || session.isPending;

    if (!session) {
        return null; // or a loading state, or redirect to login
    }

    if (isLoading) {
        return (
            <Chip
                sx={{ width: 75 }}
                label={<CircularProgress size={10} />}
                style={{ cursor: 'wait' }}
            />
        );
    }

    if (!currentOrganization?.name) return <React.Fragment />;

    if (currentOrganization?.slug === 'admin') {
        return (
            <Chip
                variant="outlined"
                onClick={() => router.push('/superadmin')}
                label={currentOrganization.name}
            />
        );
    }

    return <Chip label={currentOrganization.name} />;
}
