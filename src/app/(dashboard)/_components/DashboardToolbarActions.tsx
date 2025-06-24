'use client';

import { Stack } from '@mui/material';
import { Account } from '@toolpad/core';
import OrgHeader from '@/app/(dashboard)/_components/OrgHeader';

export default function DashboardToolbarActions() {
    return (
        <Stack direction="row">
            {/*<OrgChooser />*/}
            {/* Add your toolbar actions here */}
            <Account />
        </Stack>
    );
}
