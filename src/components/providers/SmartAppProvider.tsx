'use client';

import { NextAppProvider } from '@toolpad/core/nextjs';
import React, { useState, useEffect } from 'react';
import EagleShiftIcon from '@/components/EagleShiftIcon';
import { Branding, NotificationsProvider } from '@toolpad/core';
import { usePathname } from 'next/navigation';

const BRANDING: Branding = {
    logo: <EagleShiftIcon width="3rem" />,
    title: 'EagleShifts',
    homeUrl: '/toolpad/core/introduction',
};

type SmartAppProviderProps = {
    children: React.ReactNode;
};

export default function SmartAppProvider({ children }: SmartAppProviderProps) {
    const [navigation, setNavigation] = useState<
        Array<{ title: string; segment: string }>
    >([]);
    const pathname = usePathname();

    useEffect(() => {
        // Regular navigation for standard users
        const REGULAR_NAVIGATION = [
            {
                title: 'Home',
                segment: '',
            },
            {
                title: 'About',
                segment: 'about',
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
            branding={BRANDING}
            authentication={authentication}
            session={null}
        >
            <NotificationsProvider>{children}</NotificationsProvider>
        </NextAppProvider>
    );
}
