import { getUser } from '@workos-inc/authkit-nextjs';
import workos from '@/lib/workos';
import { OrgPicker } from '@/components/OrgPicker';
import { Box, Typography, Container, Paper } from '@mui/material';
import { redirect } from 'next/navigation';

export default async function OrgSelectionPage() {
    const { user } = await getUser();

    if (!user) {
        redirect('/auth/login');
    }

    // Fetch user's organizations
    const memberships = await workos.userManagement.listOrganizationMemberships(
        {
            userId: user.id,
        }
    );

    const orgs = await Promise.all(
        memberships.data.map(async (m) => {
            const org = await workos.organizations.getOrganization(
                m.organizationId
            );
            return { id: org.id, name: org.name };
        })
    );

    if (orgs.length === 0) {
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
