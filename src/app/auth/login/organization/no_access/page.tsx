'use client';

import NextLink from 'next/link';
import Button from '@mui/material/Button';
import { styled } from '@mui/material/styles';
import MuiCard from '@mui/material/Card';
import CssBaseline from '@mui/material/CssBaseline';
import * as React from 'react';
import Stack from '@mui/material/Stack';

const Card = styled(MuiCard)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignSelf: 'center',
    width: '100%',
    padding: theme.spacing(4),
    gap: theme.spacing(2),
    margin: 'auto',
    [theme.breakpoints.up('sm')]: {
        maxWidth: '450px',
    },
    boxShadow:
        'hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px',
    ...theme.applyStyles('dark', {
        boxShadow:
            'hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px',
    }),
}));

const SignInContainer = styled(Stack)(({ theme }) => ({
    height: 'calc((1 - var(--template-frame-height, 0)) * 100dvh)',
    minHeight: '100%',
    padding: theme.spacing(2),
    [theme.breakpoints.up('sm')]: {
        padding: theme.spacing(4),
    },
    '&::before': {
        content: '""',
        display: 'block',
        position: 'absolute',
        zIndex: -1,
        inset: 0,
        backgroundImage:
            'radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))',
        backgroundRepeat: 'no-repeat',
        ...theme.applyStyles('dark', {
            backgroundImage:
                'radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))',
        }),
    },
}));

export default function NoAccessPage() {
    return (
        <React.Fragment>
            <CssBaseline enableColorScheme />
            <SignInContainer>
                <Card variant="outlined">
                    <h1>Access Denied</h1>
                    <p>
                        You do not have permission to access this organization.
                    </p>
                    <p>
                        If you believe this is an error, please contact support.
                    </p>
                    <br />
                    <Button
                        variant="contained"
                        component={NextLink}
                        href="/auth/login"
                    >
                        Login Again
                    </Button>
                </Card>
            </SignInContainer>
        </React.Fragment>
    );
}
