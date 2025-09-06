# Project Guidelines for Eagle Shifts

## Project Overview
Eagle Shifts is a Next.js application for managing employee shifts. It's a multi-tenant application where users belong to different organizations. The application allows administrators to create, manage, and assign shifts to team members, while team members can view their assigned shifts.

Key features include:
- Shift management (creation, editing, deletion)
- Draft shifts
- Shift assignments to team members
- Timezone-aware scheduling
- Export shifts to Excel
- Calendar view of shifts
- User and organization management

## Project Structure
- `/src/app`: Next.js App Router structure
  - `/(dashboard)`: Dashboard pages and components
    - `/shifts`: Shift management pages and components
    - `/calendar`: Calendar view of shifts
    - `/team`: Team management
    - `/business`: Business/organization settings
    - `/account`: User account settings
    - Other dashboard sections
  - `/auth`: Authentication pages
- `/src/server`: Server-side code
  - `/api`: API routes and handlers
    - `/routers`: tRPC routers for different resources
    - `/root.ts`: Main tRPC router
  - `/trpc.ts`: tRPC configuration
- `/src/components`: Reusable React components
- `/src/lib`: Utility libraries and client setup
- `/src/queries`: React Query hooks for data fetching
- `/src/utils`: Utility functions
- `/prisma`: Prisma ORM schema and migrations
- `/tests`: Test files

## Technology Stack
- **Frontend**: Next.js, React, Material UI, React Hook Form
- **API**: tRPC (migrated from Elysia)
- **Data Fetching**: React Query
- **Database**: Prisma ORM
- **Authentication**: Custom auth solution
- **Testing**: Jest, React Testing Library
- **Date/Time Handling**: dayjs, luxon, moment
- **File Handling**: XLSX, FileSaver

## Testing Guidelines
When making changes to the codebase, Junie should:
1. Run relevant tests to ensure changes don't break existing functionality
2. Use the command `npm test` to run all tests
3. For specific test files, use `npm test -- path/to/test/file.test.ts`
4. Consider adding new tests for new functionality or bug fixes

## Building and Running the Project
- Development: `npm run dev`
- Build: `npm run build`
- Start: `npm run start`
- Database migrations: Various commands available in package.json

## Code Style Guidelines
1. Follow TypeScript best practices
2. Use React functional components with hooks
3. Use tRPC for API communication
4. Follow the existing project structure
5. Use React Hook Form for form handling
6. Use Zod for validation
7. Ensure proper error handling
8. Make sure components are responsive
9. Follow Material UI design patterns
10. Always check and fix TypeScript/lint issues when creating or updating files
    - Run `npm run lint` to check for linting issues
    - Fix all TypeScript errors and warnings before submitting changes

## Material UI Guidelines
1. Use MUI components in MUI 7.1 format
   - For Grid components, use the `size` prop instead of `item` with `xs`, `sm`, `md` props:
     - Correct: `<Grid size={{ xs: 12, sm: 6, md: 4 }}>`
     - Incorrect: `<Grid item xs={12} sm={6} md={4}>`
   - Container Grid usage remains the same: `<Grid container spacing={2}>`
2. Refer to the [MUI 7.0 Migration Guide](https://mui.com/material-ui/migration/migration-v7/) for other component changes
3. Key changes in MUI 7.0:
   - Grid: `item` + `xs/sm/md/lg/xl` props replaced with `size` prop
   - Many components have new default styling
   - Some components have new APIs and behavior
   - Improved TypeScript support and stricter types

## Important Notes
- The project is undergoing an API migration from Elysia to tRPC
- The application is timezone-aware and should handle different timezones correctly
- The application is multi-tenant, with users belonging to different organizations
