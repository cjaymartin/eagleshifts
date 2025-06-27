import { router, adminProcedure } from '@/server/trpc';
import { z } from 'zod';

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

  updateDefaultAvailability: adminProcedure
    .input(
      z.object({
        memberId: z.string(),
        isAvailableByDefault: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { memberId, isAvailableByDefault } = input;

      // Update the member's isAvailableByDefault field
      const updatedMember = await ctx.prisma.member.update({
        where: { id: memberId },
        data: { isAvailableByDefault },
      });

      return updatedMember;
    }),

  getMemberById: adminProcedure
    .input(
      z.object({
        memberId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { memberId } = input;

      const member = await ctx.prisma.member.findUnique({
        where: { id: memberId },
        include: {
          user: true,
        },
      });

      if (!member) {
        throw new Error('Member not found');
      }

      return member;
    }),
});
