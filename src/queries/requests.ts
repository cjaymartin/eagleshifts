import { trpc } from '@/lib/trpc/client';
import { useQueryClient } from '@tanstack/react-query';

// Data structure for creating shift requests
type ShiftRequestData = {
    shiftId: string;
    reason?: string;
};

// For update operations (admin only)
type ShiftRequestUpdateData = {
    id: string;
    status: 'pending' | 'approved' | 'rejected';
    reason?: string;
};

// Get a specific request by ID
export function useShiftRequestGetQuery(id: string) {
    return trpc.requests.byId.useQuery(
        { id },
        {
            enabled: !!id,
        }
    );
}

// List all requests with optional filtering
export function useShiftRequestsListQuery(pendingOnly?: boolean) {
    return trpc.requests.list.useQuery({ pendingOnly });
}

// Mutations
export function useShiftRequestCreateMutation() {
    const utils = trpc.useUtils();
    return trpc.requests.create.useMutation({
        onSuccess() {
            // Invalidate the requests list query to refresh the data
            utils.requests.list.invalidate();
        },
    });
}

export function useShiftRequestUpdateMutation() {
    const utils = trpc.useUtils();
    return trpc.requests.update.useMutation({
        onSuccess() {
            // Invalidate the requests list query to refresh the data
            utils.requests.list.invalidate();
        },
    });
}

export function useShiftRequestDeleteMutation() {
    const utils = trpc.useUtils();
    return trpc.requests.delete.useMutation({
        onSuccess() {
            // Invalidate the requests list query to refresh the data
            utils.requests.list.invalidate();
        },
    });
}

export function useShiftRequestDeleteOldMutation() {
    const utils = trpc.useUtils();
    return trpc.requests.deleteOld.useMutation({
        onSuccess() {
            // Invalidate the requests list query to refresh the data
            utils.requests.list.invalidate();
        },
    });
}

// Seed requests - similar to the seed function in shifts
export function useShiftRequestSeedQuery() {
    return trpc.requests.seed.useQuery(undefined, {
        enabled: false, // Don't run automatically, only when explicitly called
    });
}
