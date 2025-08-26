import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seeds the database with initial data for development purposes.
 * This function should be called from a server root page.
 *
 * It will:
 * 1. Check if we're in development environment (NOOP if production)
 * 2. Check if "Admin" organization already exists (NOOP if it does)
 * 3. Create Admin and Test organizations
 * 4. Add a user for cjay.martin@gmail.com as owner of both organizations
 * 5. Create realistic locations in Massachusetts
 * 6. Add employee team members
 * 7. Create shifts for the current month
 * 8. Create availability for team members
 */
export async function seedDatabase() {
    // 1. Check if we're in development environment
    if (process.env.NODE_ENV === 'production') {
        return;
    }

    try {
        // 2. Check if "Admin" organization already exists
        const existingAdminOrg = await prisma.organization.findFirst({
            where: { slug: 'admin' },
        });

        if (existingAdminOrg) {
            return;
        }

        console.log('Starting database seeding...');

        // 3. Create Admin and Test organizations
        const adminOrg = await prisma.organization.create({
            data: {
                id: '00000000-0000-0000-0000-000000000000', // Fixed ID for admin organization
                name: 'Admin',
                slug: 'admin',
            },
        });

        console.log('Created Admin organization:', adminOrg);

        const testOrg = await prisma.organization.create({
            data: {
                id: uuidv4(),
                name: 'Test',
                slug: 'test',
            },
        });

        console.log('Created Test organization:', testOrg);

        // 4. Add a user for cjay.martin@gmail.com as owner of both organizations
        // First, check if the user exists
        let user = await prisma.user.findUnique({
            where: { email: 'cjay.martin@gmail.com' },
        });

        // If user doesn't exist, create it
        if (!user) {
            user = await prisma.user.create({
                data: {
                    id: uuidv4(),
                    name: 'CJay Martin',
                    email: 'cjay.martin@gmail.com',
                    emailVerified: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            });
            console.log('Created user:', user);
        } else {
            console.log('Found existing user:', user);
        }

        // Add user as member of Admin organization
        const adminMember = await prisma.member.upsert({
            where: {
                organizationId_userId: {
                    organizationId: adminOrg.id,
                    userId: user.id,
                },
            },
            update: {
                role: 'owner',
            },
            create: {
                id: uuidv4(),
                organizationId: adminOrg.id,
                userId: user.id,
                role: 'owner',
                createdAt: new Date(),
                isActivated: true,
            },
        });

        console.log('Added user as owner to Admin organization:', adminMember);

        // Add user as member of Test organization
        const testMember = await prisma.member.upsert({
            where: {
                organizationId_userId: {
                    organizationId: testOrg.id,
                    userId: user.id,
                },
            },
            update: {
                role: 'owner',
            },
            create: {
                id: uuidv4(),
                organizationId: testOrg.id,
                userId: user.id,
                role: 'owner',
                createdAt: new Date(),
                isActivated: true,
            },
        });

        console.log('Added user as owner to Test organization:', testMember);

        // 5. Create realistic locations in Massachusetts
        const massachusettsLocations = [
            {
                name: 'Boston Downtown Office',
                address: '100 State Street, Boston, MA 02109',
                latitude: 42.3588,
                longitude: -71.0578,
            },
            {
                name: 'Cambridge Innovation Center',
                address: '245 Main Street, Cambridge, MA 02142',
                latitude: 42.3625,
                longitude: -71.0843,
            },
            {
                name: 'Quincy Market Branch',
                address: '4 S Market St, Boston, MA 02109',
                latitude: 42.3598,
                longitude: -71.0545,
            },
            {
                name: 'Somerville Office',
                address: '50 Assembly Row, Somerville, MA 02145',
                latitude: 42.3926,
                longitude: -71.0792,
            },
            {
                name: 'Brookline Store',
                address: '1717 Beacon St, Brookline, MA 02445',
                latitude: 42.3382,
                longitude: -71.1411,
            },
            {
                name: 'Newton Center',
                address: '825 Beacon St, Newton, MA 02459',
                latitude: 42.3279,
                longitude: -71.1912,
            },
            {
                name: 'Waltham Office Park',
                address: '1601 Trapelo Rd, Waltham, MA 02451',
                latitude: 42.4051,
                longitude: -71.2242,
            },
            {
                name: 'Lexington Branch',
                address: '1875 Massachusetts Ave, Lexington, MA 02420',
                latitude: 42.4462,
                longitude: -71.229,
            },
            {
                name: 'Burlington Mall Store',
                address: '75 Middlesex Turnpike, Burlington, MA 01803',
                latitude: 42.4847,
                longitude: -71.215,
            },
            {
                name: 'Woburn Office',
                address: '300 TradeCenter, Woburn, MA 01801',
                latitude: 42.5047,
                longitude: -71.1372,
            },
            {
                name: 'Medford Square',
                address: '34 Salem St, Medford, MA 02155',
                latitude: 42.4184,
                longitude: -71.1065,
            },
            {
                name: 'Malden Center',
                address: '350 Main St, Malden, MA 02148',
                latitude: 42.4269,
                longitude: -71.0661,
            },
        ];

        const createdLocations = [];
        for (const location of massachusettsLocations) {
            const createdLocation = await prisma.location.create({
                data: {
                    id: uuidv4(),
                    organizationId: testOrg.id,
                    name: location.name,
                    address: location.address,
                    latitude: location.latitude,
                    longitude: location.longitude,
                },
            });
            createdLocations.push(createdLocation);
            console.log(`Created location: ${createdLocation.name}`);
        }

        // Create LocationGroups and assign locations to them
        const locationGroups = [
            {
                name: 'Boston Area',
                color: '#4CAF50', // Green
            },
            {
                name: 'Cambridge Area',
                color: '#2196F3', // Blue
            },
            {
                name: 'Suburban Offices',
                color: '#FF9800', // Orange
            },
        ];

        const createdLocationGroups = [];
        for (const group of locationGroups) {
            const createdGroup = await prisma.locationGroup.create({
                data: {
                    id: uuidv4(),
                    organizationId: testOrg.id,
                    name: group.name,
                    color: group.color,
                },
            });
            createdLocationGroups.push(createdGroup);
            console.log(`Created location group: ${createdGroup.name} with color ${createdGroup.color}`);
        }

        // Assign locations to groups
        // Boston Area: Boston Downtown Office, Quincy Market Branch
        await prisma.location.update({
            where: { id: createdLocations[0].id }, // Boston Downtown Office
            data: { groupId: createdLocationGroups[0].id },
        });
        await prisma.location.update({
            where: { id: createdLocations[2].id }, // Quincy Market Branch
            data: { groupId: createdLocationGroups[0].id },
        });
        console.log(`Assigned Boston Downtown Office and Quincy Market Branch to Boston Area group`);

        // Cambridge Area: Cambridge Innovation Center, Somerville Office
        await prisma.location.update({
            where: { id: createdLocations[1].id }, // Cambridge Innovation Center
            data: { groupId: createdLocationGroups[1].id },
        });
        await prisma.location.update({
            where: { id: createdLocations[3].id }, // Somerville Office
            data: { groupId: createdLocationGroups[1].id },
        });
        console.log(`Assigned Cambridge Innovation Center and Somerville Office to Cambridge Area group`);

        // Suburban Offices: Brookline Store, Newton Center, Waltham Office Park
        await prisma.location.update({
            where: { id: createdLocations[4].id }, // Brookline Store
            data: { groupId: createdLocationGroups[2].id },
        });
        await prisma.location.update({
            where: { id: createdLocations[5].id }, // Newton Center
            data: { groupId: createdLocationGroups[2].id },
        });
        await prisma.location.update({
            where: { id: createdLocations[6].id }, // Waltham Office Park
            data: { groupId: createdLocationGroups[2].id },
        });
        console.log(`Assigned Brookline Store, Newton Center, and Waltham Office Park to Suburban Offices group`);

        // 6. Add employee team members
        const teamMembers = [
            {
                name: 'John Smith',
                email: 'john.smith@example.com',
                role: 'member',
            },
            {
                name: 'Sarah Johnson',
                email: 'sarah.johnson@example.com',
                role: 'member',
            },
            {
                name: 'Michael Brown',
                email: 'michael.brown@example.com',
                role: 'member',
            },
            {
                name: 'Emily Davis',
                email: 'emily.davis@example.com',
                role: 'member',
            },
            {
                name: 'David Wilson',
                email: 'david.wilson@example.com',
                role: 'member',
            },
            {
                name: 'Jessica Martinez',
                email: 'jessica.martinez@example.com',
                role: 'member',
            },
        ];

        const createdMembers = [];
        for (const member of teamMembers) {
            // Create user if it doesn't exist
            let teamUser = await prisma.user.findUnique({
                where: { email: member.email },
            });

            if (!teamUser) {
                teamUser = await prisma.user.create({
                    data: {
                        id: uuidv4(),
                        name: member.name,
                        email: member.email,
                        emailVerified: true,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                });
            }

            // Add user as member of Test organization
            const teamMember = await prisma.member.create({
                data: {
                    id: uuidv4(),
                    organizationId: testOrg.id,
                    userId: teamUser.id,
                    role: member.role,
                    createdAt: new Date(),
                    isActivated: false, // Not activated as per requirement
                    name: member.name,
                },
            });

            createdMembers.push(teamMember);
            console.log(`Created team member: ${teamMember.name}`);
        }

        // 7. Create shifts for the current month
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        // Create shifts for the next 30 days
        const shifts = [];
        for (let day = 0; day < 30; day++) {
            const shiftDate = new Date(
                currentYear,
                currentMonth,
                currentDate.getDate() + day
            );

            // Skip weekends for some variety
            if (shiftDate.getDay() === 0 || shiftDate.getDay() === 6) continue;

            // Create 2-3 shifts per day at different locations
            const numShifts = Math.floor(Math.random() * 2) + 2; // 2-3 shifts

            for (let i = 0; i < numShifts; i++) {
                const locationIndex = Math.floor(
                    Math.random() * createdLocations.length
                );
                const location = createdLocations[locationIndex];

                // Random shift duration between 4-8 hours
                const durationHours = Math.floor(Math.random() * 5) + 4;

                // Random start time between 8am and 2pm
                const startHour = Math.floor(Math.random() * 7) + 8;
                const startTime = new Date(shiftDate);
                startTime.setHours(startHour, 0, 0, 0);

                const endTime = new Date(startTime);
                endTime.setHours(startTime.getHours() + durationHours);

                const shift = await prisma.shift.create({
                    data: {
                        id: uuidv4(),
                        organizationId: testOrg.id,
                        title: `Shift at ${location.name}`,
                        locationId: location.id,
                        startTime: startTime,
                        endTime: endTime,
                        slots: Math.floor(Math.random() * 3) + 1, // 1-3 slots
                        notes: `Regular shift at ${location.name}`,
                        timezone: 'America/New_York',
                    },
                });

                shifts.push(shift);
                console.log(
                    `Created shift: ${shift.title} on ${startTime.toLocaleDateString()}`
                );

                // Randomly assign shifts to members
                if (Math.random() > 0.5) {
                    const memberIndex = Math.floor(
                        Math.random() * createdMembers.length
                    );
                    const member = createdMembers[memberIndex];

                    await prisma.shiftAssignment.create({
                        data: {
                            id: uuidv4(),
                            shiftId: shift.id,
                            memberId: member.id,
                            outcome: 'accepted',
                        },
                    });

                    console.log(`Assigned shift to ${member.name}`);
                }
            }
        }

        // 8. Create availability for team members
        // For each team member, create availability for the next 30 days
        for (const member of createdMembers) {
            // Create 5-10 availability entries per member
            const numAvailabilities = Math.floor(Math.random() * 6) + 5;

            for (let i = 0; i < numAvailabilities; i++) {
                // Random start date within the next 30 days
                const startDay = Math.floor(Math.random() * 25); // Leave room for multi-day availabilities
                const startDate = new Date(
                    currentYear,
                    currentMonth,
                    currentDate.getDate() + startDay
                );

                // Random duration between 1-5 days
                const durationDays = Math.floor(Math.random() * 5) + 1;
                const endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + durationDays);

                // Random start and end times (in minutes from midnight)
                const startTime = Math.floor(Math.random() * 12) * 60 + 480; // 8am to 8pm in minutes from midnight
                const endTime =
                    startTime + (Math.floor(Math.random() * 8) + 2) * 60; // 2-10 hours later

                // Randomly available or unavailable
                const isAvailable = Math.random() > 0.4; // 60% chance of being available

                await prisma.availability.create({
                    data: {
                        id: uuidv4(),
                        memberId: member.id,
                        startDate: startDate,
                        endDate: endDate,
                        startTime: startTime,
                        endTime: endTime,
                        desc: isAvailable
                            ? 'Available for work'
                            : 'Unavailable during this time',
                        isAvailable: isAvailable,
                    },
                });

                console.log(
                    `Created ${isAvailable ? 'availability' : 'unavailability'} for ${member.name}`
                );
            }
        }

        console.log('Database seeding completed successfully!');
    } catch (error) {
        console.error('Error seeding database:', error);
    }
}
