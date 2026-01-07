import { prisma } from '@/lib/prisma';
import workos from '@/lib/workos';

/**
 * Syncs local Prisma users/organizations to WorkOS.
 * 
 * TODO: Remove this script (and runWorkOSSyncOnce.ts, and the call in layout.tsx)
 * once the WorkOS migration is settled and all users are synced.
 * 
 * Called automatically from layout.tsx via runWorkOSSyncOnce() - runs once per
 * server instance in production only.
 */
async function main() {
  console.log('Starting sync to WorkOS...');
  const logs: string[] = [];

  const log = (message: string) => {
    console.log(message);
    logs.push(message);
  };

  try {
    // 1. Sync Organizations
    const organizations = await prisma.organization.findMany();
    log(`Found ${organizations.length} organizations to sync.`);

    for (const org of organizations) {
      try {
        let workosOrgId = org.workosOrganizationId;
        
        // If no explicit link, check if the ID itself is a WorkOS ID
        if (!workosOrgId && org.id.startsWith('org_')) {
            workosOrgId = org.id;
        }

        let createdOrg;

        if (workosOrgId) {
            // Verify it exists in WorkOS
            try {
                createdOrg = await workos.organizations.getOrganization(workosOrgId);
                log(`Organization already linked: ${org.name} (${workosOrgId})`);
            } catch (e) {
                log(`Linked organization not found in WorkOS: ${workosOrgId}. Re-creating...`);
                workosOrgId = null; // Reset to create new
            }
        }

        if (!createdOrg) {
            // Create or get organization in WorkOS
            createdOrg = await workos.organizations.createOrganization({
              name: org.name,
            });
            
            log(`Synced Organization: ${org.name} (${createdOrg.id})`);
            
            // If the local ID matches the WorkOS ID, we are good.
            // If not, we MUST save the link in workosOrganizationId
            if (org.id !== createdOrg.id) {
                await prisma.organization.update({
                    where: { id: org.id },
                    data: { workosOrganizationId: createdOrg.id },
                });
                log(`Updated local organization ${org.name} with workosOrganizationId: ${createdOrg.id}`);
            }
            
            workosOrgId = createdOrg.id;
        }

        // 2. Sync Members
        const members = await prisma.member.findMany({
          where: { organizationId: org.id },
          include: { user: true }
        });

        for (const member of members) {
             try {
                 // Check if user exists
                 const users = await workos.userManagement.listUsers({
                     email: member.user.email,
                     limit: 1
                 });
                 
                 let workosUser = users.data[0];
                 
                 if (!workosUser) {
                     workosUser = await workos.userManagement.createUser({
                         email: member.user.email,
                         firstName: member.user.name?.split(' ')[0],
                         lastName: member.user.name?.split(' ').slice(1).join(' '),
                         emailVerified: member.user.emailVerified
                     });
                     log(`Created User: ${member.user.email}`);
                 } else {
                     // log(`User already exists: ${member.user.email}`);
                 }
                 
                 // Add user to Organization
                 const memberships = await workos.userManagement.listOrganizationMemberships({
                     userId: workosUser.id,
                     organizationId: workosOrgId!
                 });
                 
                 if (memberships.data.length === 0) {
                     await workos.userManagement.createOrganizationMembership({
                         userId: workosUser.id,
                         organizationId: workosOrgId!,
                     });
                     log(`Added ${member.user.email} to ${org.name}`);
                 } else {
                     // log(`Membership already exists for ${member.user.email} in ${org.name}`);
                 }
                 
             } catch (err: any) {
                 log(`Failed to sync member ${member.user.email}: ${err.message}`);
             }
        }

      } catch (error: any) {
        log(`Failed to sync organization ${org.name}: ${error.message}`);
      }
    }

    log('Sync completed.');
  } catch (error: any) {
    log(`Fatal error during sync: ${error.message}`);
  }
  
  return logs;
}

// Allow running directly
if (require.main === module) {
    main().then(() => process.exit(0)).catch(() => process.exit(1));
}

export { main as syncToWorkos };
