'use server';

import workos from '@/lib/workos';
import { withAuth, signOut } from '@workos-inc/authkit-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function setOrgCookie(orgId: string) {
    console.log('[Action] Setting Org Cookie:', orgId);
    console.log('[Action] NODE_ENV:', process.env.NODE_ENV);
    
    const cookieStore = await cookies();
    cookieStore.set('wos-active-org-id', orgId, {
        path: '/',
        maxAge: 31536000, // 1 year
        httpOnly: process.env.NODE_ENV === 'production', // Allow client read in dev
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
    });
    
    console.log('[Action] Cookie set. Redirecting to /dashboard...');
    redirect('/dashboard');
}

export async function signOutAction() {
    console.log('[Action] Signing out...');
    await signOut();
    redirect('/auth/login');
}

export async function getPortalLink() {
  const { user } = await withAuth();
  
  if (!user) return null;
  
  // Placeholder for portal link generation
  return null;
}
