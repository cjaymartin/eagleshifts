import { handleAuth } from '@workos-inc/authkit-nextjs';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  return handleAuth({
    returnPath: '/org-selection',
  })(request);
}
