import { router } from '@/server/trpc';
import { protectedProcedure, publicProcedure } from '@/server/trpc';

import { shiftsRouter } from './routers/shiftsRouter';
import { usersRouter } from './routers/usersRouter';
import { availabilityRouter } from '@/server/api/routers/availabilityRouter';
import { requestsRouter } from '@/server/api/routers/requestsRouter';
import { teamRouter } from '@/server/api/routers/teamRouter';
import { icalRouter } from '@/server/api/routers/icalRouter';
import { uploadsRouter } from '@/server/api/routers/uploadsRouter';
import { logsRouter } from '@/server/api/routers/logsRouter';
import { locationsRouter } from '@/server/api/routers/locationsRouter';
import { invitationsRouter } from '@/server/api/routers/invitationsRouter';
import { checklistsRouter } from '@/server/api/routers/checklistsRouter';

export const appRouter = router({
    shifts: shiftsRouter,
    users: usersRouter,
    availability: availabilityRouter,
    requests: requestsRouter,
    team: teamRouter,
    ical: icalRouter,
    uploads: uploadsRouter,
    logs: logsRouter,
    locations: locationsRouter,
    invitations: invitationsRouter,
    checklists: checklistsRouter,

    session: router({
        get: router({
            index: publicProcedure.query(({ ctx }) => {
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
