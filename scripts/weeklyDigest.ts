import dayjs from 'dayjs';
import { prisma } from '@/lib/prisma';
import { sendShiftDigestEmail, sendNoShiftDigestEmail } from '@/lib/email';

// Main function
async function weeklyDigest() {
  try {
    console.log('Starting weekly digest...');

    // Get the current day of the week (0 = Sunday, 1 = Monday, etc.)
    const dowNum = dayjs().day();
    const dowLookup: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    const revDowLookup: Record<number, string> = {};
    Object.entries(dowLookup).forEach(([key, value]) => {
      revDowLookup[value] = key;
    });

    const dowName = revDowLookup[dowNum];

    // Get all organizations that have digest email set to today
    const organizations = await prisma.organization.findMany({
      where: {
        profile: {
          digestEmailDate: dowName,
        },
      },
      include: {
        profile: true,
      },
    });

    console.log(`Found ${organizations.length} organizations to process`);

    for (const organization of organizations) {
      const organizationId = organization.id;

      // Get the organization's week start day (default to Sunday)
      const weekStart = organization.profile?.weekStart || 'sunday';
      const weekStartNum = dowLookup[weekStart];

      // Calculate the start and end dates for the week
      const weekStartDate = dayjs().startOf('week').add(weekStartNum, 'days');
      const weekEndDate = dayjs(weekStartDate).add(1, 'week');

      console.log(`Processing organization ${organizationId}`);
      console.log(`Week start: ${weekStart} (${weekStartNum})`);
      console.log(`Week dates: ${weekStartDate.format('YYYY-MM-DD')} to ${weekEndDate.format('YYYY-MM-DD')}`);

      // Get all members who want weekly digests
      const members = await prisma.member.findMany({
        where: {
          organizationId,
          settings: {
            weeklyDigest: true,
          },
        },
        include: {
          user: true,
          settings: true,
        },
      });

      console.log(`Found ${members.length} members who want digests`);

      // Process each member
      for (const member of members) {
        const email = member.user.email;
        if (!email) continue;

        console.log(`Processing member ${member.id} (${email})`);

        // Get shifts for this member in the upcoming week
        const shifts = await prisma.shift.findMany({
          where: {
            organizationId,
            date: {
              gte: weekStartDate.toDate(),
              lt: weekEndDate.toDate(),
            },
            shiftAssignments: {
              some: {
                memberId: member.id,
                outcome: 'assigned',
              },
            },
          },
          orderBy: {
            date: 'asc',
          },
        });

        console.log(`Found ${shifts.length} shifts for member`);

        // Send appropriate email
        if (shifts.length > 0) {
          await sendShiftDigestEmail(email, shifts, weekStartDate, weekEndDate);
        } else {
          await sendNoShiftDigestEmail(email, weekStartDate, weekEndDate);
        }
      }
    }

    console.log('Weekly digest completed successfully');
  } catch (error) {
    console.error('Error in weekly digest:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
weeklyDigest()
  .then(() => {
    console.log('Weekly digest script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error running weekly digest script:', error);
    process.exit(1);
  });
