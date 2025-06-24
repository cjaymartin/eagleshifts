'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import NextLink from 'next/link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import MuiCard from '@mui/material/Card';
import { styled } from '@mui/material/styles';

import { useMemo, useState } from 'react';
import { useCookies } from 'next-client-cookies';
import { Alert, ButtonBase, CircularProgress, IconButton } from '@mui/material';
import {
    useOrganizationBySlug,
    useOrganizationBySlugMutation,
} from '@/app/auth/login/organization/queries';
import { CheckCircle, Search } from '@mui/icons-material';
import { useRouter } from 'next/navigation';

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

export default function OrganizationSignIn() {
    const cookies = useCookies();
    const router = useRouter();

    const [loading] = useState(false);
    const [txtSlug, setTxtSlug] = useState('');

    const {
        mutateAsync: getOrganizationMutation,
        data: organization,
        isPending: isOrgBySlugLoading,
        reset: resetOrganizationMutation,
    } = useOrganizationBySlugMutation();

    const initialSlug = useMemo(() => {
        return cookies.get('login-organization-slug') || '';
    }, [cookies]);
    const { data: initialOrganization } = useOrganizationBySlug(initialSlug);

    async function handleCheckOrganization(
        e:
            | React.FormEvent<HTMLFormElement>
            | React.MouseEvent<HTMLButtonElement, MouseEvent>
    ) {
        const slug = txtSlug.trim();
        e.preventDefault();
        await getOrganizationMutation(slug);
    }

    async function handleFormSubmission(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const slug = txtSlug.trim();
        if (!slug) {
            return;
        }
        const slugCookie = cookies.get('login-organization-slug') || '';

        await getOrganizationMutation(txtSlug);

        const orgMatches = organization && slug === slugCookie;
        const orgMatchesInitial = organization && slug === initialSlug;

        if (orgMatches || orgMatchesInitial) {
            router.push('/auth/login');
        }
    }

    return (
        <React.Fragment>
            <CssBaseline enableColorScheme />
            <SignInContainer direction="column" justifyContent="space-between">
                <Card variant="outlined">
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
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            width: '100%',
                            gap: 2,
                        }}
                    >
                        <React.Fragment>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mb: 3 }}
                            >
                                Enter your organization&#39;s unique identifier
                                to continue
                            </Typography>
                            <Box sx={{ mb: 3 }}>
                                <form onSubmit={handleFormSubmission}>
                                    <TextField
                                        fullWidth
                                        id="org-slug"
                                        label="Organization Slug"
                                        placeholder="e.g., acme-corp"
                                        value={txtSlug}
                                        onChange={(e) => {
                                            setTxtSlug(e.target.value);
                                            resetOrganizationMutation();
                                        }}
                                        variant="outlined"
                                        InputProps={{
                                            endAdornment: (
                                                <IconButton
                                                    //If this is type=submit, then onClick takes over instead of onSubmit
                                                    //type="submit"
                                                    onClick={
                                                        handleCheckOrganization
                                                    }
                                                    disabled={
                                                        !txtSlug.trim() ||
                                                        isOrgBySlugLoading
                                                    }
                                                    size="small"
                                                    sx={{ mr: -1 }}
                                                >
                                                    {isOrgBySlugLoading ? (
                                                        <CircularProgress
                                                            size={20}
                                                        />
                                                    ) : (
                                                        <Search />
                                                    )}
                                                </IconButton>
                                            ),
                                        }}
                                        helperText="This is usually provided by your organization administrator"
                                    />
                                </form>
                            </Box>
                        </React.Fragment>

                        {organization && (
                            <Alert
                                severity="success"
                                icon={<CheckCircle />}
                                sx={{
                                    mb: 3,
                                    bgcolor: 'success.50',
                                    border: '1px solid',
                                    borderColor: 'success.200',
                                }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 2,
                                    }}
                                >
                                    <Box>
                                        <Typography
                                            variant="subtitle2"
                                            fontWeight="600"
                                        >
                                            {organization.name}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            color="success.main"
                                        >
                                            {organization.slug}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Alert>
                        )}

                        <Button
                            component={NextLink}
                            type="submit"
                            loading={loading}
                            disabled={loading || !organization}
                            fullWidth
                            variant="contained"
                            href="/auth/login"
                        >
                            Continue to Login
                        </Button>
                    </Box>
                    {!!initialOrganization && (
                        <Box>
                            <Typography
                                variant="subtitle2"
                                fontWeight="600"
                                sx={{ mb: 2 }}
                            >
                                Or continue with your previous organization:
                            </Typography>
                            <ButtonBase
                                onClick={async () => {
                                    getOrganizationMutation(
                                        initialOrganization.slug!
                                    );
                                    setTxtSlug(initialOrganization.slug!);
                                    cookies.set(
                                        'login-organization-slug',
                                        initialOrganization.slug!
                                    );
                                }}
                                sx={{
                                    width: '100%',
                                    p: 2,
                                    mb: 2,

                                    border: '1px solid',
                                    borderColor: 'grey.300',
                                    borderRadius: 1,

                                    '&:hover': {
                                        bgcolor: 'grey.50',
                                    },
                                }}
                            >
                                <Stack direction="row" width="100%">
                                    <Box sx={{ ml: 5 }}>
                                        <Typography
                                            variant="subtitle2"
                                            fontWeight="600"
                                        >
                                            {initialOrganization.name}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            color="success.main"
                                        >
                                            {initialOrganization.slug}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </ButtonBase>
                        </Box>
                    )}
                </Card>
            </SignInContainer>
        </React.Fragment>
    );
}
