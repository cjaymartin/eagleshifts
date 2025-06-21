import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { getOrganizationBySlug } from '@/app/auth/login/organization/actions';
import { useDebounce } from '@uidotdev/usehooks';
import { useCookies } from 'next-client-cookies';

export function useOrganizationBySlug(slug: string) {
    //const [debounceSlug] = useDebounce([slug], 2000);
    return useQuery({
        queryKey: ['organization', slug],
        queryFn: async () => {
            if (slug.length <= 2) {
                return null;
            }
            const response = await getOrganizationBySlug(slug);
            return response;
        },
        //staleTime: 1000 * 60 * 5, // 5 minutes
        //enabled: slug?.length > 2,
    });
}

export function useOrganizationBySlugMutation() {
    const cookies = useCookies();
    return useMutation({
        mutationFn: async (slug: string) => {
            const response = await getOrganizationBySlug(slug);
            cookies.set('login-organization-slug', slug);
            return response;
        },
    });
}
