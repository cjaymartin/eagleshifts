import { handleAuth } from '@workos-inc/authkit-nextjs';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Use WorkOS AuthKit's built-in handler, but we might need to intercept for custom logic?
  // Actually, AuthKit's handleAuth is for the callback route usually.
  // Wait, `handleAuth` from `@workos-inc/authkit-nextjs` is typically used in `src/app/auth/callback/route.ts`?
  // The docs say: export const GET = handleAuth();
  
  // However, the user wants:
  // 1. login
  // 2. if no active organization, go to a page where you can do nothing but pick one (which you save as a cookie for later)
  
  // AuthKit by default redirects to the root or `returnTo`.
  // We can configure `returnPath` in `handleAuth`?
  
  return handleAuth({
    returnPath: '/org-selection', // Force redirect to org selection after login
  })(request);
}
