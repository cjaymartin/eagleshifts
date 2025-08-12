'use client';

import { Container, CircularProgress, Alert } from '@mui/material';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import acceptInvitation from './actions';
import { useCookies } from 'next-client-cookies';
import { signOut } from '@/lib/auth-client';

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

    // Use a ref to track if we're already processing the invitation
    const isProcessingRef = useRef(false);

    useEffect(() => {
        // Ensure we're logged out before processing the invitation
        async function logoutAndContinue() {
            try {
                await signOut();

                // Also manually clear the cookie to be extra sure
                cookieStore.remove('better-auth.session_token');
                cookieStore.remove('login-organization-slug');
            } catch (error) {
                console.error('Error signing out:', error);
                // Continue even if logout fails
            }
        }

        // First check if we have a valid invitation ID
        if (!invitationId) {
            console.error('No invitation found in URL');
            setError(
                'No invitation ID found in the URL. Please check your invitation link.'
            );
            setLoading(false);
            return;
        }

        // Process the invitation after logout
        async function processInvitation() {
            // Only process once
            if (!invitationId || isProcessingRef.current) {
                return;
            }

            // Mark as processing to prevent duplicate attempts
            isProcessingRef.current = true;

            try {
                // First ensure we're logged out before accepting the invitation
                await logoutAndContinue();

                const result = await acceptInvitation(invitationId);

                setSuccess(true);
                setLoading(false);

                // Set the session cookie
                cookieStore.set('better-auth.session_token', result.cookie, {
                    sameSite: 'strict',
                    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
                });

                // Set the login-organization-slug cookie to the organization's slug
                if (result.organization && result.organization.slug) {
                    // Set as a plain cookie without SameSite or expiration
                    cookieStore.set(
                        'login-organization-slug',
                        result.organization.slug
                    );
                    console.log(
                        'Set login-organization-slug to:',
                        result.organization.slug
                    );
                } else {
                    console.error(
                        'Organization slug not found in invitation result:',
                        result.organization
                    );
                }

                // Use window.location.href for a full page reload to ensure cookies are available
                // This is more reliable than router.push for cookie handling
                // Add a small delay to ensure cookies are properly set
                setTimeout(() => {
                    window.location.href = '/';
                }, 500);
            } catch (err) {
                console.error('Error accepting invitation:', err);
                setError(
                    err instanceof Error
                        ? err.message
                        : 'An error occurred while accepting the invitation.'
                );
                setLoading(false);
                // Reset processing flag on error so user can try again
                isProcessingRef.current = false;
            }
        }

        void processInvitation();
    }, [invitationId]);

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
