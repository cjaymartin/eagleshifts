import { trpc } from '@/lib/trpc/client';

// Data structure for departments
type DepartmentData = {
    name: string;
    description?: string;
    color?: string;
};

// For update operations
type DepartmentUpdateData = DepartmentData & { id: string };

// Department queries
export function useDepartmentsQuery(filters?: {
    search?: string;
    name?: string;
    page?: number;
    limit?: number;
}) {
    return trpc.departments.getDepartments.useQuery(filters);
}

export function useDepartmentQuery(id: string) {
    return trpc.departments.getDepartmentById.useQuery(
        { id },
        {
            enabled: !!id && !!id.length,
        }
    );
}

// Department mutations
export function useDepartmentCreateMutation() {
    const utils = trpc.useUtils();
    return trpc.departments.createDepartment.useMutation({
        onSuccess() {
            void utils.departments.invalidate();
        },
    });
}

export function useDepartmentUpdateMutation() {
    const utils = trpc.useUtils();
    return trpc.departments.updateDepartment.useMutation({
        onSuccess() {
            void utils.departments.invalidate();
        },
    });
}

export function useDepartmentDeleteMutation() {
    const utils = trpc.useUtils();
    return trpc.departments.deleteDepartment.useMutation({
        onSuccess() {
            void utils.departments.invalidate();
        },
    });
}