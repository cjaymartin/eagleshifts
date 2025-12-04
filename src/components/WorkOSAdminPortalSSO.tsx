'use client';

import * as React from 'react';
import { useAuth } from '@workos-inc/authkit-react';
import { AdminPortalSsoConnection, WorkOsWidgets } from '@workos-inc/widgets';
import { useWorkOSContext } from '@/components/providers/AuthKitProvider';
import { Theme } from '@radix-ui/themes';

export function WorkOSAdminPortalSSO() {
    const { getAccessToken } = useAuth();
    const { widgetToken } = useWorkOSContext();

    return (
        <Theme>
            <WorkOsWidgets>
                <AdminPortalSsoConnection
                    authToken={
                        widgetToken ? async () => widgetToken : getAccessToken
                    }
                />
            </WorkOsWidgets>
        </Theme>
    );
}
