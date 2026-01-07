# WorkOS Migration Tracker

> Migration from better-auth to WorkOS AuthKit

---

## ✅ Completed

### Authentication & Authorization

- [x] Login flow working with WorkOS AuthKit
- [x] Organization switcher functional with WorkOS
- [x] Page-level permissions working with WorkOS roles
- [x] TRPC context updated to be "WorkOS-first" for user/role resolution
- [x] Superadmin tenant management (create/update organizations via WorkOS)
- [x] Auto-assign admin/owner when creating organizations

### Infrastructure

- [x] WorkOS callback route handler
- [x] Cookie-based active organization ID management
- [x] `workosOrganizationId` field on Prisma `Organization` model for mapping
- [x] **Impersonate User Feature Removed**: Deleted legacy `imitate` plugin and routes.

---

### Team Member Data Migration (Phase 1)

- [x] `listWorkOSMembers` procedure added to `usersRouter.ts`
    - Fetches org memberships from WorkOS
    - Gets user details for each membership
    - Merges with local Prisma `Member` data for app-specific fields
    - Falls back to Prisma-only data if no WorkOS org ID
- [x] `useTeamUsersQuery` updated to use new procedure
- [x] All components verified to use shared query:
    - TeamMemberAutocomplete (shift assignment dropdown)
    - My Team page (`/team`)
    - Availability dropdown
    - Assigned To filter

### Backend Cleanup (Phase 1 Completion)

- [x] Extracted `syncWorkOSMembersToLocal` helper function from `listWorkOSMembers`
- [x] Removed deprecated `list` procedure (unused)
- [x] Updated frontend query keys to reference `listWorkOSMembers`
- [x] Added integration tests for `usersRouter` (`tests/integration/usersRouter.test.ts`)

### Bug Fixes & Improvements

- [x] **Availability Display Bug**: Fixed incorrect property access (`user.members[0].id`) in Availability page.
- [x] **Missing Invited Users**: Updated `listWorkOSMembers` to fetch pending invitations and auto-create local members.
- [x] **Zombie Users**: Filtered out local members not present in WorkOS (unless they are explicit Non-Account Members).

---

## 🚧 In Progress

### Team Management Features (Phase 2)

**Role Management**:

- [ ] Update to use WorkOS Organization Membership API

---

## 📋 Next Steps

### ~~Phase 1: Member Data Source Abstraction~~ ✅ COMPLETE

See "Backend Cleanup" section above.

### ~~Phase 2: My Team Page Functionality~~ ✅ COMPLETE

1. **List members** - Use WorkOS List Organization Users API
2. **Invite flow** - Use WorkOS Invitation API
3. **Role management** - Use WorkOS Organization Membership API
4. **Remove members** - Use WorkOS Remove User from Organization API

### ~~Phase 3: Data Integrity & Seeding~~ ✅ COMPLETE

1. **Update Seed Script**:
    - Updated `src/utils/seedDatabase.ts` with WorkOS-compatible documentation
    - Added `workosOrganizationId: null` to seeded organizations
    - Confirmed no legacy auth data (passwords, sessions) - already clean
    - *Note*: Auto-sync mechanism was implemented but then removed in favor of Phase 4's "Loose Coupling" strategy.


### Phase 4: Data Model Redesign (Loose Coupling)

**Goal**: Minimize local data storage and rely on WorkOS as the source of truth. Remove strict foreign key dependencies on the local `Member` table where possible.

**Strategy**:
1.  **Remove Auto-Sync**: Stop trying to sync all WorkOS users to local `Member` records automatically.
2.  **Reference by WorkOS User ID**: Update related tables (`Availability`, `ShiftAssignment`, etc.) to store `workosUserId` instead of (or in addition to) `memberId`.
3.  **Optional Member Profile**: Keep `Member` table only for users who need app-specific settings (e.g., `isAvailableByDefault`, `icalSlug`), but make the relationship loose.
4.  **Schema Updates**:
    - Add `workosUserId` to `ShiftAssignment`, `Availability`, `ShiftRequest`, `ShiftDraft`, `Upload`, `ChecklistItemCompletion`.
    - Make `memberId` nullable or remove it in favor of `workosUserId`.
    - Remove `User` table eventually? (Or keep as cache?)

**Tasks**:
- [ ] Add `workosUserId` column to dependent tables
- [ ] Update TRPC routers to query by `workosUserId`
- [ ] Refactor `usersRouter` to fetch from WorkOS directly without relying on local `Member` existence
- [ ] Remove `syncWorkOSMembersToLocal` usage from critical paths

### Phase 5: Workflow & UX Improvements

- [ ] **Force Login**: Logged-out users should immediately land on the login page.
- [ ] **Org Persistence**: Users who have logged in recently should default to the org they logged into last time.

### Phase 6: Direct User Creation

**Direct User Creation** (no invite flow):

- [ ] Create custom form → WorkOS Create User API
- [ ] Add user to organization via WorkOS API
- [ ] Create local Member record for app-specific data

---

## 🔗 Prisma/WorkOS Data Relationships

### Member Table Fields to Migrate or Keep

| Field                  | Decision    | Notes                                   |
| ---------------------- | ----------- | --------------------------------------- |
| `name`                 | WorkOS      | Use WorkOS user profile                 |
| `image`                | WorkOS      | Use WorkOS user profile                 |
| `role`                 | WorkOS      | Use WorkOS organization membership role |
| `icalSlug`             | Keep/Extend | App-specific, WorkOS metadata?          |
| `isAvailableByDefault` | Keep/Extend | App-specific                            |
| `phoneNumber`          | Keep/Extend | Could be WorkOS metadata                |
| `metadata`             | Keep/Extend | App-specific settings                   |

### Tables Dependent on Member

- `MemberSettings` - User notification preferences
- `Availability` - User availability records
- `shiftAssignment` - User assigned to shifts
- `ShiftRequest` - User shift requests
- `ShiftDraft` - Drafts created by users
- `Upload` - Files uploaded by users
- `ChecklistItemCompletion` - Completed checklist items

---

Impersonation

## ⚠️ Constraints

1. **No WorkOS User Management Widget** - Need custom UI for My Team page
2. **Must support direct user creation** - Can't rely solely on invite flow
3. **Existing data relationships** - Many tables reference `Member.id`

---

## 📚 Relevant WorkOS APIs

- [List Organization Users](https://workos.com/docs/user-management/organization-membership/list-members)
- [Add User to Organization](https://workos.com/docs/user-management/organization-membership/add-member)
- [Remove User from Organization](https://workos.com/docs/user-management/organization-membership/remove-member)
- [Create User](https://workos.com/docs/user-management/users/create-user)
- [Get User](https://workos.com/docs/user-management/users/get-user)

---

## 🗑️ Legacy Artifacts & Cleanup Recommendations

The following Prisma models and database tables are remnants of the previous authentication system (`better-auth` / `next-auth`) and should be removed or cleaned up.

### 1. Unused Tables (Safe to Delete)

These tables are no longer referenced in the active codebase and can be dropped from the schema and database.

- **`Account`**: Previously used for storing OAuth provider accounts (Google, etc.).
    - _Status_: 1 legacy account found (Google).
    - _Recommendation_: **Delete**. WorkOS handles identity linking.
- **`Verification`**: Previously used for email verification tokens.
    - _Status_: Unused.
    - _Recommendation_: **Delete**.
- **`TwoFactor`**: Previously used for 2FA secrets.
    - _Status_: Unused.
    - _Recommendation_: **Delete**.

### 2. Tables with Partial/Broken Usage

- **`Session`**:
    - _Current Usage_: Referenced only in `src/lib/auth/plugins/imitate.ts` and `team/imitate/route.ts` for the "Impersonate User" feature.
    - _Issue_: The current `createTRPCContext` relies **exclusively** on WorkOS authentication (`withAuth`) and ignores the local `Session` table. This means the current "Imitate" functionality is likely broken or ineffective for TRPC procedures.
    - _Recommendation_: **Delete table** and reimplement Impersonation using [WorkOS Impersonation](https://workos.com/docs/user-management/impersonation) or a compatible approach.

### 3. `User` Model Cleanup

The `User` model is still required to link local data (like `Member`) to WorkOS users, but it contains many legacy fields.

- **Keep**: `id`, `email`, `name`, `image`, `createdAt`, `updatedAt`, `emailVerified` (synced from WorkOS).
- **Remove/Deprecate**:
    - `password` (Auth is now WorkOS)
    - `twoFactorEnabled` (Handled by WorkOS)
    - `banExpires` (Banning handled by WorkOS or `banned` flag)
    - `sessions` (Relation to Session table)
    - `accounts` (Relation to Account table)
    - `twofactors` (Relation to TwoFactor table)

### 4. Legacy Data

- **Non-Account Members**: There is 1 "placeholder" member (non-account).
    - _Recommendation_: **Keep**. These are valid for users who are assigned shifts but haven't logged in yet. Ensure the "Invite" flow works to convert them to full WorkOS users.
