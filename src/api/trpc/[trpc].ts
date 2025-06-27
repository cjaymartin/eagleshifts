import * as trpcNext from '@trpc/server/adapters/next';

import { appRouter as myAppRouter } from '@/server';

export const appRouter = myAppRouter;
export type AppRouter = typeof appRouter;
export default trpcNext.createNextApiHandler({
    router: appRouter,
    createContext: () => null,
});
