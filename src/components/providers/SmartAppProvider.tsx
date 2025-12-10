'use client';

import { NextAppProvider } from '@toolpad/core/nextjs';
import React, { useState, useEffect, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { branding } from '@/config/branding';
import { useAuthQuery } from '@/queries/users';
import { useShiftRequestsListQuery } from '@/queries/requests';
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
    FolderOutlined,
} from '@mui/icons-material';
import { Badge } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';

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

    // Get pending requests count for admin badge
    const isAdmin = ['admin', 'owner'].includes(session?.user?.role ?? 'guest');
    const { data: pendingRequests = [] } = useShiftRequestsListQuery(true, {
        enabled: isAdmin, // Only fetch if user is admin
    });

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
                          title: 'Departments',
                          segment: 'departments',
                          icon: <FolderOutlined />,
                      },
                      {
                          title: 'Uploads',
                          segment: 'uploads',
                          icon: <UploadOutlined />,
                      },
                      {
                          title: 'Requests',
                          segment: 'requests',
                          icon:
                              pendingRequests.length > 0 ? (
                                  <Badge
                                      badgeContent={pendingRequests.length}
                                      color="info"
                                  >
                                      <RequestPage />
                                  </Badge>
                              ) : (
                                  <RequestPage />
                              ),
                      },
                      {
                          title: 'Checklists',
                          segment: 'checklists',
                          icon: <AssignmentIcon />,
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
            theme={theme}
            navigation={navigation}
            branding={branding}
            authentication={authentication}
            session={session}
        >
            {children}
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
