'use client';

import { NextAppProvider } from '@toolpad/core/nextjs';
import React, { useState, useEffect } from 'react';
import { NotificationsProvider } from '@toolpad/core';
import { usePathname } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { branding } from '@/config/branding';

type SmartAppProviderProps = {
    children: React.ReactNode;
};

export default function SmartAppProvider({ children }: SmartAppProviderProps) {
    const [navigation, setNavigation] = useState<
        Array<{ title: string; segment: string }>
    >([]);
    const pathname = usePathname();
    const { data: session } = authClient.useSession();

    useEffect(() => {
        // Regular navigation for standard users
        const REGULAR_NAVIGATION = [
            {
                title: 'Home',
                segment: '',
            },
            {
                title: 'Shifts',
                segment: 'shifts',
            },
            {
                title: 'Contact',
                segment: 'contact',
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
