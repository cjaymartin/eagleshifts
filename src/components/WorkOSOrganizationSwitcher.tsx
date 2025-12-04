'use client';

import * as React from 'react';
import { useAuth } from '@workos-inc/authkit-react';
import { OrganizationSwitcher } from '@workos-inc/widgets';
import { useWorkOSContext } from '@/components/providers/AuthKitProvider';
import { Theme } from '@radix-ui/themes';

/**
 * WorkOS Organization Switcher
 * Uses the pre-built WorkOS widget for organization switching
 */
export function WorkOSOrganizationSwitcher() {
    const { getAccessToken, switchToOrganization, user } = useAuth();
    const { widgetToken } = useWorkOSContext();

    // Handle organization switch via backend API
    const handleSwitchOrganization = React.useCallback(
        async ({ organizationId }: { organizationId: string }) => {
            console.log(
                '[OrgSwitcher] Switching to organization:',
                organizationId
            );
            try {
                // Call backend API to switch organization
                const response = await fetch('/api/organizations/switch', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ organizationId }),
                });

                if (!response.ok) {
                    throw new Error('Failed to switch organization');
                }

                const { redirectUrl } = await response.json();

                // If backend returns a redirect URL, user needs to reauthorize with new org
                if (redirectUrl) {
                    console.log(
                        '[OrgSwitcher] Redirecting to reauthorize:',
                        redirectUrl
                    );
                    window.location.href = redirectUrl;
                } else {
                    // No reauth needed, just reload
                    console.log(
                        '[OrgSwitcher] Switch successful, reloading...'
                    );
                    window.location.reload();
                }
            } catch (error) {
                console.error('[OrgSwitcher] Switch failed:', error);
            }
        },
        []
    );

    return (
        <Theme>
            <OrganizationSwitcher
                authToken={
                    widgetToken ? async () => widgetToken : getAccessToken
                }
                switchToOrganization={handleSwitchOrganization}
            />
        </Theme>
    );
}
