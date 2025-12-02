import * as React from 'react';
import Typography from '@mui/material/Typography';
import { Box, Container } from '@mui/material';
import { SignOutButton } from '@/components/SignOutButton';
import { DebugAuth } from '@/components/DebugAuth';

export default async function Page() {
    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 4,
                }}
            >
                <Typography variant="h4">
                    Welcome to a page in the dashboard!
                </Typography>
                <SignOutButton />
            </Box>

            <DebugAuth />
        </Container>
    );
}
