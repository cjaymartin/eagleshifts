'use client';

import { styled, Typography, useTheme } from '@mui/material';
import Stack from '@mui/material/Stack';
import { Branding } from '@toolpad/core';
import React, { useContext } from 'react';
import EagleShiftIcon from '@/components/EagleShiftIcon';
import OrgHeader from '@/app/(dashboard)/_components/OrgHeader';
import Box from '@mui/material/Box';
import NextLink from 'next/link';

//borrowed from toolpad
const LogoContainer = styled('div')({
    position: 'relative',
    height: 40,
    display: 'flex',
    alignItems: 'center',
    '& img': {
        maxHeight: 40,
    },
});

export default function MultitenantAppTitle() {
    const theme = useTheme();

    const branding: Branding = {
        logo: <EagleShiftIcon width="3rem" />,
        title: 'EagleShifts',
        homeUrl: '/toolpad/core/introduction',
    };

    return (
        <Stack direction="row" alignItems="center" spacing={2}>
            <Typography
                variant="h6"
                sx={{
                    color: (theme.vars ?? theme).palette.primary.main,
                    fontWeight: '700',
                    ml: 1,
                    whiteSpace: 'nowrap',
                    lineHeight: 1,
                }}
            >
                <NextLink
                    href="/"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                >
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <LogoContainer>{branding?.logo}</LogoContainer>

                        <Box>{branding?.title}</Box>
                    </Stack>
                </NextLink>
            </Typography>
            <Box>
                <OrgHeader />
            </Box>
        </Stack>
    );
}
