import { Elysia, t } from 'elysia';
import elysiaUserService from '@/api/utils/elysiaUserService';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma';

const apiUserRouter = new Elysia({ prefix: '/users' })
    .use(elysiaUserService)

    // List shifts with optional filters
    .get(
        '/',
        async ({ user }) => {
            const users = await prisma.user.findMany({
                include: {
                    members: {
                        where: {
                            organizationId: user!.organizationId,
                        },
                    },
                },
            });

            return users.map((user) => ({
                ...user,
                role: user.members[0]?.role,
                organizationId: user.members[0]?.organizationId,
            }));
        },
        { role: 'admin' }
    );

export default apiUserRouter;
