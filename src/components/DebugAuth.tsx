'use client';

import { useAuth } from '@workos-inc/authkit-react';
import { useWorkOSContext } from '@/components/providers/AuthKitProvider';
import { useEffect, useState } from 'react';
import { Paper, Typography, Box, Divider, Alert } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

interface DebugInfo {
    workosSessionCookie: string;
    cookieCount: number;
    allCookies: string;
}

export function DebugAuth() {
    const { user: authUser, isLoading } = useAuth();
    const { widgetToken, user: serverUser } = useWorkOSContext();
    const user = authUser || serverUser;

    const [debugInfo, setDebugInfo] = useState<DebugInfo>({
        workosSessionCookie: '',
        cookieCount: 0,
        allCookies: '',
    });
    const [clientInfo, setClientInfo] = useState({
        pathname: '',
        timestamp: '',
        userAgent: '',
    });

    useEffect(() => {
        console.log('[DebugAuth] Component mounted');
        console.log('[DebugAuth] All cookies:', document.cookie);

        // Find WorkOS session cookie (usually starts with wos-session)
        const sessionMatch = document.cookie.match(
            new RegExp('(^| )wos-session[^=]*=([^;]+)')
        );
        const workosSessionCookie = sessionMatch
            ? `Found (${sessionMatch[2].substring(0, 30)}...)`
            : 'Not found';

        // Count all cookies
        const cookieCount = document.cookie
            .split(';')
            .filter((c) => c.trim()).length;

        setDebugInfo({
            workosSessionCookie,
            cookieCount,
            allCookies: document.cookie,
        });

        setClientInfo({
            pathname: window.location.pathname,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent.substring(0, 50) + '...',
        });

        console.log('[DebugAuth] Session Info:', {
            hasWorkosSession: workosSessionCookie !== 'Not found',
            cookieCount,
        });
    }, []);

    // Removed redundant useEffect for setCookies since we use debugInfo

    if (process.env.NODE_ENV === 'production') return null;

    return (
        <Paper
            sx={{
                p: 2,
                mt: 2,
                bgcolor: '#e3f2fd',
                border: '2px solid #2196f3',
            }}
        >
            <Typography
                variant="h6"
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    color: '#0d47a1',
                    mb: 1,
                }}
            >
                <SearchIcon /> Debug Auth Info (Client-Side)
            </Typography>

            <Divider sx={{ my: 1 }} />

            <Box sx={{ mt: 1 }}>
                <Alert severity="info" sx={{ mt: 1, mb: 2 }}>
                    Organization tracking now uses WorkOS session
                </Alert>

                <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
                    WorkOS Status:
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    User:{' '}
                    {isLoading
                        ? 'Loading...'
                        : user
                          ? `${user.firstName} (${user.email})`
                          : 'Not logged in'}
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    Widget Token: {widgetToken ? '✅ Present' : '❌ Missing'}
                </Typography>

                <Typography
                    variant="body2"
                    sx={{
                        mb: 0.5,
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                    }}
                >
                    The app no longer uses a custom{' '}
                    <code>wos-active-org-id</code> cookie.
                </Typography>

                <Typography
                    variant="body2"
                    sx={{
                        mb: 0.5,
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                    }}
                >
                    Organization ID comes from WorkOS session token directly.
                </Typography>

                <Divider sx={{ my: 1 }} />

                <Typography
                    variant="body2"
                    sx={{ mb: 0.5, fontFamily: 'monospace' }}
                >
                    <strong>WorkOS Session Cookie:</strong>{' '}
                    {debugInfo.workosSessionCookie}
                </Typography>

                <Typography
                    variant="body2"
                    sx={{ mb: 0.5, fontFamily: 'monospace' }}
                >
                    <strong>Total Cookies:</strong> {debugInfo.cookieCount}
                </Typography>

                <Divider sx={{ my: 1 }} />

                <Typography
                    variant="body2"
                    sx={{ mb: 0.5, fontFamily: 'monospace' }}
                >
                    <strong>Current Path:</strong> {clientInfo.pathname}
                </Typography>

                <Typography
                    variant="body2"
                    sx={{ mb: 0.5, fontFamily: 'monospace' }}
                >
                    <strong>Timestamp:</strong> {clientInfo.timestamp}
                </Typography>

                <Divider sx={{ my: 1 }} />

                <details>
                    <summary
                        style={{
                            cursor: 'pointer',
                            fontFamily: 'monospace',
                            fontSize: '0.875rem',
                        }}
                    >
                        <strong>All Cookies (Raw)</strong>
                    </summary>
                    <Typography
                        variant="body2"
                        sx={{
                            mt: 1,
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            wordBreak: 'break-all',
                            bgcolor: '#f5f5f5',
                            p: 1,
                            borderRadius: 1,
                        }}
                    >
                        {debugInfo.allCookies || 'No cookies found'}
                    </Typography>
                </details>
            </Box>
        </Paper>
    );
}
