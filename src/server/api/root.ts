import { router } from '@/server/trpc';
import { protectedProcedure } from '@/server/trpc';

import { shiftsRouter } from './routers/shiftsRouter';
import { usersRouter } from './routers/usersRouter';
import { availabilityRouter } from '@/server/api/routers/availabilityRouter';

export const appRouter = router({
    shifts: shiftsRouter,
    users: usersRouter,
    availability: availabilityRouter,

    session: router({
        get: router({
            index: protectedProcedure.query(({ ctx }) => {
                return {
                    user: ctx.user,
                    session: ctx.session,
                };
            }),
        }),
    }),
});

// Import this type in your client code
export type AppRouter = typeof appRouter;
