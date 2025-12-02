'use client';

import { Button } from '@mui/material';
import { signOutAction } from '@/app/actions/auth';

export function SignOutButton() {
    return (
        <Button
            variant="contained"
            color="secondary"
            onClick={() => signOutAction()}
        >
            Sign Out
        </Button>
    );
}
