import { prisma } from '@/lib/prisma';
import workos from '@/lib/workos';

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

        if (!workosOrgId) {
            // Create or get organization in WorkOS using idempotency key
            createdOrg = await workos.organizations.createOrganization({
              name: org.name,
              allowExistingOrganizationName: true,
              idempotencyKey: org.id // Use our DB ID as idempotency key
            });
            
            log(`Synced Organization: ${org.name} (${createdOrg.id})`);
            workosOrgId = createdOrg.id;

            // Update local organization with WorkOS ID
            await prisma.organization.update({
                where: { id: org.id },
                data: { workosOrganizationId: workosOrgId },
            });
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
