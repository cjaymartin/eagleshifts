import { z } from 'zod';
import { router, adminProcedure, memberProcedure } from '@/server/trpc';
import { Prisma } from '@/generated/prisma';
import { TRPCError } from '@trpc/server';

// Schema for location tags (stored as JSON string in the database)
const locationTagsSchema = z.array(z.string()).optional();

export const locationsRouter = router({
    // Get all locations with filtering options
    getLocations: memberProcedure
        .input(
            z.object({
                name: z.string().optional(),
                groupId: z.string().optional(),
                tags: z.array(z.string()).optional(),
                page: z.number().optional().default(1),
                limit: z.number().optional().default(50),
            }).optional()
        )
        .query(async ({ ctx, input }) => {
            // Build filter conditions
            const where: Prisma.LocationWhereInput = {
                organizationId: ctx.user.organizationId,
            };

            if (input) {
                if (input.name) {
                    where.name = {
                        contains: input.name,
                        mode: 'insensitive',
                    };
                }
                if (input.groupId) {
                    where.groupId = input.groupId;
                }
                if (input.tags && input.tags.length > 0) {
                    // For each tag, check if it's included in the JSON array
                    const tagConditions = input.tags.map(tag => ({
                        tags: {
                            contains: tag,
                        },
                    }));
                    where.OR = tagConditions;
                }
            }

            // Calculate pagination
            const skip = input && input.page && input.limit ? (input.page - 1) * input.limit : 0;
            const take = input?.limit || 50;

            // Get filtered locations
            const locations = await ctx.prisma.location.findMany({
                where,
                include: {
                    group: true,
                },
                orderBy: { name: 'asc' },
                skip,
                take,
            });

            // Get total count for pagination
            const totalCount = await ctx.prisma.location.count({ where });

            // Parse tags from JSON string to array
            return {
                locations: locations.map(location => ({
                    ...location,
                    tags: location.tags ? JSON.parse(location.tags) : [],
                })),
                pagination: {
                    page: input?.page || 1,
                    limit: take,
                    totalCount,
                    totalPages: Math.ceil(totalCount / take),
                },
            };
        }),

    // Get a single location by ID
    getLocationById: memberProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const location = await ctx.prisma.location.findFirst({
                where: {
                    id: input.id,
                    organizationId: ctx.user.organizationId,
                },
                include: {
                    group: true,
                },
            });

            if (!location) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Location not found',
                });
            }

            // Parse tags from JSON string to array
            return {
                ...location,
                tags: location.tags ? JSON.parse(location.tags) : [],
            };
        }),

    // Create a new location
    createLocation: adminProcedure
        .input(
            z.object({
                name: z.string(),
                address: z.string(),
                latitude: z.number(),
                longitude: z.number(),
                groupId: z.string().optional(),
                tags: z.array(z.string()).optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Check if a location with the same name already exists in this organization
            const existingLocation = await ctx.prisma.location.findFirst({
                where: {
                    organizationId: ctx.user.organizationId,
                    name: input.name,
                },
            });

            if (existingLocation) {
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: 'A location with this name already exists',
                });
            }

            // If groupId is provided, verify it exists and belongs to the organization
            if (input.groupId) {
                const group = await ctx.prisma.locationGroup.findFirst({
                    where: {
                        id: input.groupId,
                        organizationId: ctx.user.organizationId,
                    },
                });

                if (!group) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Location group not found',
                    });
                }
            }

            // Create the location
            const location = await ctx.prisma.location.create({
                data: {
                    organizationId: ctx.user.organizationId,
                    name: input.name,
                    address: input.address,
                    latitude: input.latitude,
                    longitude: input.longitude,
                    groupId: input.groupId,
                    tags: input.tags ? JSON.stringify(input.tags) : null,
                },
                include: {
                    group: true,
                },
            });

            // Parse tags from JSON string to array for the response
            return {
                ...location,
                tags: location.tags ? JSON.parse(location.tags) : [],
            };
        }),

    // Update an existing location
    updateLocation: adminProcedure
        .input(
            z.object({
                id: z.string(),
                name: z.string(),
                address: z.string(),
                latitude: z.number(),
                longitude: z.number(),
                groupId: z.string().optional(),
                tags: z.array(z.string()).optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Check if the location exists and belongs to the organization
            const existingLocation = await ctx.prisma.location.findFirst({
                where: {
                    id: input.id,
                    organizationId: ctx.user.organizationId,
                },
            });

            if (!existingLocation) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Location not found',
                });
            }

            // Check if another location with the same name exists (excluding this one)
            const duplicateLocation = await ctx.prisma.location.findFirst({
                where: {
                    organizationId: ctx.user.organizationId,
                    name: input.name,
                    id: { not: input.id },
                },
            });

            if (duplicateLocation) {
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: 'Another location with this name already exists',
                });
            }

            // If groupId is provided, verify it exists and belongs to the organization
            if (input.groupId) {
                const group = await ctx.prisma.locationGroup.findFirst({
                    where: {
                        id: input.groupId,
                        organizationId: ctx.user.organizationId,
                    },
                });

                if (!group) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Location group not found',
                    });
                }
            }

            // Update the location
            const location = await ctx.prisma.location.update({
                where: { id: input.id },
                data: {
                    name: input.name,
                    address: input.address,
                    latitude: input.latitude,
                    longitude: input.longitude,
                    groupId: input.groupId,
                    tags: input.tags ? JSON.stringify(input.tags) : null,
                },
                include: {
                    group: true,
                },
            });

            // Parse tags from JSON string to array for the response
            return {
                ...location,
                tags: location.tags ? JSON.parse(location.tags) : [],
            };
        }),

    // Delete a location
    deleteLocation: adminProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            // Check if the location exists and belongs to the organization
            const location = await ctx.prisma.location.findFirst({
                where: {
                    id: input.id,
                    organizationId: ctx.user.organizationId,
                },
                include: {
                    shifts: {
                        select: { id: true },
                        take: 1,
                    },
                },
            });

            if (!location) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Location not found',
                });
            }

            // Check if the location is used in any shifts
            if (location.shifts.length > 0) {
                throw new TRPCError({
                    code: 'PRECONDITION_FAILED',
                    message: 'Cannot delete a location that is used in shifts',
                });
            }

            // Delete the location
            await ctx.prisma.location.delete({
                where: { id: input.id },
            });

            return { success: true, message: 'Location deleted successfully' };
        }),

    // Get all location groups
    getLocationGroups: memberProcedure.query(async ({ ctx }) => {
        const groups = await ctx.prisma.locationGroup.findMany({
            where: {
                organizationId: ctx.user.organizationId,
            },
            orderBy: { name: 'asc' },
        });

        return groups;
    }),

    // Create a new location group
    createLocationGroup: adminProcedure
        .input(
            z.object({
                name: z.string(),
                color: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Check if a group with the same name already exists in this organization
            const existingGroup = await ctx.prisma.locationGroup.findFirst({
                where: {
                    organizationId: ctx.user.organizationId,
                    name: input.name,
                },
            });

            if (existingGroup) {
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: 'A location group with this name already exists',
                });
            }

            // Create the location group
            const group = await ctx.prisma.locationGroup.create({
                data: {
                    organizationId: ctx.user.organizationId,
                    name: input.name,
                    color: input.color,
                },
            });

            return group;
        }),

    // Update an existing location group
    updateLocationGroup: adminProcedure
        .input(
            z.object({
                id: z.string(),
                name: z.string(),
                color: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Check if the group exists and belongs to the organization
            const existingGroup = await ctx.prisma.locationGroup.findFirst({
                where: {
                    id: input.id,
                    organizationId: ctx.user.organizationId,
                },
            });

            if (!existingGroup) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Location group not found',
                });
            }

            // Check if another group with the same name exists (excluding this one)
            const duplicateGroup = await ctx.prisma.locationGroup.findFirst({
                where: {
                    organizationId: ctx.user.organizationId,
                    name: input.name,
                    id: { not: input.id },
                },
            });

            if (duplicateGroup) {
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: 'Another location group with this name already exists',
                });
            }

            // Update the location group
            const group = await ctx.prisma.locationGroup.update({
                where: { id: input.id },
                data: {
                    name: input.name,
                    color: input.color,
                },
            });

            return group;
        }),

    // Delete a location group
    deleteLocationGroup: adminProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            // Check if the group exists and belongs to the organization
            const group = await ctx.prisma.locationGroup.findFirst({
                where: {
                    id: input.id,
                    organizationId: ctx.user.organizationId,
                },
                include: {
                    locations: {
                        select: { id: true },
                        take: 1,
                    },
                },
            });

            if (!group) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Location group not found',
                });
            }

            // Check if the group has any locations
            if (group.locations.length > 0) {
                throw new TRPCError({
                    code: 'PRECONDITION_FAILED',
                    message: 'Cannot delete a location group that has locations',
                });
            }

            // Delete the location group
            await ctx.prisma.locationGroup.delete({
                where: { id: input.id },
            });

            return { success: true, message: 'Location group deleted successfully' };
        }),
});