import { z } from 'zod';
import { router, adminProcedure, memberProcedure } from '@/server/trpc';
import { Prisma } from '@/generated/prisma';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { TRPCError } from '@trpc/server';

// Extend dayjs with UTC plugin
dayjs.extend(utc);

export const requestsRouter = router({
    list: memberProcedure
        .input(
            z
                .object({
                    pendingOnly: z.boolean().optional(),
                })
                .optional()
        )
        .query(async ({ ctx, input }) => {
            // Build filter conditions
            const where: Prisma.ShiftRequestWhereInput = {};

            // Get the member ID for the current user in the current organization
            const member = await ctx.prisma.member.findFirst({
                where: {
                    organizationId: ctx.user.organizationId,
                    userId: ctx.user.id,
                },
                select: {
                    id: true,
                },
            });

            // If the user is not an admin, only show their own requests
            const role = ctx.user.role || 'member';
            const isAdmin = ['admin', 'owner'].includes(role);

            if (!isAdmin && member) {
                where.memberId = member.id;
            }

            // Filter by status if pendingOnly is true
            if (input?.pendingOnly) {
                where.status = 'pending';
            }

            // Get filtered requests
            const requests = await ctx.prisma.shiftRequest.findMany({
                where,
                include: {
                    shift: true,
                    member: { include: { user: true } },
                },
                orderBy: { createdAt: 'desc' },
            });

            return requests;
        }),

    byId: memberProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const request = await ctx.prisma.shiftRequest.findFirst({
                where: {
                    id: input.id,
                },
                include: {
                    shift: true,
                    member: true,
                },
            });

            if (!request) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Request not found',
                });
            }

            // Check if the user is allowed to view this request
            const role = ctx.user.role || 'member';
            const isAdmin = ['admin', 'owner'].includes(role);

            if (!isAdmin) {
                // Get the member ID for the current user in the current organization
                const member = await ctx.prisma.member.findFirst({
                    where: {
                        organizationId: ctx.user.organizationId,
                        userId: ctx.user.id,
                    },
                    select: {
                        id: true,
                    },
                });

                // If the user is not the owner of the request, throw an error
                if (member && request.memberId !== member.id) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'You are not authorized to view this request',
                    });
                }
            }

            return request;
        }),

    create: memberProcedure
        .input(
            z.object({
                shiftId: z.string(),
                reason: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Get the member ID for the current user in the current organization
            const member = await ctx.prisma.member.findFirst({
                where: {
                    organizationId: ctx.user.organizationId,
                    userId: ctx.user.id,
                },
                select: {
                    id: true,
                },
            });

            if (!member) {
                throw new Error('You are not a member of this organization');
            }

            // Check if the shift exists and belongs to the current organization
            const shift = await ctx.prisma.shift.findFirst({
                where: {
                    id: input.shiftId,
                    organizationId: ctx.user.organizationId,
                },
            });

            if (!shift) {
                throw new Error('Shift not found');
            }

            // Check if the user already has a request for this shift
            const existingRequest = await ctx.prisma.shiftRequest.findFirst({
                where: {
                    shiftId: input.shiftId,
                    memberId: member.id,
                },
            });

            if (existingRequest) {
                throw new Error('You already have a request for this shift');
            }

            // Create the request
            const request = await ctx.prisma.shiftRequest.create({
                data: {
                    shiftId: input.shiftId,
                    memberId: member.id,
                    status: 'pending',
                    reason: input.reason,
                },
                include: {
                    shift: true,
                    member: true,
                },
            });

            return request;
        }),

    update: memberProcedure
        .input(
            z.object({
                id: z.string(),
                status: z.enum(['pending', 'approved', 'rejected']),
                reason: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            try {
                // Check if the request exists
                const existingRequest = await ctx.prisma.shiftRequest.findFirst(
                    {
                        where: {
                            id: input.id,
                        },
                        include: {
                            shift: true,
                            member: true,
                        },
                    }
                );

                if (!existingRequest) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Request not found',
                    });
                }

                // Check if the shift belongs to the current organization
                if (
                    existingRequest.shift.organizationId !==
                    ctx.user.organizationId
                ) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You are not authorized to update this request',
                    });
                }

                // If the user is not an admin and is trying to approve/reject a request,
                // or if they're trying to update someone else's request, throw an error
                const role = ctx.user.role || 'member';
                const isAdmin = ['admin', 'owner'].includes(role);

                if (!isAdmin) {
                    // Get the member ID for the current user
                    const member = await ctx.prisma.member.findFirst({
                        where: {
                            organizationId: ctx.user.organizationId,
                            userId: ctx.user.id,
                        },
                        select: {
                            id: true,
                        },
                    });

                    // If the user is not the owner of the request, throw an error
                    if (member && existingRequest.memberId !== member.id) {
                        throw new TRPCError({
                            code: 'FORBIDDEN',
                            message: 'You can only update your own requests',
                        });
                    }

                    // If the user is trying to approve/reject a request, throw an error
                    if (input.status !== 'pending') {
                        throw new TRPCError({
                            code: 'FORBIDDEN',
                            message:
                                'Only admins can approve or reject requests',
                        });
                    }
                }

                // Update the request
                const request = await ctx.prisma.shiftRequest.update({
                    where: {
                        id: input.id,
                    },
                    data: {
                        status: input.status,
                        reason: input.reason,
                    },
                    include: {
                        shift: true,
                        member: true,
                    },
                });

                // If the request is approved, create a shift assignment
                if (input.status === 'approved') {
                    // Check if there's already an assignment for this member and shift
                    const existingAssignment =
                        await ctx.prisma.shiftAssignment.findFirst({
                            where: {
                                shiftId: request.shiftId,
                                memberId: request.memberId,
                            },
                        });

                    if (!existingAssignment) {
                        // Create a new assignment
                        await ctx.prisma.shiftAssignment.create({
                            data: {
                                shiftId: request.shiftId,
                                memberId: request.memberId,
                                outcome: 'assigned',
                                reason: 'Approved from request',
                            },
                        });
                    } else {
                        // Update the existing assignment
                        await ctx.prisma.shiftAssignment.update({
                            where: {
                                id: existingAssignment.id,
                            },
                            data: {
                                outcome: 'assigned',
                                reason: 'Approved from request',
                            },
                        });
                    }
                }

                return request;
            } catch (error: any) {
                throw new Error(`Failed to update request: ${error.message}`);
            }
        }),

    delete: memberProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            try {
                // Get the request
                const request = await ctx.prisma.shiftRequest.findFirst({
                    where: {
                        id: input.id,
                    },
                    include: {
                        shift: true,
                    },
                });

                if (!request) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Request not found',
                    });
                }

                // Check if the user is allowed to delete this request
                const role = ctx.user.role || 'member';
                const isAdmin = ['admin', 'owner'].includes(role);

                if (!isAdmin) {
                    // Get the member ID for the current user in the current organization
                    const member = await ctx.prisma.member.findFirst({
                        where: {
                            organizationId: ctx.user.organizationId,
                            userId: ctx.user.id,
                        },
                        select: {
                            id: true,
                        },
                    });

                    // If the user is not the owner of the request, throw an error
                    if (member && request.memberId !== member.id) {
                        throw new TRPCError({
                            code: 'FORBIDDEN',
                            message:
                                'You are not authorized to delete this request',
                        });
                    }
                }

                // Delete the request
                await ctx.prisma.shiftRequest.delete({
                    where: {
                        id: input.id,
                    },
                });

                return {
                    success: true,
                    message: 'Request deleted successfully',
                };
            } catch (error: any) {
                throw new Error(`Failed to delete request: ${error.message}`);
            }
        }),

    deleteOld: adminProcedure.mutation(async ({ ctx }) => {
        try {
            // Get all requests for shifts that are more than 4 weeks old
            const fourWeeksAgo = dayjs().subtract(4, 'week').toDate();

            const oldRequests = await ctx.prisma.shiftRequest.findMany({
                where: {
                    shift: {
                        date: {
                            lt: fourWeeksAgo,
                        },
                        organizationId: ctx.user.organizationId,
                    },
                },
                select: {
                    id: true,
                },
            });

            // Delete the old requests
            if (oldRequests.length > 0) {
                await ctx.prisma.shiftRequest.deleteMany({
                    where: {
                        id: {
                            in: oldRequests.map((r) => r.id),
                        },
                    },
                });
            }

            return {
                success: true,
                message: `${oldRequests.length} old requests deleted successfully`,
            };
        } catch (error: any) {
            throw new Error(`Failed to delete old requests: ${error.message}`);
        }
    }),

    seed: adminProcedure.query(async ({ ctx }) => {
        try {
            // Check if the organization already has any requests
            const existingRequestsCount = await ctx.prisma.shiftRequest.count({
                where: {
                    shift: {
                        organizationId: ctx.user.organizationId,
                    },
                },
            });

            if (existingRequestsCount > 0) {
                throw new Error('Requests already exist for this organization');
            }

            // Get all shifts for the organization
            const shifts = await ctx.prisma.shift.findMany({
                where: {
                    organizationId: ctx.user.organizationId,
                },
                select: {
                    id: true,
                },
            });

            if (shifts.length === 0) {
                throw new Error(
                    'No shifts found. Please create shifts first before seeding requests.'
                );
            }

            // Get all members for the organization
            const members = await ctx.prisma.member.findMany({
                where: {
                    organizationId: ctx.user.organizationId,
                },
                select: {
                    id: true,
                },
            });

            if (members.length === 0) {
                throw new Error(
                    'No members found. Please add members to your organization first.'
                );
            }

            // Create random requests for random shifts
            const requestsToCreate: any[] = [];
            const statuses = ['pending', 'approved', 'rejected'];
            const reasons = [
                'I would like to work this shift',
                'I am available for this shift',
                'I need extra hours this week',
                'I can cover this shift',
                'I am interested in this location',
                'This shift fits my schedule',
                'I have experience with this type of shift',
                'I prefer this time slot',
                'I am requesting this shift',
                'I would appreciate being assigned to this shift',
            ];

            // Create between 10-20 random requests
            const numRequests = Math.floor(Math.random() * 11) + 10; // 10-20 requests

            for (let i = 0; i < numRequests; i++) {
                // Pick a random shift and member
                const randomShift =
                    shifts[Math.floor(Math.random() * shifts.length)];
                const randomMember =
                    members[Math.floor(Math.random() * members.length)];
                const randomStatus =
                    statuses[Math.floor(Math.random() * statuses.length)];
                const randomReason =
                    reasons[Math.floor(Math.random() * reasons.length)];

                // Check if this combination already exists in our to-create array
                const alreadyExists = requestsToCreate.some(
                    (req) =>
                        req.shiftId === randomShift.id &&
                        req.memberId === randomMember.id
                );

                // Only add if it doesn't already exist
                if (!alreadyExists) {
                    requestsToCreate.push({
                        shiftId: randomShift.id,
                        memberId: randomMember.id,
                        status: randomStatus,
                        reason: randomReason,
                    });
                }
            }

            // Insert requests into the database
            const createdRequests = await ctx.prisma.shiftRequest.createMany({
                data: requestsToCreate,
            });

            return {
                success: true,
                message: `${createdRequests.count} requests have been added for this organization.`,
                count: createdRequests.count,
            };
        } catch (error: any) {
            throw new Error(`Failed to seed requests: ${error.message}`);
        }
    }),
});
