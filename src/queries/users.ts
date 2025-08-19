import { trpc } from '@/lib/trpc/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQueryKey } from '@trpc/react-query';
import { authClient } from '@/lib/auth-client';
export function useAuthQuery() {
    return trpc.session.get.index.useQuery();
}

export function useTeamUsersQuery() {
    const { data: session } = useAuthQuery();
    const role = session?.user?.role || 'member';
    const isAdmin = ['admin', 'owner'].includes(role);

    // If user is not an admin, return an empty array without querying the endpoint
    if (!isAdmin) {
        return {
            data: [],
            isLoading: false,
            isError: false,
            error: null,
            status: 'success',
        } as const;
    }

    return trpc.users.list.useQuery();
}

export function useInvitationListQuery() {
    return useQuery({
        queryKey: ['invitations'],
        queryFn: async () => {
            const invitations = await authClient.organization.listInvitations({
                //organizationId: authClient.session.activeOrganizationId,
            });
            return invitations?.data;
        },
    });
}

export function useTeamUsersLookupQuery() {
    const { data: teamUsers } = useTeamUsersQuery();
    const baseQueryKey = getQueryKey(trpc.users.list, undefined, 'query');

    return useQuery({
        queryKey: [...baseQueryKey, 'lookup'],
        queryFn: async () => {
            if (!teamUsers) return {};

            const userLookup: Record<string, (typeof teamUsers)[0]> = {};
            teamUsers.forEach((tm) => {
                userLookup[tm.id] = tm;
            });
            return userLookup;
        },
        enabled: !!teamUsers,
    });
}

export function useTeamUserByIdQuery(userId: string) {
    const { data: teamUserLookup } = useTeamUsersLookupQuery();
    const baseQueryKey = getQueryKey(trpc.users.list, undefined, 'query');

    return useQuery({
        queryKey: [...baseQueryKey, ':id', userId],
        queryFn: async () => {
            if (!teamUserLookup) return null;
            return teamUserLookup[userId] || null;
        },
        enabled: !!teamUserLookup && !!userId,
    });
}

export function useMemberByIdQuery(memberId: string) {
    return trpc.users.getMemberById.useQuery(
        { memberId },
        {
            enabled: !!memberId,
        }
    );
}

export function useUpdateDefaultAvailabilityMutation() {
    const utils = trpc.useUtils();
    return trpc.users.updateDefaultAvailability.useMutation({
        onSuccess: () => {
            // Invalidate queries that might be affected by this update
            utils.users.invalidate();
            utils.availability.invalidate();
        },
    });
}

// Team management mutations

export function useCreateMemberInvitationMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: {
            email: string;
            role: 'owner' | 'admin' | 'member';
        }) => {
            console.log('Inviting member with data:', data);
            const result = await authClient.organization.inviteMember({
                email: data.email,
                role: data.role,
            });
            console.log('Invitation result:', result);
            return result;
        },
        onSuccess: () => {
            // Invalidate the invitations list to show the new invitation
            queryClient.invalidateQueries({ queryKey: ['invitations'] });
        },
    });
}

export function useUpdateMemberMutation() {
    const utils = trpc.useUtils();
    return trpc.users.updateMember.useMutation({
        onSuccess: () => {
            // Invalidate users list to show the updated member
            utils.users.invalidate();
        },
    });
}

export function useDeleteUserMutation() {
    const utils = trpc.useUtils();
    return trpc.users.delete.useMutation({
        onSuccess: () => {
            // Invalidate users list to remove the deleted user
            utils.users.invalidate();
        },
    });
}

export function useDeleteInvitationMutation() {
    const utils = trpc.useUtils();
    return trpc.users.deleteInvitation.useMutation({
        onSuccess: () => {
            // Invalidate users list to remove the deleted user
            utils.users.invalidate();
        },
    });
}

export function useImitateUserMutation() {
    return trpc.users.imitate.useMutation({
        onSuccess: (data) => {
            // Handle the imitation session
            // This could involve setting a cookie or storing the session token
            //console.log('Imitation successful:', data);
            // In a real implementation, you might redirect or update the UI
            // For now, we'll just reload the page
            //window.location.href = '/';
        },
    });
}

export function useRejectInvitationMutation() {
    const queryClient = useQueryClient();
    const { mutateAsync: deleteInvitation } =
        trpc.users.deleteInvitation.useMutation();

    return useMutation({
        mutationFn: async (invitationId: string) => {
            console.log('let us reject this invitation', invitationId);
            const result = await deleteInvitation({
                invitationId,
            });
            console.log(result);
            return { success: true };
        },
        onSuccess: () => {
            // Invalidate the invitation list query
            queryClient.invalidateQueries({ queryKey: ['invitations'] });
        },
    });
}

export function useIsImitatingQuery() {
    return useQuery({
        queryKey: ['isImitating'],
        queryFn: async () => {
            try {
                const response = await fetch('/api/auth/is-imitating', {
                    method: 'POST',
                    // headers: {
                    //     'Content-Type': 'application/json',
                    // },
                    credentials: 'include', // Include cookies in the request
                }).catch(() => ({
                    ok: false,
                }));

                if (!response.ok) {
                    return false;
                }

                const data = await (response as any)?.json();
                return data.isImitating;
            } catch (error) {
                console.error('Error checking imitation status:', error);
                return false;
            }
        },
    });
}
