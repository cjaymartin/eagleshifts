import { trpc } from '@/lib/trpc/client';

// Data structure for creating/updating shift drafts
type ShiftDraftData = {
    title: string;
    locationId?: string;
    legacyLocation?: string;
    startTime: string;
    endTime: string;
    slots: number;
    notes?: string;
    adminNotes?: string;
    timezone?: string;
};

// For update operations
type ShiftDraftUpdateData = ShiftDraftData & { id: string };

// Get all drafts for the current member
export function useShiftDraftsListQuery() {
    return trpc.shiftDrafts.list.useQuery();
}

// Get a specific draft by ID
export function useShiftDraftGetQuery(id: string) {
    return trpc.shiftDrafts.byId.useQuery(
        { id },
        {
            enabled: !!id,
        }
    );
}

// Create a new draft
export function useShiftDraftCreateMutation() {
    const utils = trpc.useUtils();
    return trpc.shiftDrafts.create.useMutation({
        onSuccess() {
            void utils.shiftDrafts.invalidate();
        },
    });
}

// Update an existing draft
export function useShiftDraftUpdateMutation() {
    const utils = trpc.useUtils();
    return trpc.shiftDrafts.update.useMutation({
        onSuccess() {
            void utils.shiftDrafts.invalidate();
        },
    });
}

// Delete a draft
export function useShiftDraftDeleteMutation() {
    const utils = trpc.useUtils();
    return trpc.shiftDrafts.delete.useMutation({
        onSuccess() {
            void utils.shiftDrafts.invalidate();
        },
    });
}