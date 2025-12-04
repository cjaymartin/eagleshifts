'use client';

import { Stack } from '@mui/material';
import { WorkOSOrganizationSwitcher } from '@/components/WorkOSOrganizationSwitcher';
import { WorkOSUserButton } from '@/components/WorkOSUserButton';

export default function DashboardToolbarActions() {
    return (
        <Stack direction="row" spacing={1} alignItems="center">
            <WorkOSOrganizationSwitcher />
            <WorkOSUserButton />
        </Stack>
    );
}
