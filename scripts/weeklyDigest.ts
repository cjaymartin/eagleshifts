import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { prisma } from '@/lib/prisma';
import { sendShiftDigestEmail, sendNoShiftDigestEmail } from '@/lib/email';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Main function
async function weeklyDigest() {
  try {
    console.log('Starting weekly digest...');

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

    // Get all organizations
    const organizations = await prisma.organization.findMany({
      include: {
        profile: true,
      },
    });

    console.log(`Found ${organizations.length} organizations to process`);

    for (const organization of organizations) {
      const organizationId = organization.id;

      // Get the organization's timezone (default to UTC)
      const orgTimezone = organization.profile?.timezone || 'UTC';

      // Get the current day of the week in the organization's timezone
      const dowNum = dayjs().tz(orgTimezone).day();
      const dowName = revDowLookup[dowNum];

      // Skip organizations that don't have digest email set to today in their timezone
      if (organization.profile?.digestEmailDate !== dowName) {
        console.log(`Skipping organization ${organizationId} - digest day is ${organization.profile?.digestEmailDate}, but today is ${dowName} in ${orgTimezone}`);
        continue;
      }

      // Get the organization's week start day (default to Sunday)
      const weekStart = organization.profile?.weekStart || 'sunday';
      const weekStartNum = dowLookup[weekStart];

      // Calculate the start and end dates for the week in the organization's timezone
      const weekStartDate = dayjs().tz(orgTimezone).startOf('week').add(weekStartNum, 'days');
      const weekEndDate = dayjs(weekStartDate).tz(orgTimezone).add(1, 'week');

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
