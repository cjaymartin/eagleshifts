'use client';

import * as React from 'react';
import { useAuth } from '@workos-inc/authkit-react';
import { UserSessions } from '@workos-inc/widgets';
import { useWorkOSContext } from '@/components/providers/AuthKitProvider';
import { Theme } from '@radix-ui/themes';

export function WorkOSUserSessions() {
    const { getAccessToken } = useAuth();
    const { widgetToken } = useWorkOSContext();

    return (
        <Theme>
            <UserSessions
                authToken={
                    widgetToken ? async () => widgetToken : getAccessToken
                }
            />
        </Theme>
    );
}
