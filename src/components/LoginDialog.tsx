'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CssBaseline from '@mui/material/CssBaseline';
import FormControlLabel from '@mui/material/FormControlLabel';
import Divider from '@mui/material/Divider';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import NextLink from 'next/link';
import MuiLink from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import MuiCard from '@mui/material/Card';
import { styled } from '@mui/material/styles';
import { GoogleIcon } from './CustomIcons';
import { signIn } from '@/lib/auth-client';
import { useState } from 'react';
import { useSubdomainContext } from '@/components/providers/SubdomainProviderClient';
import { useCookies } from 'next-client-cookies';
import { Organization } from '@/generated/prisma';

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

type SignInProps = {
    activeOrganization?: Organization;
};

export default function SignIn({ activeOrganization }: SignInProps) {
    const subdomain = useSubdomainContext();
    const cookies = useCookies();

    const [email, setEmail] = React.useState('');
    const [emailError, setEmailError] = React.useState(false);
    const [emailErrorMessage, setEmailErrorMessage] = React.useState('');
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = React.useState(false);

    const handleClickOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        if (emailError) {
            event.preventDefault();
            return;
        }
        const data = new FormData(event.currentTarget);
        console.log({
            email: data.get('email'),
        });
    };

    const validateInputs = () => {
        const email = document.getElementById('email') as HTMLInputElement;

        let isValid = true;

        if (!email.value || !/\S+@\S+\.\S+/.test(email.value)) {
            setEmailError(true);
            setEmailErrorMessage('Please enter a valid email address.');
            isValid = false;
        } else {
            setEmailError(false);
            setEmailErrorMessage('');
        }

        return isValid;
    };

    return (
        <React.Fragment>
            <CssBaseline enableColorScheme />
            <SignInContainer direction="column" justifyContent="space-between">
                <Card variant="outlined">
                    {/*<EagleShiftsIcon />*/}
                    <Typography
                        component="h1"
                        variant="h4"
                        sx={{
                            width: '100%',
                            fontSize: 'clamp(2rem, 10vw, 2.15rem)',
                        }}
                    >
                        Sign in
                    </Typography>
                    <Box
                        component="form"
                        onSubmit={handleSubmit}
                        noValidate
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            width: '100%',
                            gap: 2,
                        }}
                    >
                        {activeOrganization && (
                            <React.Fragment>
                                <Card
                                    sx={{
                                        paddingTop: 0,
                                        paddingBottom: 1,
                                        paddingLeft: 2,
                                        paddingRight: 2,
                                        marginBottom: 2,
                                    }}
                                >
                                    <Typography variant="overline">
                                        To
                                    </Typography>
                                    <Stack
                                        justifyContent="center"
                                        alignItems="center"
                                        sx={{ marginTop: -2, marginBottom: 2 }}
                                    >
                                        <Typography variant="h5">
                                            {activeOrganization.name}
                                        </Typography>
                                        <Typography variant="caption">
                                            <MuiLink
                                                component={NextLink}
                                                href="/auth/login/organization"
                                            >
                                                Login to a different
                                                organization
                                            </MuiLink>
                                        </Typography>
                                    </Stack>
                                </Card>
                            </React.Fragment>
                        )}
                        <FormControl>
                            <FormLabel htmlFor="email">Email</FormLabel>
                            <TextField
                                error={emailError}
                                helperText={emailErrorMessage}
                                id="email"
                                type="email"
                                name="email"
                                placeholder="your@email.com"
                                autoComplete="email"
                                autoFocus
                                required
                                fullWidth
                                variant="outlined"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                }}
                                color={emailError ? 'error' : 'primary'}
                            />
                        </FormControl>
                        <FormControlLabel
                            control={
                                <Checkbox value="remember" color="primary" />
                            }
                            label="Remember me"
                        />
                        {/*<ForgotPassword open={open} handleClose={handleClose} />*/}
                        <Button
                            type="submit"
                            loading={loading}
                            disabled={loading}
                            fullWidth
                            variant="contained"
                            value={email}
                            onChange={(e: any) => {
                                setEmail(e.target.value);
                                // if (e.target.value && !/\S+@\S+\.\S+/.test(e.target.value)) {
                                //   setEmailError(true);
                                //   setEmailErrorMessage('Please enter a valid email address.');
                                // } else {
                                //   setEmailError(false);
                                //   setEmailErrorMessage('');
                                // }
                            }}
                            onClick={async () => {
                                if (subdomain) {
                                    cookies.set(
                                        'login-subdomain',
                                        subdomain,
                                        {}
                                    );
                                } else {
                                    cookies.set('login-subdomain', '', {});
                                }

                                await signIn.magicLink(
                                    {
                                        email,
                                    },
                                    {
                                        onRequest: (ctx) => {
                                            setLoading(true);
                                        },
                                        onResponse: (ctx) => {
                                            setLoading(false);
                                        },
                                    }
                                );
                            }}
                        >
                            Login With Magic Link
                        </Button>
                        <MuiLink
                            component="button"
                            type="button"
                            onClick={handleClickOpen}
                            variant="body2"
                            sx={{ alignSelf: 'center' }}
                        >
                            Forgot your password?
                        </MuiLink>
                    </Box>
                    <Divider>or</Divider>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                        }}
                    >
                        <Button
                            fullWidth
                            variant="outlined"
                            loading={loading}
                            disabled={loading}
                            onClick={async () => {
                                if (subdomain) {
                                    cookies.set(
                                        'login-subdomain',
                                        subdomain,
                                        {}
                                    );
                                } else {
                                    cookies.set('login-subdomain', '', {});
                                }

                                await signIn.social(
                                    {
                                        provider: 'google',
                                        callbackURL: '/',
                                    },
                                    {
                                        onRequest: (ctx) => {
                                            setLoading(true);
                                        },
                                        onResponse: (ctx) => {
                                            setLoading(false);
                                        },
                                    }
                                );
                            }}
                            startIcon={<GoogleIcon />}
                        >
                            Sign in with Google
                        </Button>
                        {/*<Button*/}
                        {/*  fullWidth*/}
                        {/*  variant="outlined"*/}
                        {/*  onClick={() => alert('Sign in with Facebook')}*/}
                        {/*  startIcon={<FacebookIcon />}*/}
                        {/*>*/}
                        {/*  Sign in with Facebook*/}
                        {/*</Button>*/}
                        <Typography sx={{ textAlign: 'center' }}>
                            Don&apos;t have an account?{' '}
                            <MuiLink
                                href="/auth/sign_up"
                                variant="body2"
                                sx={{ alignSelf: 'center' }}
                            >
                                Sign up
                            </MuiLink>
                        </Typography>
                    </Box>
                </Card>
            </SignInContainer>
        </React.Fragment>
    );
}
