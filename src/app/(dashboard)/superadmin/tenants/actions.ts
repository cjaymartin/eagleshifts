"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Organization } from "@/generated/prisma";
import {authClient} from "@/lib/auth-client";

// Authentication check function
async function checkSuperAdminAccess() {
  const session = await auth.api.getSession({ headers: await headers() });
  const isGod = session?.user?.email === "cjay.martin@gmail.com";

  if (!isGod) {
    throw new Error("Unauthorized");
  }

  return session;
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

  await auth.api.checkOrganizationSlug({
    body: {
      slug: data.slug!,
    },
    headers: await headers(),
  })

  // First create the organization with standard fields
  const newOrg = await auth.api.createOrganization({
    body: {
      name: data.name!,
      slug: data.slug!,
    },
    headers: await headers(),
  });

  // Then update the AI-specific fields directly using Prisma
  if (newOrg && newOrg.id) {
    await prisma.organization.update({
      where: { id: newOrg.id },
      data: {
        aiEnabled: data.aiEnabled,
        aiDailyLimit: data.aiDailyLimit !== undefined ? Number(data.aiDailyLimit) : undefined,
      }
    });
  }

  return newOrg;
}

// Update an organization by ID
export async function updateOrganization(organizationId: string, data: Partial<Organization>) {
  await checkSuperAdminAccess();

  // First update the organization using the auth API to handle standard fields
  await auth.api.updateOrganization({
    body: {
      organizationId,
      data: {
        name: data.name!,
        slug: data.slug!,
      }
    },
    headers: await headers(),
  });

  // Then update the AI-specific fields directly using Prisma
  return prisma.organization.update({
    where: { id: organizationId },
    data: {
      aiEnabled: data.aiEnabled,
      aiDailyLimit: data.aiDailyLimit !== undefined ? Number(data.aiDailyLimit) : undefined,
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
