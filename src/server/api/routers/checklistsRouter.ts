import { z } from 'zod';
import { router, adminProcedure, memberProcedure } from '@/server/trpc';
import { Prisma } from '@/generated/prisma';
import { TRPCError } from '@trpc/server';

export const checklistsRouter = router({
    // Check if a shift's checklist is complete
    isShiftChecklistComplete: memberProcedure
        .input(z.object({ shiftId: z.string() }))
        .query(async ({ ctx, input }) => {
            // Find the shift to ensure it belongs to the current organization
            const shift = await ctx.prisma.shift.findFirst({
                where: {
                    id: input.shiftId,
                    organizationId: ctx.user.organizationId,
                },
                include: {
                    Checklist: {
                        include: {
                            items: {
                                include: {
                                    completions: {
                                        where: {
                                            shiftId: input.shiftId,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });

            if (!shift || !shift.Checklist) {
                return { isComplete: false };
            }

            // Count total items and completed items
            const totalItems = shift.Checklist.items.length;
            const completedItems = shift.Checklist.items.filter(
                item => item.completions.some(completion => completion.completed)
            ).length;

            // Checklist is complete if all items are completed
            return { isComplete: completedItems === totalItems };
        }),

    // Batch check if multiple shifts' checklists are complete
    // This is more efficient for checking many shifts at once
    batchCheckShiftChecklists: memberProcedure
        .input(z.object({ shiftIds: z.array(z.string()) }))
        .query(async ({ ctx, input }) => {
            // Find all shifts in a single query
            const shifts = await ctx.prisma.shift.findMany({
                where: {
                    id: { in: input.shiftIds },
                    organizationId: ctx.user.organizationId,
                },
                include: {
                    Checklist: {
                        include: {
                            items: {
                                include: {
                                    completions: {
                                        where: {
                                            shiftId: { in: input.shiftIds },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });

            // Process results
            const results = shifts.reduce((acc, shift) => {
                if (!shift.Checklist) {
                    acc[shift.id] = false;
                    return acc;
                }

                const totalItems = shift.Checklist.items.length;
                const completedItems = shift.Checklist.items.filter(
                    item => item.completions.some(
                        completion => completion.completed && completion.shiftId === shift.id
                    )
                ).length;

                acc[shift.id] = completedItems === totalItems;
                return acc;
            }, {} as Record<string, boolean>);

            return results;
        }),

    // Get all checklists for the current organization
    list: memberProcedure.query(async ({ ctx }) => {
        const checklists = await ctx.prisma.checklist.findMany({
            where: {
                organizationId: ctx.user.organizationId,
            },
            include: {
                items: {
                    orderBy: {
                        order: 'asc',
                    },
                },
                _count: {
                    select: {
                        shifts: true,
                    },
                },
            },
        });

        return checklists;
    }),

    // Get a specific checklist by ID
    get: memberProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const checklist = await ctx.prisma.checklist.findFirst({
                where: {
                    id: input.id,
                    organizationId: ctx.user.organizationId,
                },
                include: {
                    items: {
                        orderBy: {
                            order: 'asc',
                        },
                    },
                },
            });

            if (!checklist) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Checklist not found',
                });
            }

            return checklist;
        }),

    // Create a new checklist
    create: adminProcedure
        .input(
            z.object({
                name: z.string(),
                description: z.string().optional(),
                items: z
                    .array(
                        z.object({
                            name: z.string(),
                            geoLocationEnabled: z.boolean().default(false),
                            commentsOption: z.enum(['required', 'optional', 'off']).default('optional'),
                            uploadOption: z.enum(['required', 'optional', 'off']).default('off'),
                        })
                    )
                    .optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Check if a checklist with the same name already exists
            const existingChecklist = await ctx.prisma.checklist.findFirst({
                where: {
                    organizationId: ctx.user.organizationId,
                    name: input.name,
                },
            });

            if (existingChecklist) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'A checklist with this name already exists',
                });
            }

            // Create the checklist
            const checklist = await ctx.prisma.checklist.create({
                data: {
                    organizationId: ctx.user.organizationId,
                    name: input.name,
                    description: input.description,
                    items: {
                        create: input.items?.map((item, index) => ({
                            name: item.name,
                            order: index,
                            geoLocationEnabled: item.geoLocationEnabled,
                            commentsOption: item.commentsOption,
                            uploadOption: item.uploadOption,
                        })) || [],
                    },
                },
                include: {
                    items: {
                        orderBy: {
                            order: 'asc',
                        },
                    },
                },
            });

            return checklist;
        }),

    // Update an existing checklist
    update: adminProcedure
        .input(
            z.object({
                id: z.string(),
                name: z.string(),
                description: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Check if the checklist exists and belongs to the current organization
            const existingChecklist = await ctx.prisma.checklist.findFirst({
                where: {
                    id: input.id,
                    organizationId: ctx.user.organizationId,
                },
            });

            if (!existingChecklist) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Checklist not found',
                });
            }

            // Check if another checklist with the same name exists
            if (input.name !== existingChecklist.name) {
                const duplicateNameChecklist = await ctx.prisma.checklist.findFirst({
                    where: {
                        organizationId: ctx.user.organizationId,
                        name: input.name,
                        id: { not: input.id },
                    },
                });

                if (duplicateNameChecklist) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'Another checklist with this name already exists',
                    });
                }
            }

            // Update the checklist
            const updatedChecklist = await ctx.prisma.checklist.update({
                where: {
                    id: input.id,
                },
                data: {
                    name: input.name,
                    description: input.description,
                },
                include: {
                    items: {
                        orderBy: {
                            order: 'asc',
                        },
                    },
                },
            });

            return updatedChecklist;
        }),

    // Delete a checklist
    delete: adminProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            // Check if the checklist exists and belongs to the current organization
            const existingChecklist = await ctx.prisma.checklist.findFirst({
                where: {
                    id: input.id,
                    organizationId: ctx.user.organizationId,
                },
                include: {
                    shifts: {
                        select: {
                            id: true,
                        },
                    },
                },
            });

            if (!existingChecklist) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Checklist not found',
                });
            }

            // Delete the checklist
            await ctx.prisma.checklist.delete({
                where: {
                    id: input.id,
                },
            });

            return { success: true, message: 'Checklist deleted successfully' };
        }),

    // Add an item to a checklist
    addItem: adminProcedure
        .input(
            z.object({
                checklistId: z.string(),
                name: z.string(),
                geoLocationEnabled: z.boolean().default(false),
                commentsOption: z.enum(['required', 'optional', 'off']).default('optional'),
                uploadOption: z.enum(['required', 'optional', 'off']).default('off'),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Check if the checklist exists and belongs to the current organization
            const checklist = await ctx.prisma.checklist.findFirst({
                where: {
                    id: input.checklistId,
                    organizationId: ctx.user.organizationId,
                },
                include: {
                    items: {
                        orderBy: {
                            order: 'asc',
                        },
                    },
                },
            });

            if (!checklist) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Checklist not found',
                });
            }

            // Get the highest order value
            const maxOrder = checklist.items.length > 0
                ? Math.max(...checklist.items.map(item => item.order))
                : -1;

            // Create the new item
            const newItem = await ctx.prisma.checklistItem.create({
                data: {
                    checklistId: input.checklistId,
                    name: input.name,
                    order: maxOrder + 1,
                    geoLocationEnabled: input.geoLocationEnabled,
                    commentsOption: input.commentsOption,
                    uploadOption: input.uploadOption,
                },
            });

            return newItem;
        }),

    // Update a checklist item
    updateItem: adminProcedure
        .input(
            z.object({
                id: z.string(),
                name: z.string(),
                geoLocationEnabled: z.boolean(),
                commentsOption: z.enum(['required', 'optional', 'off']),
                uploadOption: z.enum(['required', 'optional', 'off']),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Find the item to ensure it belongs to a checklist in the current organization
            const item = await ctx.prisma.checklistItem.findUnique({
                where: {
                    id: input.id,
                },
                include: {
                    checklist: {
                        select: {
                            organizationId: true,
                        },
                    },
                },
            });

            if (!item || item.checklist.organizationId !== ctx.user.organizationId) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Checklist item not found',
                });
            }

            // Update the item
            const updatedItem = await ctx.prisma.checklistItem.update({
                where: {
                    id: input.id,
                },
                data: {
                    name: input.name,
                    geoLocationEnabled: input.geoLocationEnabled,
                    commentsOption: input.commentsOption,
                    uploadOption: input.uploadOption,
                },
            });

            return updatedItem;
        }),

    // Delete a checklist item
    deleteItem: adminProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            // Find the item to ensure it belongs to a checklist in the current organization
            const item = await ctx.prisma.checklistItem.findUnique({
                where: {
                    id: input.id,
                },
                include: {
                    checklist: {
                        select: {
                            organizationId: true,
                            id: true,
                        },
                    },
                },
            });

            if (!item || item.checklist.organizationId !== ctx.user.organizationId) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Checklist item not found',
                });
            }

            // Delete the item
            await ctx.prisma.checklistItem.delete({
                where: {
                    id: input.id,
                },
            });

            // Reorder the remaining items
            const remainingItems = await ctx.prisma.checklistItem.findMany({
                where: {
                    checklistId: item.checklist.id,
                },
                orderBy: {
                    order: 'asc',
                },
            });

            // Update the order of each remaining item
            for (let i = 0; i < remainingItems.length; i++) {
                await ctx.prisma.checklistItem.update({
                    where: {
                        id: remainingItems[i].id,
                    },
                    data: {
                        order: i,
                    },
                });
            }

            return { success: true, message: 'Checklist item deleted successfully' };
        }),

    // Reorder checklist items
    reorderItems: adminProcedure
        .input(
            z.object({
                checklistId: z.string(),
                itemIds: z.array(z.string()),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Check if the checklist exists and belongs to the current organization
            const checklist = await ctx.prisma.checklist.findFirst({
                where: {
                    id: input.checklistId,
                    organizationId: ctx.user.organizationId,
                },
            });

            if (!checklist) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Checklist not found',
                });
            }

            // Update the order of each item
            for (let i = 0; i < input.itemIds.length; i++) {
                await ctx.prisma.checklistItem.update({
                    where: {
                        id: input.itemIds[i],
                    },
                    data: {
                        order: i,
                    },
                });
            }

            return { success: true, message: 'Checklist items reordered successfully' };
        }),

    // Complete a checklist item
    completeItem: memberProcedure
        .input(
            z.object({
                itemId: z.string(),
                shiftId: z.string(),
                completed: z.boolean().default(true),
                latitude: z.number().optional(),
                longitude: z.number().optional(),
                comments: z.string().optional(),
                uploadId: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Find the item to ensure it belongs to a checklist in the current organization
            const item = await ctx.prisma.checklistItem.findUnique({
                where: {
                    id: input.itemId,
                },
                include: {
                    checklist: {
                        select: {
                            organizationId: true,
                        },
                    },
                },
            });

            if (!item || item.checklist.organizationId !== ctx.user.organizationId) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Checklist item not found',
                });
            }

            // Find the shift to ensure it belongs to the current organization
            const shift = await ctx.prisma.shift.findFirst({
                where: {
                    id: input.shiftId,
                    organizationId: ctx.user.organizationId,
                },
            });

            if (!shift) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Shift not found',
                });
            }

            // Find the member record for the current user
            const member = await ctx.prisma.member.findFirst({
                where: {
                    organizationId: ctx.user.organizationId,
                    userId: ctx.user.id,
                },
            });

            if (!member) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Member not found',
                });
            }

            // Check if there's an existing completion record
            const existingCompletion = await ctx.prisma.checklistItemCompletion.findFirst({
                where: {
                    checklistItemId: input.itemId,
                    shiftId: input.shiftId,
                    memberId: member.id,
                },
            });

            // Validate required fields
            if (input.completed) {
                if (item.commentsOption === 'required' && !input.comments) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'Comments are required for this item',
                    });
                }

                if (item.uploadOption === 'required' && !input.uploadId) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'File upload is required for this item',
                    });
                }
            }

            // If there's an existing completion, update it
            if (existingCompletion) {
                if (!input.completed) {
                    // If marking as incomplete, delete the completion record
                    await ctx.prisma.checklistItemCompletion.delete({
                        where: {
                            id: existingCompletion.id,
                        },
                    });
                    return { success: true, message: 'Checklist item marked as incomplete' };
                }

                // Otherwise, update the completion record
                const updatedCompletion = await ctx.prisma.checklistItemCompletion.update({
                    where: {
                        id: existingCompletion.id,
                    },
                    data: {
                        completed: input.completed,
                        completedAt: new Date(),
                        latitude: input.latitude,
                        longitude: input.longitude,
                        comments: input.comments,
                        uploadId: input.uploadId,
                    },
                });

                return updatedCompletion;
            }

            // If there's no existing completion and we're marking as incomplete, do nothing
            if (!input.completed) {
                return { success: true, message: 'Checklist item is already incomplete' };
            }

            // Create a new completion record
            const newCompletion = await ctx.prisma.checklistItemCompletion.create({
                data: {
                    checklistItemId: input.itemId,
                    shiftId: input.shiftId,
                    memberId: member.id,
                    completed: input.completed,
                    completedAt: new Date(),
                    latitude: input.latitude,
                    longitude: input.longitude,
                    comments: input.comments,
                    uploadId: input.uploadId,
                },
            });

            return newCompletion;
        }),

    // Get checklist completions for a shift
    getShiftCompletions: memberProcedure
        .input(z.object({ shiftId: z.string() }))
        .query(async ({ ctx, input }) => {
            // Find the shift to ensure it belongs to the current organization
            const shift = await ctx.prisma.shift.findFirst({
                where: {
                    id: input.shiftId,
                    organizationId: ctx.user.organizationId,
                },
                include: {
                    Checklist: {
                        include: {
                            items: {
                                orderBy: {
                                    order: 'asc',
                                },
                                include: {
                                    completions: {
                                        where: {
                                            shiftId: input.shiftId,
                                        },
                                        include: {
                                            member: {
                                                select: {
                                                    id: true,
                                                    name: true,
                                                    image: true,
                                                },
                                            },
                                            upload: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });

            if (!shift) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Shift not found',
                });
            }

            if (!shift.Checklist) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'No checklist attached to this shift',
                });
            }

            return shift.Checklist;
        }),

    // Get upcoming shifts with incomplete checklists for the current member
    getUpcomingShiftsWithChecklists: memberProcedure.query(async ({ ctx }) => {
        // Find the member record for the current user
        const member = await ctx.prisma.member.findFirst({
            where: {
                organizationId: ctx.user.organizationId,
                userId: ctx.user.id,
            },
        });

        if (!member) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Member not found',
            });
        }

        // Get upcoming shifts assigned to the member that have checklists
        const now = new Date();
        const shifts = await ctx.prisma.shift.findMany({
            where: {
                organizationId: ctx.user.organizationId,
                startTime: {
                    gte: now,
                },
                isCancelled: false,
                checklistId: {
                    not: null,
                },
                shiftAssignments: {
                    some: {
                        memberId: member.id,
                        outcome: 'assigned',
                    },
                },
            },
            include: {
                Checklist: {
                    include: {
                        items: {
                            orderBy: {
                                order: 'asc',
                            },
                            include: {
                                completions: {
                                    where: {
                                        memberId: member.id,
                                    },
                                },
                            },
                        },
                    },
                },
                location: true,
            },
            orderBy: {
                startTime: 'asc',
            },
        });

        // Filter to only include shifts with incomplete checklist items
        const shiftsWithIncompleteChecklists = shifts.filter(shift => {
            if (!shift.Checklist) return false;

            // Count total items and completed items
            const totalItems = shift.Checklist.items.length;
            const completedItems = shift.Checklist.items.filter(
                item => item.completions.some(completion => completion.completed)
            ).length;

            // Include the shift if there are incomplete items
            return completedItems < totalItems;
        });

        return shiftsWithIncompleteChecklists;
    }),
});
