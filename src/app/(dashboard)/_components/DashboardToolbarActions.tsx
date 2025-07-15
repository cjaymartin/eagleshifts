'use client';

import { Divider, MenuItem, MenuList, Stack, Typography } from '@mui/material';
import {
    Account,
    AccountPopoverFooter,
    AccountPreview,
    SignOutButton,
} from '@toolpad/core';
import OrgHeader from '@/app/(dashboard)/_components/OrgHeader';

export default function DashboardToolbarActions() {
    const CustomPopoverContent = () => (
        <Stack direction="column">
            {/* This will render the default Account preview */}
            <AccountPreview variant="expanded" />
            <Divider />

            {/*<Typography variant="body2" sx={{ mx: 2, mt: 1, mb: 0.5 }}>*/}
            {/*    Menu*/}
            {/*</Typography>*/}

            <MenuList>
                <MenuItem
                    component="a"
                    href="/account"
                    sx={{
                        justifyContent: 'flex-start',
                        width: '100%',
                    }}
                >
                    My Account
                </MenuItem>

                <MenuItem
                    component="a"
                    href="/business"
                    sx={{
                        justifyContent: 'flex-start',
                        width: '100%',
                    }}
                >
                    My Business
                </MenuItem>
            </MenuList>

            {/*<Divider />*/}

            {/* This will render the default Account footer with sign out button */}
            {/*<AccountFooter />*/}
            <AccountPopoverFooter>
                <SignOutButton />
            </AccountPopoverFooter>
        </Stack>
    );

    return (
        <Stack direction="row">
            {/*<OrgChooser />*/}
            {/* Add your toolbar actions here */}
            <Account
                slots={{
                    popoverContent: CustomPopoverContent,
                }}
            />
        </Stack>
    );
}
