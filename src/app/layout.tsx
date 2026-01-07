import type { Metadata } from 'next';
import LinearProgress from '@mui/material/LinearProgress';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
//import { Geist, Geist_Mono } from "next/font/google";
import './globals.css';
//import '@radix-ui/themes/styles.css';
//import '@workos-inc/widgets/styles.css';
import React from 'react';
import { Roboto } from 'next/font/google';
import theme from '@/lib/DefaultTheme';
import SubdomainProvider from '@/components/providers/SubdomainProvider';
import { CookiesProvider } from 'next-client-cookies/server';
import SmartAppProvider from '@/components/providers/SmartAppProvider';
import { ClientLocalizationProvider } from '@/components/providers/ClientLocalizationProvider';
import { DialogsProvider } from '@toolpad/core';
import { NotificationsProvider } from '@/components/providers/NotificationsProvider';
import { TRPCProvider } from '@/lib/trpc/Provider';
import { seedDatabase } from '@/utils/seedDatabase';
import { AuthKitProvider } from '@/components/providers/AuthKitProvider';

const roboto = Roboto({
    weight: ['300', '400', '500', '700'],
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-roboto',
});

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });
//
// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
    title: 'Eagleshifts',
    description: 'Go shift your work',
};

import { withAuth } from '@workos-inc/authkit-nextjs';
import { WorkOS } from '@workos-inc/node';
import { Theme } from '@radix-ui/themes';

// Initialize WorkOS
const workos = new WorkOS(process.env.WORKOS_API_KEY);

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    // Call seedDatabase function on server-side (dev only)
    await seedDatabase();

    // Generate WorkOS Widget Token if user is logged in
    let widgetToken: string | undefined;
    let user: any | undefined; // Using any to avoid type mismatch with AuthKit types for now

    try {
        const auth = await withAuth();
        user = auth.user;
        const organizationId = auth.organizationId;

        if (user && organizationId) {
            widgetToken = await workos.widgets.getToken({
                userId: user.id,
                organizationId,
                scopes: ['widgets:users-table:manage', 'widgets:sso:manage'],
            });
        }
    } catch (e) {
        console.error('Error generating WorkOS widget token:', e);
    }

    return (
        <html lang="en" className={roboto.variable} suppressHydrationWarning>
            {/*<CssBaseline />*/}
            <body>
                <Theme>
                    <AuthKitProvider
                        clientId={process.env.WORKOS_CLIENT_ID!}
                        widgetToken={widgetToken}
                        user={user}
                    >
                        <ClientLocalizationProvider>
                            <DialogsProvider>
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
                                    <AppRouterCacheProvider>
                                        <TRPCProvider>
                                            {/*<ReactQueryProvider>*/}
                                            <SubdomainProvider>
                                                <CookiesProvider>
                                                    <React.Suspense
                                                        fallback={
                                                            <LinearProgress />
                                                        }
                                                    >
                                                        <SmartAppProvider>
                                                            {children}
                                                        </SmartAppProvider>
                                                    </React.Suspense>
                                                </CookiesProvider>
                                            </SubdomainProvider>
                                            {/*</ReactQueryProvider>*/}
                                        </TRPCProvider>
                                    </AppRouterCacheProvider>
                                </NotificationsProvider>
                            </DialogsProvider>
                        </ClientLocalizationProvider>
                    </AuthKitProvider>
                </Theme>
            </body>
        </html>
    );
}
