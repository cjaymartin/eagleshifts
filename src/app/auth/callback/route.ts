import { handleAuth } from '@workos-inc/authkit-nextjs';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // WorkOS handles authentication and redirects based on session state
  return handleAuth()(request);
}
