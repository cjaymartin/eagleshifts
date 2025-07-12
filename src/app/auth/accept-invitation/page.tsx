'use client';

import { Container, CircularProgress, Alert } from '@mui/material';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import acceptInvitation from './actions';
import { useCookies } from 'next-client-cookies';

export default function AcceptInvitationPage() {
    // Get param for 'invitation' from URL
    const cookieStore = useCookies();
    const searchParams = useSearchParams();
    const router = useRouter();
    const invitationId =
        searchParams.get('invitation') || searchParams.get('id'); // Support both parameter names

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!invitationId) {
            console.error('No invitation found in URL');
            setError(
                'No invitation ID found in the URL. Please check your invitation link.'
            );
            setLoading(false);
            return;
        }

        async function processInvitation() {
            if (!invitationId || success) {
                return;
            }
            try {
                console.log('ACCEPTING INVITATION PAGE LOADED');
                const result = await acceptInvitation(invitationId);
                console.log({ result });

                setSuccess(true);
                setLoading(false);

                //set the cookie
                //result.cookie
                cookieStore.set('better-auth.session_token', result.cookie, {
                    //httpOnly: true,
                    //secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    //path: '/',
                    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
                });

                // Redirect to dashboard after a short delay
                setTimeout(() => {
                    //router.push('/');
                    window.location.href = '/';
                }, 2000);
            } catch (err) {
                console.error('Error accepting invitation:', err);
                setError(
                    err instanceof Error
                        ? err.message
                        : 'An error occurred while accepting the invitation.'
                );
                setLoading(false);
            }
        }

        void processInvitation();
    }, [invitationId, router]);

    if (loading) {
        return (
            <Container sx={{ textAlign: 'center', py: 8 }}>
                <CircularProgress />
                <p>Processing your invitation...</p>
            </Container>
        );
    }

    if (error) {
        return (
            <Container sx={{ py: 4 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
                <h1>Something went wrong</h1>
                <p>
                    Please try again or contact support if the problem persists.
                </p>
            </Container>
        );
    }

    if (success) {
        return (
            <Container sx={{ py: 4 }}>
                <Alert severity="success" sx={{ mb: 2 }}>
                    Invitation accepted successfully!
                </Alert>
                <h1>Welcome!</h1>
                <p>
                    Your invitation has been accepted. Redirecting you to the
                    dashboard...
                </p>
            </Container>
        );
    }

    return (
        <Container sx={{ py: 4 }}>
            <h1>Accept Invitation</h1>
            <p>Please wait while we process your invitation...</p>
        </Container>
    );
}
