# Remaining Functions from Firebase Project

This document lists the remaining functions from the Firebase project that were not ported as part of the email triggers or scheduled tasks implementation.

## User Management Functions

### From `users.js`:

1. `disableRegistration` - A simple HTTP function that returns false.
2. `list` - A callable function that lists users for a tenant.
3. `create` - A callable function that creates a new user.
4. `deleteUser` - A callable function that deletes a user.
5. `getImitateToken` - A callable function that creates a custom token for a user.
6. `onWriteFromUserCollection` - A Firestore trigger that updates user data in Firebase Auth when the user document is updated.
7. `auditLogEachLogin` - A function that logs user logins.

### From `invite.js`:

1. `checkCode` - Verifies an invitation code for a user.
2. `setPassword` - Sets a password for a user after they've accepted an invitation.

## Tenant Management Functions

### From `tenants.js`:

1. `getByKey` - A callable function that retrieves a tenant by its key.

## API Functions

### From `api.ts`:

1. `/api/hello-world` - A simple endpoint that returns "Hello World!".
2. `/api/t/:tenantId` - An endpoint that returns tenant information.
3. `/api/t/:tenantId/u/:icalSlug/ical` - An endpoint that generates an iCal file for a user's shifts.

## Other Functions

### From `index.ts`:

1. `disableRegistration` - A simple HTTP function that returns false.
2. `setupEmulatorUsers` - A callable function for setting up users in the Firebase emulator.

## Notes

Most of these functions are already implemented in the NextJS app through various routers and API endpoints. The remaining functions are either specific to Firebase (like `setupEmulatorUsers`) or have been replaced by equivalent functionality in the NextJS app.

The email triggers and scheduled tasks were the most important functions to port, as they provide critical functionality for the application. The remaining functions can be implemented as needed based on the specific requirements of the NextJS app.