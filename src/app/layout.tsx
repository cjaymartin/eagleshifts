import type { Metadata } from 'next';
import LinearProgress from '@mui/material/LinearProgress';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
//import { Geist, Geist_Mono } from "next/font/google";
import './globals.css';
import React from 'react';
import { Roboto } from 'next/font/google';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '@/lib/DefaultTheme';
import SubdomainProvider from '@/components/providers/SubdomainProvider';
import { CookiesProvider } from 'next-client-cookies/server';
import ReactQueryProvider from '@/components/providers/ReactQueryProvider';
import SmartAppProvider from '@/components/providers/SmartAppProvider';
import { ClientLocalizationProvider } from '@/components/providers/ClientLocalizationProvider';
import { DialogsProvider } from '@toolpad/core';

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

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={roboto.variable} suppressHydrationWarning>
            <body>
                <ClientLocalizationProvider>
                    <DialogsProvider>
                        <AppRouterCacheProvider>
                            <ReactQueryProvider>
                                <SubdomainProvider>
                                    <CookiesProvider>
                                        <React.Suspense
                                            fallback={<LinearProgress />}
                                        >
                                            <ThemeProvider theme={theme}>
                                                <SmartAppProvider>
                                                    {children}
                                                </SmartAppProvider>
                                            </ThemeProvider>
                                        </React.Suspense>
                                    </CookiesProvider>
                                </SubdomainProvider>
                            </ReactQueryProvider>
                        </AppRouterCacheProvider>
                    </DialogsProvider>
                </ClientLocalizationProvider>
            </body>
        </html>
    );
}
