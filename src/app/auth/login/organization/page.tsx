import OrganizationLoginDialog from '@/app/auth/login/organization/_components/OrganizationLoginDialog';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cookies, headers } from 'next/headers';
import { Suspense } from 'react';

export default async function LoginPage() {
    return <OrganizationLoginDialog />;
}
