'use server';

import workos from '@/lib/workos';
import { withAuth, signOut } from '@workos-inc/authkit-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export async function setOrgCookie(orgId: string) {
    console.log('[setOrgCookie] === START ===');
    console.log('[setOrgCookie] Received orgId:', orgId);
    console.log('[setOrgCookie] OrgId type:', typeof orgId);
    console.log('[setOrgCookie] OrgId starts with "org_":', orgId.startsWith('org_'));
    console.log('[setOrgCookie] NODE_ENV:', process.env.NODE_ENV);
    
    // Validate if this is a WorkOS ID or local ID
    const isWorkosId = orgId.startsWith('org_');
    console.log('[setOrgCookie] Detected as WorkOS ID:', isWorkosId);
    
    // Try to find the organization in the database
    let localOrg;
    if (isWorkosId) {
        console.log('[setOrgCookie] Looking up local org by workosOrganizationId:', orgId);
        localOrg = await prisma.organization.findUnique({
            where: { workosOrganizationId: orgId }
        });
    } else {
        console.log('[setOrgCookie] Looking up local org by id:', orgId);
        localOrg = await prisma.organization.findUnique({
            where: { id: orgId }
        });
    }
    
    if (localOrg) {
        console.log('[setOrgCookie] Found local organization:', {
            id: localOrg.id,
            name: localOrg.name,
            workosOrganizationId: localOrg.workosOrganizationId,
        });
    } else {
        console.error('[setOrgCookie] ⚠️ Organization NOT found in database!');
        console.error('[setOrgCookie] Searched for:', { orgId, isWorkosId });
        
        // List all organizations to help debug
        const allOrgs = await prisma.organization.findMany({
            select: { id: true, name: true, workosOrganizationId: true }
        });
        console.error('[setOrgCookie] Available organizations:', allOrgs);
        
        throw new Error(`Organization not found: ${orgId}. Please ensure organizations are synced with WorkOS.`);
    }
    
    const cookieStore = await cookies();
    const cookieOptions = {
        path: '/',
        maxAge: 31536000, // 1 year
        httpOnly: process.env.NODE_ENV === 'production', // Allow client read in dev
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
    };
    
    // 🔧 CRITICAL FIX: Store the LOCAL organization ID, not the WorkOS ID
    const cookieValue = localOrg.id;
    console.log('[setOrgCookie] Setting cookie with LOCAL org ID:', cookieValue);
    console.log('[setOrgCookie] Cookie options:', cookieOptions);
    cookieStore.set('wos-active-org-id', cookieValue, cookieOptions);
    
    // Verify the cookie was set
    const setCookie = cookieStore.get('wos-active-org-id');
    console.log('[setOrgCookie] Cookie verification:', {
        wasSet: !!setCookie,
        value: setCookie?.value,
        matches: setCookie?.value === cookieValue,
    });
    
    console.log('[setOrgCookie] Redirecting to /dashboard...');
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
