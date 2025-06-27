import { router, adminProcedure } from '@/server/trpc';

export const usersRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    const users = await ctx.prisma.user.findMany({
      include: {
        members: {
          where: {
            organizationId: ctx.user.organizationId,
          },
        },
      },
    });

    return users.map((user) => ({
      ...user,
      role: user.members[0]?.role,
      organizationId: user.members[0]?.organizationId,
    }));
  }),
});
