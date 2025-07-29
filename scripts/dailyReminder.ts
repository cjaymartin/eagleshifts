import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { prisma } from '@/lib/prisma';
import { sendShiftReminderEmail } from '@/lib/email';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Main function
async function dailyReminder() {
  try {
    console.log('Starting daily shift reminders...');

    // Get all organizations with their profiles
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

      console.log(`Processing organization ${organizationId} with timezone ${orgTimezone}`);

      // Get all members who want shift reminders
      const members = await prisma.member.findMany({
        where: {
          organizationId,
          settings: {
            notifyMeBeforeShift: true,
          },
        },
        include: {
          user: true,
          settings: true,
        },
      });

      console.log(`Found ${members.length} members who want shift reminders`);

      // Process each member
      for (const member of members) {
        const email = member.user.email;
        if (!email) continue;

        // Get the number of days before the shift to send the reminder
        // Default to 1 day if not specified
        const daysBeforeShift = member.settings?.notifyMeBeforeShiftDays ? parseInt(member.settings.notifyMeBeforeShiftDays) : 1;

        // Calculate the target date in the organization's timezone
        const targetDateStart = dayjs().tz(orgTimezone).add(daysBeforeShift, 'days').startOf('day');
        const targetDateEnd = dayjs().tz(orgTimezone).add(daysBeforeShift, 'days').endOf('day');

        console.log(`Processing member ${member.id} (${email}), reminder days: ${daysBeforeShift}`);
        console.log(`Target date: ${targetDateStart.format('YYYY-MM-DD')} to ${targetDateEnd.format('YYYY-MM-DD')}`);

        // Get shifts for this member on the target date
        const shifts = await prisma.shift.findMany({
          where: {
            organizationId,
            startTime: {
              gte: targetDateStart.toDate(),
              lte: targetDateEnd.toDate(),
            },
            shiftAssignments: {
              some: {
                memberId: member.id,
                outcome: 'assigned',
              },
            },
          },
        });

        console.log(`Found ${shifts.length} shifts for member on target date`);

        // Send reminder emails for each shift
        for (const shift of shifts) {
          console.log(`Sending reminder for shift ${shift.id} (${shift.title})`);
          await sendShiftReminderEmail(email, shift);
        }
      }
    }

    console.log('Daily reminders completed successfully');
  } catch (error) {
    console.error('Error in daily reminders:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
dailyReminder()
  .then(() => {
    console.log('Daily reminder script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error running daily reminder script:', error);
    process.exit(1);
  });
