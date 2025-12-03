'use client';

import * as React from 'react';
import { useAuth } from '@workos-inc/authkit-react';
import { OrganizationSwitcher, WorkOsWidgets } from '@workos-inc/widgets';
import { useWorkOSContext } from '@/components/providers/AuthKitProvider';
// import '@radix-ui/themes/styles.css';

/**
 * WorkOS Organization Switcher
 * Uses the pre-built WorkOS widget for organization switching
 */
export function WorkOSOrganizationSwitcher() {
    const { getAccessToken, switchToOrganization, user, isLoading } = useAuth();
    const { widgetToken } = useWorkOSContext();

    React.useEffect(() => {
        async function checkToken() {
            try {
                const token = await getAccessToken();
                console.log('[OrgSwitcher] Auth state:', {
                    hasToken: !!token,
                    hasUser: !!user,
                    isLoading,
                    hasWidgetToken: !!widgetToken,
                });
            } catch (e) {
                console.log(
                    '[OrgSwitcher] Client auth failed (expected if using widgetToken):',
                    e
                );
            }
        }
        checkToken();
    }, [getAccessToken, user, isLoading, widgetToken]);

    return (
        <WorkOsWidgets>
            <OrganizationSwitcher
                authToken={
                    widgetToken ? async () => widgetToken : getAccessToken
                }
                switchToOrganization={switchToOrganization}
            />
        </WorkOsWidgets>
    );
}
