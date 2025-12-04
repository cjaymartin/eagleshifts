'use client';

import { AuthKitProvider as WorkOSAuthKitProvider } from '@workos-inc/authkit-react';
import { WorkOsWidgets } from '@workos-inc/widgets';
import { createContext, useContext } from 'react';
import type { User } from '@workos-inc/node';

interface AuthKitProviderProps {
    children: React.ReactNode; // Keep ReactNode for children prop
    clientId: string;
    widgetToken?: string;
    user?: User | null;
}

interface WorkOSContextValue {
    widgetToken: string | null;
    user: User | null;
}

const WorkOSContext = createContext<WorkOSContextValue>({
    widgetToken: null,
    user: null,
});

export function useWorkOSContext() {
    return useContext(WorkOSContext);
}

export function AuthKitProvider({
    children,
    clientId,
    widgetToken,
    user,
}: AuthKitProviderProps) {
    console.log('[AuthKitProvider] Initializing', {
        clientId,
        hasWidgetToken: !!widgetToken,
        hasUser: !!user,
    });

    return (
        <WorkOSContext.Provider
            value={{ widgetToken: widgetToken || null, user: user || null }}
        >
            <WorkOSAuthKitProvider clientId={clientId}>
                <WorkOsWidgets>{children}</WorkOsWidgets>
            </WorkOSAuthKitProvider>
        </WorkOSContext.Provider>
    );
}
