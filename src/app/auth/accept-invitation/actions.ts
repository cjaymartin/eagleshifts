'use server';

import { signCookie } from '@/lib/auth';
import { serverCaller } from '@/lib/serverTrpc';

export default async function acceptInvitation(invitationId: string) {
    // 1. Make sure the invitationId is 100% valid
    if (!invitationId) {
        throw new Error('Invitation ID is required');
    }

    try {
        // Use the TRPC server caller to call the acceptInvitation procedure
        const trpc = await serverCaller();
        const result = await trpc.invitations.acceptInvitation({
            invitationId,
        });

        if (!result.success) {
            throw new Error('Failed to accept invitation');
        }

        // Sign the cookie for the session
        const cookieValue = await signCookie(
            result.session.token,
            process.env.BETTER_AUTH_SECRET || ''
        );

        // Return the necessary data
        return {
            success: true,
            cookie: cookieValue,
            user: result.user,
            member: result.member,
            organization: result.organization,
        };
    } catch (error) {
        console.error('Error accepting invitation:', error);
        throw error instanceof Error 
            ? error 
            : new Error('An unexpected error occurred while accepting the invitation');
    }
}
