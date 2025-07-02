'use client';

import { NextAppProvider } from '@toolpad/core/nextjs';
import React, { useState, useEffect, Suspense } from 'react';
import { NotificationsProvider } from '@toolpad/core';
import { usePathname } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { branding } from '@/config/branding';

type SmartAppProviderProps = {
    children: React.ReactNode;
};

// This component will handle the session loading
function SessionAwareProvider({ children }: { children: React.ReactNode }) {
    const [navigation, setNavigation] = useState<
        Array<{ title: string; segment: string }>
    >([]);
    const pathname = usePathname();
    const { data: session, isPending } = authClient.useSession();

    useEffect(() => {
        // Regular navigation for standard users
        const REGULAR_NAVIGATION = [
            {
                title: 'Calendar',
                segment: 'calendar',
            },
            {
                title: 'Shifts',
                segment: 'shifts',
            },
            {
                title: 'Availability',
                segment: 'availability',
            },
            {
                title: 'Shift Requests',
                segment: 'requests',
            },
            {
                title: 'My Team',
                segment: 'team',
            },
        ];

        // Super admin navigation
        const SUPERADMIN_NAVIGATION = [
            {
                title: 'Dashboard',
                segment: 'superadmin',
            },
            {
                title: 'Tenants',
                segment: 'superadmin/tenants',
            },
            {
                title: 'Users',
                segment: 'superadmin/users',
            },
            {
                title: 'Settings',
                segment: 'superadmin/settings',
            },
        ];

        // Determine which navigation to use based on the path
        const selectedNavigation = pathname?.startsWith('/superadmin')
            ? SUPERADMIN_NAVIGATION
            : REGULAR_NAVIGATION;

        setNavigation(selectedNavigation);
    }, [pathname]);

    const authentication = {
        signIn: async () => {
            window.location.href = '/auth/login';
        },
        signOut: async () => {
            window.location.href = '/auth/logout';
        },
    };

    // If session is still loading, return null or a loading indicator
    // This will be caught by the Suspense boundary in SmartAppProvider
    if (isPending) {
        return null;
    }

    return (
        <NextAppProvider
            navigation={navigation}
            branding={branding}
            authentication={authentication}
            session={session}
        >
            <NotificationsProvider>{children}</NotificationsProvider>
        </NextAppProvider>
    );
}

export default function SmartAppProvider({ children }: SmartAppProviderProps) {
    return (
        <Suspense fallback={null}>
            <SessionAwareProvider>{children}</SessionAwareProvider>
        </Suspense>
    );
}
