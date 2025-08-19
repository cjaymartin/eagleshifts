'use client';

import { NextAppProvider } from '@toolpad/core/nextjs';
import React, { useState, useEffect, Suspense } from 'react';
import { NotificationsProvider } from '@/components/providers/NotificationsProvider';
import { usePathname } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { branding } from '@/config/branding';
import { useAuthQuery, useIsImitatingQuery } from '@/queries/users';
import theme from '@/lib/DefaultTheme';
import {
    CalendarToday,
    EventAvailable,
    HomeWork,
    Group,
    RequestPage,
    Book,
    UploadOutlined,
    History,
    LocationOn,
} from '@mui/icons-material';

type SmartAppProviderProps = {
    children: React.ReactNode;
};

// This component will handle the session loading
function SessionAwareProvider({ children }: { children: React.ReactNode }) {
    const [navigation, setNavigation] = useState<
        Array<{ title: string; segment: string }>
    >([]);
    const pathname = usePathname();
    const { data: session, isPending } = useAuthQuery();
    const { data: isImitating } = useIsImitatingQuery();


    useEffect(() => {
        // Get user role from session

        const userRole = session?.user?.role ?? 'guest';
        const isAdminOrOwner = ['admin', 'owner'].includes(userRole);

        // Regular navigation for standard users
        const REGULAR_NAVIGATION = [
            {
                title: 'Calendar',
                segment: 'calendar',
                icon: <CalendarToday />,
            },
            {
                title: 'Shifts',
                segment: 'shifts',
                icon: <HomeWork />,
            },
            {
                title: 'Availability',
                segment: 'availability',
                icon: <EventAvailable />,
            },

            ...(['admin', 'owner'].includes(session?.user?.role ?? 'guest')
                ? [
                      { kind: 'header', title: 'Admin' },
                      {
                          title: 'Locations',
                          segment: 'locations',
                          icon: <LocationOn />,
                      },
                      {
                          title: 'Uploads',
                          segment: 'uploads',
                          icon: <UploadOutlined />,
                      },
                      {
                          title: 'Requests',
                          segment: 'requests',
                          icon: <RequestPage />,
                      },
                      { title: 'My Team', segment: 'team', icon: <Group /> },
                      {
                          title: 'Logs',
                          segment: 'logs',
                          icon: <History />,
                      },
                  ]
                : []),
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

        setNavigation(selectedNavigation as any);
    }, [pathname, session]);

    const authentication = {
        signIn: async () => {
            window.location.href = '/auth/login';
        },
        signOut: async () => {
            if (isImitating) {
                window.location.href = '/api/auth/stop-imitating';
            } else {
                window.location.href = '/auth/logout';
            }
        },
    };

    // If session is still loading, return null or a loading indicator
    // This will be caught by the Suspense boundary in SmartAppProvider
    if (isPending) {
        return null;
    }

    return (
        <NextAppProvider
            theme={theme}
            navigation={navigation}
            branding={branding}
            authentication={authentication}
            session={session}
        >
            <NotificationsProvider
                slotProps={{
                    snackbar: {
                        anchorOrigin: {
                            vertical: 'bottom',
                            horizontal: 'left',
                        },
                    },
                }}
            >
                {children}
            </NotificationsProvider>
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
