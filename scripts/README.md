# Eagle Shifts Scheduled Tasks

This folder contains scripts for scheduled tasks that need to be run periodically. These scripts were ported from Firebase functions to standalone TypeScript scripts that can be run using cron jobs.

## Available Scripts

### 1. Weekly Digest (`weeklyDigest.ts`)

Sends a weekly digest of upcoming shifts to users who have opted in to receive it. The digest includes details about shifts the user is assigned to for the upcoming week.

**Cron Schedule:** Weekly (on the day specified in each organization's settings)
```
0 6 * * 0 cd /path/to/eagleshifts && npx tsx scripts/weeklyDigest.ts
```

### 2. Weekly Unfilled Digest (`weeklyUnfilledDigest.ts`)

Sends a weekly digest of unfilled shifts to admin users who have opted in to receive it. The digest includes details about shifts that have no assignments or fewer assignments than available slots.

**Cron Schedule:** Weekly (on the day specified in each organization's settings)
```
0 6 * * 0 cd /path/to/eagleshifts && npx tsx scripts/weeklyUnfilledDigest.ts
```

### 3. Daily Reminder (`dailyReminder.ts`)

Sends daily reminders to users about their upcoming shifts. The reminder is sent a configurable number of days before the shift (as specified in each user's notification settings).

**Cron Schedule:** Daily at 9:00 PM
```
0 21 * * * cd /path/to/eagleshifts && npx tsx scripts/dailyReminder.ts
```

## Running the Scripts

The scripts can be run using the following command:

```bash
npx tsx scripts/<script-name>.ts
```

For example:

```bash
npx tsx scripts/dailyReminder.ts
```

## Setting Up Cron Jobs

To set up cron jobs to run these scripts automatically, you can use the following commands:

```bash
# Edit the crontab
crontab -e

# Add the following lines (adjust paths as needed)
0 6 * * 0 cd /path/to/eagleshifts && npx tsx scripts/weeklyDigest.ts
0 6 * * 0 cd /path/to/eagleshifts && npx tsx scripts/weeklyUnfilledDigest.ts
0 21 * * * cd /path/to/eagleshifts && npx tsx scripts/dailyReminder.ts
```

Make sure to replace `/path/to/eagleshifts` with the actual path to your Eagle Shifts project.

## Environment Variables

These scripts require the following environment variables to be set:

- `EMAIL_SERVER`: SMTP server hostname
- `EMAIL_USER`: SMTP server username
- `EMAIL_PASSWORD`: SMTP server password
- `EMAIL_FROM`: Email address to send from

These should be the same environment variables used by the main application.