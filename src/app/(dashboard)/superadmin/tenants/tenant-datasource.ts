import { DataSource } from '@toolpad/core';
import {
    getManyOrganizations,
    getOneOrganization,
    createOrganization,
    updateOrganization,
    deleteOrganization,
} from './actions';

// Define a local interface for the data source, matching what actions.ts returns
export interface OrganizationData {
    id: string;
    name: string;
    assignCurrentUserAsAdmin?: boolean;
    [key: string]: any;
    [key: symbol]: any;
}

const tenantDataSource: DataSource<OrganizationData> = {
    fields: [
        // { field: "id", headerName: "ID" },
        { field: 'name', headerName: 'Name' },
        { 
            field: 'assignCurrentUserAsAdmin', 
            headerName: 'Assign Me as Admin', 
            type: 'boolean',
        },
        // { field: "logo", headerName: "Logo" },
        // { field: "createdAt", headerName: "Created At" },
        // { field: "metadata", headerName: "Metadata" }
    ],

    // Fetch multiple organizations with pagination
    getMany: async ({ paginationModel }) => {
        console.log('[DataSource.getMany] Called with paginationModel:', paginationModel);
        const result = await getManyOrganizations({ paginationModel });
        console.log('[DataSource.getMany] Returned:', result);
        return result;
    },

    // Fetch a single organization by ID
    getOne: async (id: any) => {
        console.log('[DataSource.getOne] Called with id:', id, 'Type:', typeof id);
        const result = await getOneOrganization(id);
        console.log('[DataSource.getOne] Returned:', result);
        return result as any;
    },

    // Create a new organization
    createOne: async (data: Partial<OrganizationData>) => {
        console.log('[DataSource.createOne] Called with data:', data);
        if (!data.name) throw new Error("Name is required");
        const result = await createOrganization({ 
            name: data.name,
            assignCurrentUserAsAdmin: data.assignCurrentUserAsAdmin ?? true 
        });
        console.log('[DataSource.createOne] Returned:', result);
        return result as any;
    },

    // Update an organization by ID
    updateOne: async (id: any, data: Partial<OrganizationData>) => {
        console.log('[DataSource.updateOne] Called with id:', id, 'data:', data);
        if (!data.name) throw new Error("Name is required");
        const result = await updateOrganization(id, { 
            name: data.name,
            assignCurrentUserAsAdmin: data.assignCurrentUserAsAdmin ?? true 
        });
        console.log('[DataSource.updateOne] Returned:', result);
        return result as any;
    },

    // Delete an organization by ID
    deleteOne: async (id: any) => {
        console.log('[DataSource.deleteOne] Called with id:', id);
        const result = await deleteOrganization(id);
        console.log('[DataSource.deleteOne] Returned:', result);
        return result as any;
    },

    // Validate data before creation or update
    validate: (formValues) => {
        console.log('[DataSource.validate] Called with formValues:', formValues);
        return { issues: [] };
    },
};

export default tenantDataSource;
