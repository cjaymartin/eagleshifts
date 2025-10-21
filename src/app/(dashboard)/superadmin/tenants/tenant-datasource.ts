import { DataSource } from '@toolpad/core';
import { Organization } from '@/generated/prisma';
import {
    getManyOrganizations,
    getOneOrganization,
    createOrganization,
    updateOrganization,
    deleteOrganization,
} from './actions';

const tenantDataSource: DataSource<Organization> = {
    fields: [
        // { field: "id", headerName: "ID" },
        { field: 'name', headerName: 'Name' },
        { field: 'slug', headerName: 'Slug' },
        {
            field: 'aiEnabled',
            headerName: 'AI Feature Enabled',
            type: 'boolean',
        },
        //{ field: 'aiDailyLimit', headerName: 'AI Daily Limit', hideInTable: true },
        // { field: "logo", headerName: "Logo" },
        // { field: "createdAt", headerName: "Created At" },
        // { field: "metadata", headerName: "Metadata" }
    ],

    // Fetch multiple organizations with pagination
    getMany: async ({ paginationModel }) => {
        return getManyOrganizations({ paginationModel });
    },

    // Fetch a single organization by ID
    getOne: async (id: any) => {
        return getOneOrganization(id) as any;
    },

    // Create a new organization
    createOne: async (data: Partial<Organization>) => {
        return createOrganization(data) as any;
    },

    // Update an organization by ID
    updateOne: async (id: any, data: Partial<Organization>) => {
        return updateOrganization(id, data) as any;
    },

    // Delete an organization by ID
    deleteOne: async (id: any) => {
        return deleteOrganization(id) as any;
    },

    // Validate data before creation or update
    validate: (formValues) => {
        const issues = [];

        // Validate aiDailyLimit
        if (formValues.aiDailyLimit !== undefined) {
            const aiDailyLimit = Number(formValues.aiDailyLimit);
            if (isNaN(aiDailyLimit) || aiDailyLimit < 0) {
                issues.push({
                    field: 'aiDailyLimit',
                    message: 'AI Daily Limit must be a positive number',
                });
            }
        }

        return { issues };
    },
};

export default tenantDataSource;
