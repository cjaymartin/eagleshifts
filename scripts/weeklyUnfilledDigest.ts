import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { prisma } from '@/lib/prisma';
import { sendUnfilledShiftDigestEmail } from '@/lib/email';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Main function
async function weeklyUnfilledDigest() {
  try {
    console.log('Starting weekly unfilled digest...');

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

      // Get all admin members who want unfilled digests
      const adminMembers = await prisma.member.findMany({
        where: {
          organizationId,
          role: { in: ['admin', 'owner'] },
          settings: {
            unfilledDigest: true,
          },
        },
        include: {
          user: true,
          settings: true,
        },
      });

      console.log(`Found ${adminMembers.length} admin members who want unfilled digests`);

      // Get all shifts for the upcoming week
      const shifts = await prisma.shift.findMany({
        where: {
          organizationId,
          date: {
            gte: weekStartDate.toDate(),
            lt: weekEndDate.toDate(),
          },
        },
        include: {
          shiftAssignments: true,
        },
        orderBy: {
          date: 'asc',
        },
      });

      console.log(`Found ${shifts.length} shifts for the upcoming week`);

      // Filter for unfilled shifts (no assignments or fewer assignments than slots)
      const unfilledShifts = shifts.filter(shift => {
        const slots = shift.slots || 1;
        const assigned = shift.shiftAssignments?.length || 0;
        return assigned === 0 || assigned < slots;
      });

      console.log(`Found ${unfilledShifts.length} unfilled shifts`);

      // Send emails to admin members if there are unfilled shifts
      if (unfilledShifts.length > 0) {
        for (const admin of adminMembers) {
          const email = admin.user.email;
          if (!email) continue;

          console.log(`Sending unfilled digest to admin ${admin.id} (${email})`);
          await sendUnfilledShiftDigestEmail(email, unfilledShifts, weekStartDate, weekEndDate);
        }
      }
    }

    console.log('Weekly unfilled digest completed successfully');
  } catch (error) {
    console.error('Error in weekly unfilled digest:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
weeklyUnfilledDigest()
  .then(() => {
    console.log('Weekly unfilled digest script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error running weekly unfilled digest script:', error);
    process.exit(1);
  });
