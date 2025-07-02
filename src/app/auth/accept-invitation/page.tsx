'use client';

import { Container } from '@mui/material';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export default function AcceptInvitationPage() {
    //get param for 'invitation' from URL nextjs15 style
    const searchParams = useSearchParams();
    const invitationId = searchParams.get('invitation');

    useEffect(() => {
        if (!invitationId) {
            console.error('No invitation found in URL');
            return (
                <Container>Something went wrong. Please try again</Container>
            );
        }
        void (async () => {
            console.log('ACCEPTING INVITATION PAGE LOADED');
            const rezult = await authClient.organization.acceptInvitation({
                invitationId: invitationId,
            });
            console.log({ rezult });
        })();
    }, [invitationId]);
    return (
        <Container>
            <h1>Accept Invitation</h1>
            <p>
                Please follow the instructions in your invitation email to
                accept the invitation.
            </p>
        </Container>
    );
}
