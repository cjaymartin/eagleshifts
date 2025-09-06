import type { Metadata } from 'next';
import LinearProgress from '@mui/material/LinearProgress';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
//import { Geist, Geist_Mono } from "next/font/google";
import './globals.css';
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

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    // Call seedDatabase function on server-side
    await seedDatabase();

    return (
        <html lang="en" className={roboto.variable} suppressHydrationWarning>
            {/*<CssBaseline />*/}
            <body>
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
                                                fallback={<LinearProgress />}
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
            </body>
        </html>
    );
}
