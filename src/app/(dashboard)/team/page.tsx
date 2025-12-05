'use client';

import React, { Suspense } from 'react';
import {
    Box,
    Container,
    Paper,
    Typography,
    Skeleton,
    Divider,
} from '@mui/material';
import { useAuthQuery } from '@/queries/users';
import { WorkOSUsersManagement } from '@/components/WorkOSUsersManagement';
import { NonAccountMembersSection } from './_components/NonAccountMembersSection';

// Loading skeleton component for the team page
function TeamPageSkeleton() {
    return (
        <Box>
            <Skeleton variant="text" width="200px" height={40} />
            <Box mt={3}>
                <Skeleton variant="rectangular" height={300} />
            </Box>
            <Box mt={4}>
                <Skeleton variant="text" width="200px" height={30} />
                <Skeleton variant="rectangular" height={150} sx={{ mt: 1 }} />
            </Box>
        </Box>
    );
}

// Team content component that requires data
function TeamContent() {
    // Get authentication and user data
    const { data: session, isLoading: isSessionLoading } = useAuthQuery();
    const role = session?.user?.role ?? 'guest';
    const isAdmin = ['admin', 'owner'].includes(role);

    if (isSessionLoading) {
        return <TeamPageSkeleton />;
    }

    return (
        <Box>
            {!isAdmin ? (
                // Non-admin view
                <>
                    <Typography color="text.secondary" sx={{ mt: 2 }}>
                        You don&apos;t have permission to manage team members.
                        Please contact an admin if you need access.
                    </Typography>
                </>
            ) : (
                // Admin team management UI
                <>
                    {/* WorkOS User Management Widget */}
                    <Paper sx={{ p: 2, mb: 4 }}>
                        <Typography variant="h6" gutterBottom>
                            Team Members
                        </Typography>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 2 }}
                        >
                            Manage your team members, invite new users, and
                            assign roles.
                        </Typography>
                        <WorkOSUsersManagement />
                    </Paper>

                    <Divider sx={{ my: 4 }} />

                    {/* Non-Account Members Section */}
                    <NonAccountMembersSection />
                </>
            )}
        </Box>
    );
}

// Main Team component that uses Suspense
export default function Team() {
    return (
        <Suspense fallback={<TeamPageSkeleton />}>
            <TeamContent />
        </Suspense>
    );
}
