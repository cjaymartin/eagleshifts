'use client';

import { authClient } from '@/lib/auth-client';
import { Chip } from '@mui/material';
import { useRouter } from 'next/navigation';
import React from 'react';

export default function OrgHeader() {
    const router = useRouter();

    const session = authClient.useSession();
    if (!session) {
        return null; // or a loading state, or redirect to login
    }

    const { data: currentOrganization } = authClient.useActiveOrganization();

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
