'use client';

import * as React from 'react';
import { useAuth } from '@workos-inc/authkit-react';
import { UserProfile } from '@workos-inc/widgets';
import { useWorkOSContext } from '@/components/providers/AuthKitProvider';
import { Theme } from '@radix-ui/themes';

export function WorkOSUserProfile() {
    const { getAccessToken } = useAuth();
    const { widgetToken } = useWorkOSContext();

    return (
        <Theme>
            <UserProfile
                authToken={
                    widgetToken ? async () => widgetToken : getAccessToken
                }
            />
        </Theme>
    );
}
