import { trpc } from '@/lib/trpc/client';
import { useQuery } from '@tanstack/react-query';
import { getQueryKey } from '@trpc/react-query';

export function useAuthQuery() {
    return trpc.session.get.index.useQuery();
}

export function useTeamUsersQuery() {
    return trpc.users.list.useQuery();
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

export function useImitateUserMutation() {
    return trpc.users.imitate.useMutation({
        onSuccess: (data) => {
            // Handle the imitation session
            // This could involve setting a cookie or storing the session token
            console.log('Imitation successful:', data);

            // In a real implementation, you might redirect or update the UI
            // For now, we'll just reload the page
            window.location.href = '/';
        },
    });
}
