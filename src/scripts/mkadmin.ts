import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid'; // Use UUID package for generating random UUIDs

async function main() {
    // Get the email from the command-line arguments
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error('Usage: tsx mkadmin <email>');
        process.exit(1);
    }
    const email = args[0];

    try {
        // Upsert admin organization if not already present
        const adminOrg = await prisma.organization.upsert({
            where: { id: '00000000-0000-0000-0000-000000000000' },
            update: {},
            create: {
                id: '00000000-0000-0000-0000-000000000000', // Fixed ID for admin organization
                name: 'Admin',
                slug: 'admin',
            },
        });

        console.log('Upserted admin organization:', adminOrg);

        // Find the user with the provided email
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            console.error(`No user found with email: ${email}`);
            process.exit(1);
        }

        console.log(`Found user: ${user.email}`);

        // Check if the user is already a member of the admin organization
        const existingMember = await prisma.member.findFirst({
            where: {
                userId: user.id,
                organizationId: adminOrg.id,
            },
        });

        if (existingMember) {
            console.log(
                `User ${user.email} is already a member of the admin organization.`
            );
        } else {
            // Add the user to the admin organization
            const newMember = await prisma.member.create({
                data: {
                    id: uuidv4(), // Generate a random UUID for the `id` column
                    userId: user.id,
                    organizationId: adminOrg.id,
                    role: 'admin', // Assigning them an admin role; adjust as needed
                    createdAt: new Date(), // Use the current timestamp for `createdAt`
                },
            });
            console.log(
                `Successfully added user ${user.email} to the admin organization as a member:`,
                newMember
            );
        }
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
