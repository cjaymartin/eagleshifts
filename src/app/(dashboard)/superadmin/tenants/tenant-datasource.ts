import { DataSource } from "@toolpad/core";
import { Organization } from "@/generated/prisma";
import { 
  getManyOrganizations,
  getOneOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization,
} from "./actions";

const tenantDataSource: DataSource<Organization> = {
  fields: [
    // { field: "id", headerName: "ID" },
    { field: "name", headerName: "Name" },
    { field: "slug", headerName: "Slug" },
    // { field: "logo", headerName: "Logo" },
    // { field: "createdAt", headerName: "Created At" },
    // { field: "metadata", headerName: "Metadata" }
  ],

  // Fetch multiple organizations with pagination
  getMany: async ({ paginationModel }) => {
    return getManyOrganizations({ paginationModel });
  },

  // Fetch a single organization by ID
  getOne: async (id: string) => {
    return getOneOrganization(id);
  },

  // Create a new organization
  createOne: async (data: Partial<Organization>) => {
    await createOrganization(data);
  },

  // Update an organization by ID
  updateOne: async (id: string, data: Partial<Organization>) => {
    return updateOrganization(id, data);
  },

  // Delete an organization by ID
  deleteOne: async (id: string) => {
    return deleteOrganization(id);
  },

  // Validate data before creation or update
  validate: (formValues) => {
    console.log({formValues});
    return { issues: [] };
  }
};

export default tenantDataSource;