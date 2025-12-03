import { withAuth } from '@workos-inc/authkit-nextjs';
import workos from '@/lib/workos';
import { OrgPicker } from '@/components/OrgPicker';
import { Box, Typography, Container, Paper } from '@mui/material';
import { redirect } from 'next/navigation';

export default async function OrgSelectionPage() {
    const { user } = await withAuth();

    console.log('[Org Selection] === START ===');
    console.log('[Org Selection] User:', {
        id: user?.id,
        email: user?.email,
        firstName: user?.firstName,
    });

    if (!user) {
        console.log('[Org Selection] No user found, redirecting to login');
        redirect('/auth/login');
    }

    // Fetch user's organizations from WorkOS
    console.log(
        '[Org Selection] Fetching WorkOS memberships for user:',
        user.id
    );
    const memberships = await workos.userManagement.listOrganizationMemberships(
        {
            userId: user.id,
        }
    );
    console.log('[Org Selection] Found memberships:', memberships.data.length);

    const orgs = await Promise.all(
        memberships.data.map(async (m) => {
            const org = await workos.organizations.getOrganization(
                m.organizationId
            );
            console.log('[Org Selection] WorkOS Org:', {
                workosId: org.id,
                name: org.name,
            });
            return { id: org.id, name: org.name };
        })
    );

    console.log('[Org Selection] Total orgs fetched:', orgs.length);
    console.log(
        '[Org Selection] Org IDs being passed to picker:',
        orgs.map((o) => ({ id: o.id, name: o.name }))
    );

    if (orgs.length === 0) {
        console.log('[Org Selection] No organizations found for user');
        return (
            <Container maxWidth="sm" sx={{ mt: 8 }}>
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h5" gutterBottom>
                        No Organizations Found
                    </Typography>
                    <Typography color="text.secondary">
                        You are not a member of any organization. Please contact
                        your administrator.
                    </Typography>
                </Paper>
            </Container>
        );
    }

    console.log('[Org Selection] Rendering org picker');
    return (
        <Container maxWidth="sm" sx={{ mt: 8 }}>
            <Paper sx={{ p: 4 }}>
                <Typography variant="h4" gutterBottom align="center">
                    Select Organization
                </Typography>
                <Typography
                    variant="body1"
                    gutterBottom
                    align="center"
                    sx={{ mb: 4 }}
                >
                    Please choose an organization to continue.
                </Typography>

                <OrgPicker organizations={orgs} />
            </Paper>
        </Container>
    );
}
