'use server';

import { cookies } from 'next/headers';

export async function setImitationSession(sessionCookie: string) {
    const cookieStore = await cookies();

    const sessionToken = cookieStore.get('better-auth.session_token')?.value;
    if (!sessionToken) {
        throw new Error('Session token not found');
    }
    console.log('SETTING REAL SESSION TO ' + sessionToken);
    cookieStore.set('better-auth.real_session_token', sessionToken, {
        httpOnly: true,
        secure: true,
    });

    console.log('SETTING IMITATION SESSION TO ' + sessionCookie);
    cookieStore.set('better-auth.session_token', sessionCookie, {
        httpOnly: true,
        secure: true,
    });

    return true;
}
