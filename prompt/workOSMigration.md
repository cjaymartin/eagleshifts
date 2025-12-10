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

### Bug Fixes & Improvements

- [x] **Availability Display Bug**: Fixed incorrect property access (`user.members[0].id`) in Availability page.
- [x] **Missing Invited Users**: Updated `listWorkOSMembers` to fetch pending invitations and auto-create local members.
- [x] **Zombie Users**: Filtered out local members not present in WorkOS (unless they are explicit Non-Account Members).

---

## 🚧 In Progress

### Team Management Features (Phase 2)

**Direct User Creation** (no invite flow):

- [ ] Create custom form → WorkOS Create User API
- [ ] Add user to organization via WorkOS API
- [ ] Create local Member record for app-specific data

**Role Management**:

- [ ] Update to use WorkOS Organization Membership API

---

## 📋 Next Steps

### Phase 1: Member Data Source Abstraction

1. Create a unified team member service/hook that:

    - Fetches users from WorkOS organization
    - Provides consistent interface for all components
    - Handles caching/performance

2. Update each affected component:
    - [ ] Team Member dropdown (shift create/edit)
    - [ ] Assigned To filter dropdown
    - [ ] Availability dropdown
    - [ ] My Team page listing

### Phase 2: My Team Page Functionality

1. **List members** - Use WorkOS List Organization Users API
2. **Invite flow** - Use WorkOS Invitation API
3. **Direct user creation** (no invite):
    - Cannot use WorkOS User Management widget
    - Need custom form → WorkOS Create User API
    - Then add user to organization
4. **Role management** - Use WorkOS Organization Membership API
5. **Remove members** - Use WorkOS Remove User from Organization API

### Phase 3: Data Model Decisions

**Key Questions to Resolve:**

- Keep `Member` table for app-specific fields (icalSlug, isAvailableByDefault, phoneNumber, metadata)?
- Or migrate all member data to WorkOS user metadata?
- Relationship handling for: Availability, ShiftAssignment, ShiftRequest, ShiftDraft, Uploads, ChecklistItemCompletion

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
