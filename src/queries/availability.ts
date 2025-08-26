import { trpc } from '@/lib/trpc/client';
import { useQuery } from '@tanstack/react-query';
import { getQueryKey } from '@trpc/react-query';

// Data structure for creating/updating availabilities
export type AvailabilityData = {
    startDate: string;
    endDate: string;
    desc: string;
    isAvailable: boolean;
    memberId: string;
};

// For update operations
export type AvailabilityUpdateData = {
    id: string;
    startDate?: string;
    endDate?: string;
    desc?: string;
    isAvailable?: boolean;
};

// List availabilities with optional filters
export function useAvailabilityListQuery(filters?: {
    startDate?: string;
    endDate?: string;
    isAvailable?: boolean;
    memberId?: string;
}) {
    return trpc.availability.list.useQuery(filters);
}

// Get a specific availability by ID
export function useAvailabilityGetQuery(id: string) {
    return trpc.availability.byId.useQuery(
        { id },
        {
            enabled: !!id,
        }
    );
}

// Get availabilities by date
export function useAvailabilityByDate(date: Date) {
    console.log('useAvailabilityByDate', date);
    // Check if date is valid
    const isValidDate = date instanceof Date && !isNaN(date.getTime());
    return trpc.availability.byDate.useQuery(
        { date },
        {
            enabled: isValidDate,
            // Ensure data is always fresh
            staleTime: 0,
        }
    );
}

// Transform availability data into a lookup object
export function useAvailabilityByDateLookupQuery(date: Date) {
    // Check if date is valid
    const isValidDate = date instanceof Date && !isNaN(date.getTime());
    const { data: availability } = useAvailabilityByDate(date);
    const baseQuerykey = getQueryKey(
        trpc.availability.byDate,
        { date },
        'query'
    );

    console.log({ availability });

    return useQuery({
        // Include availability in the query key to ensure it re-runs when availability changes
        queryKey: [...baseQuerykey, 'lookup', availability],
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
        enabled: !!date && isValidDate && !!availability,
        // Ensure the query doesn't use stale data
        staleTime: 0,
    });
}

// Mutations
export function useAvailabilityCreateMutation() {
    const utils = trpc.useUtils();
    return trpc.availability.create.useMutation({
        onSuccess() {
            utils.availability.invalidate();
        },
    });
}

export function useAvailabilityUpdateMutation() {
    const utils = trpc.useUtils();
    return trpc.availability.update.useMutation({
        onSuccess() {
            utils.availability.invalidate();
        },
    });
}

export function useAvailabilityDeleteMutation() {
    const utils = trpc.useUtils();
    return trpc.availability.delete.useMutation({
        onSuccess() {
            utils.availability.invalidate();
        },
    });
}
