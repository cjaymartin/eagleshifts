import { trpc } from '@/lib/trpc/client';
import { ShiftFilterSchema } from '@/app/(dashboard)/shifts/_components/ShiftFilters';
import { useQueryClient } from '@tanstack/react-query';

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

export function useShiftGetQuery(id: string) {
    return trpc.shifts.byId.useQuery(
        { id },
        {
            enabled: !!id,
        }
    );
}

// Mutations
export function useShiftCreateMutation() {
    const utils = trpc.useUtils();
    return trpc.shifts.create.useMutation({
        onSuccess() {
            void utils.shifts.invalidate();
        },
    });
}

export function useShiftUpdateMutation() {
    const utils = trpc.useUtils();
    return trpc.shifts.update.useMutation({
        onSuccess() {
            void utils.shifts.invalidate();
        },
    });
}

export function useShiftDeleteMutation() {
    const utils = trpc.useUtils();
    return trpc.shifts.delete.useMutation({
        onSuccess() {
            utils.shifts.invalidate();
        },
    });
}

// Seed shifts - new function that wasn't in the original code
export function useShiftSeedQuery() {
    return trpc.shifts.seed.useQuery();
}
