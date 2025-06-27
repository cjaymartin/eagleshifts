import { trpc } from '@/lib/trpc/client';
import { useQuery } from '@tanstack/react-query';
import { getQueryKey } from '@trpc/react-query';

export function useAvailabilityByDate(date: Date) {
    console.log('useAvailabilityByDate', date);
    return trpc.availability.byDate.useQuery({ date });
}

export function useAvailabilityByDateLookupQuery(date: Date) {
    const { data: availability } = useAvailabilityByDate(date);
    const baseQuerykey = getQueryKey(
        trpc.availability.byDate,
        { date },
        'query'
    );

    return useQuery({
        queryKey: [...baseQuerykey, 'lookup'],
        queryFn: () => {
            return (
                availability?.reduce(
                    (acc, item) => {
                        acc[item.id] = item;
                        return acc;
                    },
                    {} as Record<string, (typeof availability)[0]>
                ) || {}
            );
        },
        enabled: !!date,
    });
}
