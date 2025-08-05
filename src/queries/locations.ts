import { trpc } from '@/lib/trpc/client';
import { useQueryClient } from '@tanstack/react-query';

// Data structure for locations
type LocationData = {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    groupId?: string;
    tags?: string[];
};

// Data structure for location groups
type LocationGroupData = {
    name: string;
    color: string;
};

// For update operations
type LocationUpdateData = LocationData & { id: string };
type LocationGroupUpdateData = LocationGroupData & { id: string };

// Location queries
export function useLocationsQuery(filters?: {
    name?: string;
    groupId?: string;
    tags?: string[];
    page?: number;
    limit?: number;
}) {
    return trpc.locations.getLocations.useQuery(filters);
}

export function useLocationQuery(id: string) {
    return trpc.locations.getLocationById.useQuery(
        { id },
        {
            enabled: !!id && !!id.length,
        }
    );
}

export function useLocationGroupsQuery() {
    return trpc.locations.getLocationGroups.useQuery();
}

// Location mutations
export function useLocationCreateMutation() {
    const utils = trpc.useUtils();
    return trpc.locations.createLocation.useMutation({
        onSuccess() {
            void utils.locations.invalidate();
        },
    });
}

export function useLocationUpdateMutation() {
    const utils = trpc.useUtils();
    return trpc.locations.updateLocation.useMutation({
        onSuccess() {
            void utils.locations.invalidate();
        },
    });
}

export function useLocationDeleteMutation() {
    const utils = trpc.useUtils();
    return trpc.locations.deleteLocation.useMutation({
        onSuccess() {
            void utils.locations.invalidate();
        },
    });
}

// Location group mutations
export function useLocationGroupCreateMutation() {
    const utils = trpc.useUtils();
    return trpc.locations.createLocationGroup.useMutation({
        onSuccess() {
            void utils.locations.invalidate();
        },
    });
}

export function useLocationGroupUpdateMutation() {
    const utils = trpc.useUtils();
    return trpc.locations.updateLocationGroup.useMutation({
        onSuccess() {
            void utils.locations.invalidate();
        },
    });
}

export function useLocationGroupDeleteMutation() {
    const utils = trpc.useUtils();
    return trpc.locations.deleteLocationGroup.useMutation({
        onSuccess() {
            void utils.locations.invalidate();
        },
    });
}
