import { useQuery } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc/client';

/**
 * Hook to fetch logs with filtering and pagination
 */
export function useLogsQuery(params?: {
    actionType?: string;
    userId?: string;
    entityId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
}) {
    return trpc.logs.getLogs.useQuery(params, {
        keepPreviousData: true,
        staleTime: 1000 * 60, // 1 minute
    } as any);
}

/**
 * Hook to fetch available log action types for filtering
 */
export function useLogTypesQuery() {
    return trpc.logs.getLogTypes.useQuery(undefined, {
        staleTime: 1000 * 60 * 60, // 1 hour - these don't change often
    });
}

/**
 * Hook to create a log entry
 */
export function useCreateLogMutation() {
    return trpc.logs.createLog.useMutation();
}

/**
 * Hook to delete logs older than the specified retention period
 */
export function useDeleteOldLogsMutation() {
    return trpc.logs.deleteOldLogs.useMutation();
}
