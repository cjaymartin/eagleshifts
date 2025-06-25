import edenClient from '@/lib/eden';
import { useQuery } from '@tanstack/react-query';

export function useAuthQuery() {
    return useQuery({
        queryKey: ['auth'],
        queryFn: async () => {
            const response = await edenClient.api.session.get();
            return response.data;
        },
    });
}

export function useTeamUsersQuery() {
    return useQuery({
        queryKey: ['team-users'],
        queryFn: async () => {
            const response = await edenClient.api.users.get();
            return response.data;
        },
    });
}

export function useTeamUsersLookupQuery() {
    const { data: teamUsers } = useTeamUsersQuery();
    return useQuery({
        queryKey: ['team-users-lookup', teamUsers],
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
