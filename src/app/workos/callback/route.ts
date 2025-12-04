import { handleAuth } from '@workos-inc/authkit-nextjs';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // WorkOS will handle the redirect based on session state
  // If user has an organization in session, they'll be redirected to root
  console.log("CALLBACK");
  console.log({request});
  return handleAuth()(request);
}
