"use server";

import { prisma } from "@/lib/prisma";
import { Organization } from "@/generated/prisma";
import { withAuth } from '@workos-inc/authkit-nextjs';
import { WorkOS } from '@workos-inc/node';

const workos = new WorkOS(process.env.WORKOS_API_KEY);

// Authentication check function
async function checkSuperAdminAccess() {
  const { user, organizationId } = await withAuth();
  
  if (!user || !organizationId) {
    throw new Error("Unauthorized");
  }

  // Get organization details from WorkOS
  const organization = await workos.organizations.getOrganization(organizationId);

  // Check if this is the admin organization
  if (organization.name !== 'Admin') {
    throw new Error("Unauthorized - must be in Admin organization");
  }

  return { user, organization };
}

// Fetch multiple organizations with pagination
export async function getManyOrganizations({ paginationModel }: { paginationModel: { page: number, pageSize: number } }) {
  await checkSuperAdminAccess();

  const start = paginationModel.page * paginationModel.pageSize;
  const end = start + paginationModel.pageSize;

  const organizations = await prisma.organization.findMany({
    skip: start,
    take: end - start
  });

  const totalOrganizations = await prisma.organization.count();

  console.log({
    items: organizations,
    itemCount: totalOrganizations,
  })
  return {
    items: organizations,
    itemCount: totalOrganizations
  };
}

// Fetch a single organization by ID
export async function getOneOrganization(id: string) {
  await checkSuperAdminAccess();

  return prisma.organization.findUnique({
    where: { id }
  });
}

// Create a new organization
export async function createOrganization(data: Partial<Organization>) {
  await checkSuperAdminAccess();

  // Create organization directly in database
  // Note: WorkOS organization sync should be handled separately if needed
  return prisma.organization.create({
    data: {
      id: data.id || crypto.randomUUID(),
      name: data.name!,
      slug: data.slug,
      metadata: data.metadata || null,
    }
  });
}

// Update an organization by ID
export async function updateOrganization(organizationId: string, data: Partial<Organization>) {
  await checkSuperAdminAccess();

  return prisma.organization.update({
    where: { id: organizationId },
    data: {
      name: data.name,
      slug: data.slug,
      metadata: data.metadata,
    }
  });
}

// Delete an organization by ID
export async function deleteOrganization(id: string) {
  await checkSuperAdminAccess();

  return prisma.organization.delete({
    where: { id }
  });
}
