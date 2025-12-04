'use client';

import * as React from 'react';
import { useAuth } from '@workos-inc/authkit-react';
import { UsersManagement, WorkOsWidgets } from '@workos-inc/widgets';
import { useWorkOSContext } from '@/components/providers/AuthKitProvider';
import { Theme } from '@radix-ui/themes';

export function WorkOSUsersManagement() {
    const { getAccessToken } = useAuth();
    const { widgetToken } = useWorkOSContext();

    return (
        <Theme>
            <WorkOsWidgets>
                <UsersManagement
                    authToken={
                        widgetToken ? async () => widgetToken : getAccessToken
                    }
                />
            </WorkOsWidgets>
        </Theme>
    );
}
