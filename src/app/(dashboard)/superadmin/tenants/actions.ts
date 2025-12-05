"use server";

import { withAuth } from '@workos-inc/authkit-nextjs';
import { WorkOS } from '@workos-inc/node';

const workos = new WorkOS(process.env.WORKOS_API_KEY);

// WorkOS sample/protected organizations that should be hidden from the UI
const PROTECTED_ORG_NAMES = ['Test Organization'];

function isProtectedOrg(name: string): boolean {
  return PROTECTED_ORG_NAMES.includes(name);
}

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
  console.log('[getManyOrganizations] Called with paginationModel:', paginationModel);
  await checkSuperAdminAccess();

  // Fetch all organizations to support pagination
  // Note: For large datasets, this should be optimized to use WorkOS cursors if possible,
  // but for the admin dashboard, fetching all is likely acceptable.
  let allOrgs: any[] = [];
  let after: string | undefined = undefined;

  do {
    const response = await workos.organizations.listOrganizations({ 
      limit: 100, 
      after 
    });
    allOrgs.push(...response.data);
    after = response.listMetadata.after;
  } while (after);

  console.log('[getManyOrganizations] Fetched', allOrgs.length, 'organizations from WorkOS');

  // Filter out protected organizations (like WorkOS staging samples)
  const filteredOrgs = allOrgs.filter(org => !isProtectedOrg(org.name));
  console.log('[getManyOrganizations] Filtered out', allOrgs.length - filteredOrgs.length, 'protected organizations');

  const start = paginationModel.page * paginationModel.pageSize;
  const end = start + paginationModel.pageSize;
  const sliced = filteredOrgs.slice(start, end);

  const result = {
    items: sliced.map(org => ({
      id: org.id,
      name: org.name,
      // Map other fields if needed, but we are removing slug
    })),
    itemCount: filteredOrgs.length
  };
  
  console.log('[getManyOrganizations] Returning', result.items.length, 'items out of', result.itemCount, 'total');
  console.log('[getManyOrganizations] Items:', JSON.stringify(result.items, null, 2));
  return result;
}

// Fetch a single organization by ID
export async function getOneOrganization(id: string) {
  console.log('[getOneOrganization] Called with id:', id, 'Type:', typeof id);
  await checkSuperAdminAccess();
  
  if (!id || id === 'undefined') {
    console.error('[getOneOrganization] Invalid id received:', id);
    throw new Error(`Invalid organization ID: ${id}`);
  }
  
  return workos.organizations.getOrganization(id);
}

// Create a new organization
export async function createOrganization(data: { name: string; assignCurrentUserAsAdmin?: boolean }) {
  console.log('[createOrganization] Called with data:', data);
  const { user } = await checkSuperAdminAccess();
  
  // Prevent creating protected organization names
  if (isProtectedOrg(data.name)) {
    throw new Error(`Cannot create organization with protected name: "${data.name}"`);
  }
  
  const result = await workos.organizations.createOrganization({ name: data.name });
  console.log('[createOrganization] Created organization:', result);
  
  // Add current user as admin if requested
  if (data.assignCurrentUserAsAdmin !== false) {
    console.log('[createOrganization] Adding current user as admin to organization');
    try {
      // Check if user already has membership
      const memberships = await workos.userManagement.listOrganizationMemberships({
        userId: user.id,
        organizationId: result.id
      });
      
      if (memberships.data.length === 0) {
        // Create organization membership
        const membership = await workos.userManagement.createOrganizationMembership({
          userId: user.id,
          organizationId: result.id,
        });
        console.log('[createOrganization] Created membership:', membership);
        
        // Update role to admin
        const updatedMembership = await workos.userManagement.updateOrganizationMembership(
          membership.id,
          { roleSlug: 'admin' }
        );
        console.log('[createOrganization] Updated membership to admin:', updatedMembership);
      } else {
        console.log('[createOrganization] User already has membership in this organization');
      }
    } catch (error: any) {
      console.error('[createOrganization] Failed to add user as admin:', error.message);
      // Don't fail the entire request if membership creation fails
    }
  }
  
  return result;
}

// Update an organization by ID
export async function updateOrganization(id: string, data: { name: string; assignCurrentUserAsAdmin?: boolean }) {
  console.log('[updateOrganization] Called with id:', id, 'data:', data);
  const { user } = await checkSuperAdminAccess();
  
  const org = await workos.organizations.getOrganization(id);
  console.log('[updateOrganization] Fetched current org:', org);
  
  // Prevent updating protected organizations
  if (isProtectedOrg(org.name)) {
      console.error('[updateOrganization] Attempt to update protected organization blocked');
      throw new Error(`Cannot update protected organization: "${org.name}"`);
  }
  
  // Prevent renaming the Admin organization
  if (org.name === 'Admin' && data.name !== 'Admin') {
      console.error('[updateOrganization] Attempt to rename Admin organization blocked');
      throw new Error("Cannot rename the Admin organization.");
  }
  
  // Prevent renaming to a protected name
  if (isProtectedOrg(data.name)) {
      console.error('[updateOrganization] Attempt to rename to protected name blocked');
      throw new Error(`Cannot rename organization to protected name: "${data.name}"`);
  }

  const result = await workos.organizations.updateOrganization({ 
    organization: id, 
    name: data.name 
  });
  console.log('[updateOrganization] Updated organization:', result);
  
  // Add current user as admin if requested and there are no existing admins/owners
  if (data.assignCurrentUserAsAdmin !== false) {
    console.log('[updateOrganization] Checking for existing admin/owner members');
    try {
      // List all memberships for the organization
      const allMemberships = await workos.userManagement.listOrganizationMemberships({
        organizationId: id
      });
      
      // Check if there are any admin or owner members
      const hasAdmin = allMemberships.data.some(m => 
        m.role?.slug === 'admin' || m.role?.slug === 'owner'
      );
      
      if (!hasAdmin) {
        console.log('[updateOrganization] No admin/owner found, adding current user as admin');
        
        // Check if user already has membership
        const userMemberships = await workos.userManagement.listOrganizationMemberships({
          userId: user.id,
          organizationId: id
        });
        
        if (userMemberships.data.length === 0) {
          // Create organization membership
          const membership = await workos.userManagement.createOrganizationMembership({
            userId: user.id,
            organizationId: id,
          });
          console.log('[updateOrganization] Created membership:', membership);
          
          // Update role to admin
          const updatedMembership = await workos.userManagement.updateOrganizationMembership(
            membership.id,
            { roleSlug: 'admin' }
          );
          console.log('[updateOrganization] Updated membership to admin:', updatedMembership);
        } else {
          // User already has membership, just update the role
          const updatedMembership = await workos.userManagement.updateOrganizationMembership(
            userMemberships.data[0].id,
            { roleSlug: 'admin' }
          );
          console.log('[updateOrganization] Updated existing membership to admin:', updatedMembership);
        }
      } else {
        console.log('[updateOrganization] Admin/owner already exists, skipping auto-assign');
      }
    } catch (error: any) {
      console.error('[updateOrganization] Failed to check/add admin:', error.message);
      // Don't fail the entire request if membership creation fails
    }
  }
  
  return result;
}

// Delete an organization by ID
export async function deleteOrganization(id: string) {
  console.log('[deleteOrganization] Called with id:', id);
  await checkSuperAdminAccess();
  
  const org = await workos.organizations.getOrganization(id);
  console.log('[deleteOrganization] Fetched current org:', org);
  
  // Prevent deleting protected organizations
  if (isProtectedOrg(org.name)) {
      console.error('[deleteOrganization] Attempt to delete protected organization blocked');
      throw new Error(`Cannot delete protected organization: "${org.name}"`);
  }
  
  // Prevent deleting the Admin organization
  if (org.name === 'Admin') {
      console.error('[deleteOrganization] Attempt to delete Admin organization blocked');
      throw new Error("Cannot delete the Admin organization.");
  }

  const result = await workos.organizations.deleteOrganization(id);
  console.log('[deleteOrganization] Deleted organization:', result);
  return result;
}
