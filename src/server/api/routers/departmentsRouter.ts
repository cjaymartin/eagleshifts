import { z } from 'zod';
import { router, adminProcedure, memberProcedure } from '@/server/trpc';
import { Prisma } from '@/generated/prisma';
import { TRPCError } from '@trpc/server';

export const departmentsRouter = router({
    // Get all departments with filtering options
    getDepartments: memberProcedure
        .input(
            z
                .object({
                    search: z.string().optional(),
                    name: z.string().optional(),
                    page: z.number().optional().default(1),
                    limit: z.number().optional().default(50),
                })
                .optional()
        )
        .query(async ({ ctx, input }) => {
            // Build filter conditions
            const where: Prisma.DepartmentWhereInput = {
                organizationId: ctx.user.organizationId,
            };

            if (input) {
                if (input.search) {
                    // Search by name or description
                    where.OR = [
                        {
                            name: {
                                contains: input.search,
                                mode: 'insensitive',
                            },
                        },
                        {
                            description: {
                                contains: input.search,
                                mode: 'insensitive',
                            },
                        },
                    ];
                }
                if (input.name) {
                    // Search by name
                    where.name = {
                        contains: input.name,
                        mode: 'insensitive',
                    };
                }
            }

            // Calculate pagination
            const skip =
                input && input.page && input.limit
                    ? (input.page - 1) * input.limit
                    : 0;
            const take = input?.limit || 50;

            // Get filtered departments
            const departments = await ctx.prisma.department.findMany({
                where,
                orderBy: { name: 'asc' },
                skip,
                take,
            });

            // Get total count for pagination
            const totalCount = await ctx.prisma.department.count({ where });

            return {
                departments,
                pagination: {
                    page: input?.page || 1,
                    limit: take,
                    totalCount,
                    totalPages: Math.ceil(totalCount / take),
                },
            };
        }),

    // Get a single department by ID
    getDepartmentById: memberProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const department = await ctx.prisma.department.findFirst({
                where: {
                    id: input.id,
                    organizationId: ctx.user.organizationId,
                },
            });

            if (!department) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Department not found',
                });
            }

            return department;
        }),

    // Create a new department
    createDepartment: adminProcedure
        .input(
            z.object({
                name: z.string(),
                description: z.string().optional(),
                color: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Check if a department with the same name already exists in this organization
            const existingDepartment = await ctx.prisma.department.findFirst({
                where: {
                    organizationId: ctx.user.organizationId,
                    name: input.name,
                },
            });

            if (existingDepartment) {
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: 'A department with this name already exists',
                });
            }

            // Create the department
            const department = await ctx.prisma.department.create({
                data: {
                    organizationId: ctx.user.organizationId,
                    name: input.name,
                    description: input.description,
                    color: input.color,
                },
            });

            return department;
        }),

    // Update an existing department
    updateDepartment: adminProcedure
        .input(
            z.object({
                id: z.string(),
                name: z.string(),
                description: z.string().optional(),
                color: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Check if the department exists and belongs to the organization
            const existingDepartment = await ctx.prisma.department.findFirst({
                where: {
                    id: input.id,
                    organizationId: ctx.user.organizationId,
                },
            });

            if (!existingDepartment) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Department not found',
                });
            }

            // Check if another department with the same name exists (excluding this one)
            const duplicateDepartment = await ctx.prisma.department.findFirst({
                where: {
                    organizationId: ctx.user.organizationId,
                    name: input.name,
                    id: { not: input.id },
                },
            });

            if (duplicateDepartment) {
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: 'Another department with this name already exists',
                });
            }

            // Update the department
            const department = await ctx.prisma.department.update({
                where: { id: input.id },
                data: {
                    name: input.name,
                    description: input.description,
                    color: input.color,
                },
            });

            return department;
        }),

    // Delete a department
    deleteDepartment: adminProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            // Check if the department exists and belongs to the organization
            const department = await ctx.prisma.department.findFirst({
                where: {
                    id: input.id,
                    organizationId: ctx.user.organizationId,
                },
                include: {
                    locations: {
                        select: { id: true },
                        take: 1,
                    },
                    shifts: {
                        select: { id: true },
                        take: 1,
                    },
                },
            });

            if (!department) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Department not found',
                });
            }

            // Check if the department is used in any locations or shifts
            if (department.locations.length > 0 || department.shifts.length > 0) {
                throw new TRPCError({
                    code: 'PRECONDITION_FAILED',
                    message: 'Cannot delete a department that is in use',
                });
            }

            // Delete the department
            await ctx.prisma.department.delete({
                where: { id: input.id },
            });

            return { success: true, message: 'Department deleted successfully' };
        }),
});