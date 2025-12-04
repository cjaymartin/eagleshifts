import { NextRequest, NextResponse } from 'next/server';
import { getSignInUrl, withAuth } from '@workos-inc/authkit-nextjs';

export async function POST(request: NextRequest) {
    const { user } = await withAuth();
    
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organizationId } = await request.json();

    if (!organizationId) {
        return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    console.log('[Switch Org API] Switching user', user.id, 'to org', organizationId);

    // Get the sign-in URL with the specific organization
    // This will initiate a new auth flow for the selected organization
    const redirectUrl = await getSignInUrl({
        organizationId,
    });

    console.log('[Switch Org API] Redirect URL:', redirectUrl);

    return NextResponse.json({ redirectUrl });
}
