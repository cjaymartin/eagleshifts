import { authClient } from '@/lib/auth-client';

export default function useAuth() {
    const sessionQuery = authClient.useSession();
    const orgQuery = authClient.useActiveOrganization();

    const user = sessionQuery?.data?.user ?{
        ...sessionQuery.data.user,
        organization: orgQuery.data || null,
        role: orgQuery.data?.role || null,
    } : undefined;


    return {
        user: sessionQuery.user
        isPending: sessionQuery.isPending || orgQuery.isPending,
    };
}
