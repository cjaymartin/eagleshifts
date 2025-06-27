This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel
# Eagle Shifts

## API Migration Guide: Elysia to tRPC

This project is migrating from Elysia to tRPC. Here's what you need to know:

### What Changed

- API handlers have been migrated from Elysia to tRPC
- All client queries now use tRPC client instead of eden client
- The API routes have been updated to support both implementations during transition

### How to Use the New API

#### Server-side

API routes are now defined in the following locations:
- `src/server/api/root.ts` - Main router that combines all sub-routers
- `src/server/api/routers/` - Individual routers for different resources
- `src/server/trpc.ts` - tRPC configuration and middleware

#### Client-side

```typescript
// Import the tRPC client
import { trpc } from '@/lib/trpc/client';

// Use queries and mutations
function MyComponent() {
  // Query example
  const { data, isLoading } = trpc.shifts.list.useQuery();

  // Mutation example
  const mutation = trpc.shifts.create.useMutation();

  const handleSubmit = (data) => {
    mutation.mutate(data);
  };

  // Rest of component...
}
```

### Migration Status

All API endpoints have been migrated, but some components may still be using the old client.

A legacy API is available during the transition period at `/api/legacy`.

The `USE_TRPC` flag in `src/lib/utils/dependencies.ts` controls which implementation to use.
The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
