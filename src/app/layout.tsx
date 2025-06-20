import type { Metadata } from "next";
import { NextAppProvider } from '@toolpad/core/nextjs';
import LinearProgress from '@mui/material/LinearProgress';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
//import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import React, {useMemo} from "react";
import EagleShiftIcon from "@/components/EagleShiftIcon";
import {Branding, NotificationsProvider} from "@toolpad/core";
import { Roboto } from 'next/font/google';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '@/lib/DefaultTheme';
import {auth} from "@/lib/auth";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {authClient} from "@/lib/auth-client";
import SubdomainProvider from "@/components/providers/SubdomainProvider";
import { CookiesProvider } from "next-client-cookies/server";

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
  title: "Eagleshifts",
  description: "Go shift your work",
};


const BRANDING: Branding = {
  logo: <EagleShiftIcon width="3rem"  />,
  title: 'EagleShifts',
  homeUrl: '/toolpad/core/introduction',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  // Regular navigation for standard users
  const REGULAR_NAVIGATION = [
    {
      title: "Home",
      segment: "",
    },
    {
      title: "About",
      segment: "about",
    },
    {
      title: "Contact",
      segment: "contact",
    },
  ];

  // Super admin navigation
  const SUPERADMIN_NAVIGATION = [
    {
      title: "Dashboard",
      segment: "superadmin",
    },
    {
      title: "Tenants",
      segment: "superadmin/tenants",
    },
    {
      title: "Users",
      segment: "superadmin/users",
    },
    {
      title: "Settings",
      segment: "superadmin/settings",
    },
  ];

  // Get the current path using Next.js 15 headers API
  const headerList = await headers();
  const pathname = headerList.get("x-current-path");

  console.log({pathname});
  // Determine which navigation to use based on the path
  const NAVIGATION = pathname?.startsWith('/superadmin')
    ? SUPERADMIN_NAVIGATION 
    : REGULAR_NAVIGATION;

  const session = await auth.api.getSession({
    headers: await headers(), // you need to pass the headers object.
  });

  console.dir({session});

  const authentication = {
      signIn: async () => {
        "use server";
        return redirect("/auth/login");
      },
      signOut: async () => {
        "use server";
        //await auth.api.signOut({headers: {}})
        return redirect("/auth/logout");

        //await authClient.signOut();
        //revalidatePath("/", "layout");
      }
  };




  return (
    <html lang="en" className={roboto.variable} suppressHydrationWarning>
      <body>
        <AppRouterCacheProvider>
          <SubdomainProvider>
            <CookiesProvider>
              <React.Suspense fallback={<LinearProgress />}>
                <ThemeProvider theme={theme}>

                <NextAppProvider
                  navigation={NAVIGATION}
                  branding={BRANDING}
                  authentication={authentication}
                  session={session}

                >
                  <NotificationsProvider>
                    {children}
                  </NotificationsProvider>
                </NextAppProvider>
                </ThemeProvider>
              </React.Suspense>
            </CookiesProvider>

          </SubdomainProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
