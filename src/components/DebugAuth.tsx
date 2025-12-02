'use client';

import { useEffect, useState } from 'react';
import { Paper, Typography, Box } from '@mui/material';

export function DebugAuth() {
    const [cookie, setCookie] = useState('');

    useEffect(() => {
        // Read cookie on client
        const match = document.cookie.match(
            new RegExp('(^| )wos-active-org-id=([^;]+)')
        );
        if (match) {
            setCookie(match[2]);
        } else {
            setCookie('Not found');
        }
    }, []);

    return (
        <Paper sx={{ p: 2, mt: 2, bgcolor: '#f5f5f5' }}>
            <Typography variant="h6">Debug Auth Info</Typography>
            <Box sx={{ mt: 1 }}>
                <Typography variant="body2">
                    <strong>wos-active-org-id cookie:</strong> {cookie}
                </Typography>
                <Typography variant="body2">
                    <strong>Current Path:</strong>{' '}
                    {typeof window !== 'undefined'
                        ? window.location.pathname
                        : ''}
                </Typography>
            </Box>
        </Paper>
    );
}
