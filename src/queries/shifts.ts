import { useMutation, useQuery } from '@tanstack/react-query';
import edenClient from '@/lib/eden';
import {
    ShiftFilters,
    ShiftFilterSchema,
} from '@/app/(dashboard)/shifts/_components/ShiftFilters';

// Query params for getting shifts
type ShiftQueryParams = {
    id?: string;
    limit?: number;
    offset?: number;
    title?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    assigned?: string;
    unfilled?: string;
};

// Data structure for creating/updating shifts
type ShiftData = {
    date: string;
    title: string;
    startTime: string;
    endTime: string;
    slots: number;
    timezone: string;
    location?: string;
    notes?: string;
    adminNotes?: string;
    assignments?: string[];
};

// For update operations
type ShiftUpdateData = Partial<ShiftData>;

export function useShiftListQuery(query?: ShiftFilterSchema | undefined) {
    return useQuery({
        queryKey: ['shifts', query],
        queryFn: async () => {
            // convert startDate and endDate to dates since they're strings in the query
            console.log({ query });

            const response = await edenClient.api.shifts.get({
                query: {
                    ...query,
                    startDate: query?.startDate
                        ? new Date(query.startDate).toISOString()
                        : undefined,
                    endDate: query?.endDate
                        ? new Date(query.endDate).toISOString()
                        : undefined,
                },
            });
            console.log({ response });
            return response.data;
        },
    });
}

export function useShiftGetQuery(id: string) {
    return useQuery({
        queryKey: ['shifts', id],
        queryFn: async () => {
            const response = await edenClient.api.shifts({ id }).get();
            return response.data; // Assuming the API returns an array, we take the first item
        },
        enabled: !!id,
    });
}

// Mutations
export function useShiftCreateMutation() {
    return useMutation({
        mutationKey: ['shifts', 'create'],
        mutationFn: async (shiftData: ShiftData) => {
            const response = await edenClient.api.shifts.post(shiftData);
            return response.data;
        },
    });
}

export function useShiftUpdateMutation() {
    return useMutation({
        mutationKey: ['shifts', 'update'],
        mutationFn: async ({
            id,
            ...data
        }: ShiftUpdateData & { id: string }) => {
            const response = await edenClient.api.shifts({ id }).put(data);
            return response.data;
        },
    });
}

export function useShiftDeleteMutation() {
    return useMutation({
        mutationKey: ['shifts', 'delete'],
        mutationFn: async (id: string) => {
            const response = await edenClient.api.shifts({ id }).delete();
            return response.data;
        },
    });
}
