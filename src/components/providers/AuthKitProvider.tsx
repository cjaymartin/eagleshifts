'use client';

import { AuthKitProvider as WorkOSAuthKitProvider } from '@workos-inc/authkit-react';
import { ReactNode, createContext, useContext } from 'react';

interface User {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    profilePictureUrl?: string | null;
}

interface AuthKitProviderProps {
    children: ReactNode;
    clientId: string;
    widgetToken?: string;
    user?: User | null;
}

interface WorkOSContextType {
    widgetToken?: string;
    user?: User | null;
}

const WorkOSContext = createContext<WorkOSContextType>({});

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
        <WorkOSContext.Provider value={{ widgetToken, user }}>
            <WorkOSAuthKitProvider clientId={clientId}>
                {children}
            </WorkOSAuthKitProvider>
        </WorkOSContext.Provider>
    );
}
