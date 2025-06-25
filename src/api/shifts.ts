import { Elysia, t } from 'elysia';
import elysiaUserService from '@/api/utils/elysiaUserService';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma';

const apiShiftsRouter = new Elysia({ prefix: '/shifts' })
    .use(elysiaUserService)

    .get(
        '/seed',
        async ({ user }) => {
            // Check if the organization has any shifts
            const existingShiftsCount = await prisma.shift.count({
                where: { organizationId: user!.organizationId },
            });

            if (existingShiftsCount > 0) {
                return new Response(
                    'Shifts already exist for this organization',
                    { status: 400 }
                );
            }

            // Generate a dozen random shifts
            const shifts = Array.from({ length: 12 }).map((_, index) => ({
                organizationId: user!.organizationId,
                title: `Shift ${index + 1}`,
                location: `Location ${index + 1}`,
                date: new Date(
                    new Date().setDate(new Date().getDate() + index)
                ), // Shift dates in the future
                startTime: new Date(new Date().setHours(9, 0, 0, 0)), // 9:00 AM
                endTime: new Date(new Date().setHours(17, 0, 0, 0)), // 5:00 PM
                slots: Math.floor(Math.random() * 10) + 1, // Random number of slots between 1 and 10
                notes: `Notes for shift ${index + 1}`,
                adminNotes: `Admin notes for shift ${index + 1}`,
                timezone: 'America/New_York',
            }));

            // Insert shifts into the database
            const createdShifts = await prisma.shift.createMany({
                data: shifts,
            });

            return {
                success: true,
                message: `${createdShifts.count} shifts have been added for this organization.`,
                shifts,
            };
        },
        { role: 'admin' }
    )
    // List shifts with optional filters
    .get(
        '/',
        async ({ user, query }) => {
            const {
                title,
                location,
                startDate,
                endDate,
                assigned,
                unfilled,
                //limit = '50',
                //offset = '0',
            } = query;

            // Build filter conditions
            const where: Prisma.ShiftWhereInput = {
                organizationId: user!.organizationId,
            };
            if (title) where.title = { contains: title, mode: 'insensitive' };
            if (location)
                where.location = { contains: location, mode: 'insensitive' };
            if (startDate || endDate) {
                where.date = {};
                if (startDate)
                    where.date.gte = new Date(startDate).toISOString();
                if (endDate) where.date.lte = new Date(endDate).toISOString();
            }

            // Handle assigned filter
            if (assigned) {
                where.assignments = {
                    some: { id: assigned },
                };
            }

            // Handle unfilled filter
            if (unfilled === 'unfilled') {
                where.assignments = { none: {} };
            } else if (unfilled === 'filled') {
                where.assignments = { some: {} };
            } else if (unfilled === 'mine') {
                where.assignments = { some: { id: user!.id } };
            }

            // Get total count for pagination
            //const total = await prisma.shift.count({ where });

            // Get filtered shifts
            const shifts = await prisma.shift.findMany({
                where,
                include: {
                    assignments: true,
                    shiftOffers: true,
                    shiftRequests: true,
                },
                //take: parseInt(limit),
                //skip: parseInt(offset),
                orderBy: { date: 'asc' },
            });

            return shifts;
        },
        {
            query: t.Object({
                title: t.Optional(t.String()),
                location: t.Optional(t.String()),
                startDate: t.Optional(t.Date()), // ISO date string
                endDate: t.Optional(t.Date()), // ISO date string
                assigned: t.Optional(t.String()), // Shift ID for assigned shifts
                unfilled: t.Optional(
                    t.Union([
                        t.Literal('unfilled'),
                        t.Literal('filled'),
                        t.Literal('mine'),
                        t.Literal('any'),
                    ])
                ),
                //limit: t.Optional(t.String()),
                //offset: t.Optional(t.String()),
            }),
            role: 'member',
        }
    )

    // Get a single shift by ID
    .get(
        '/:id',
        async ({ user, params }) => {
            const shift = await prisma.shift.findFirst({
                where: {
                    id: params.id,
                    organizationId: user!.organizationId, // Ensure it belongs to the user's organization
                },
                include: {
                    assignments: true,
                    shiftOffers: true,
                    shiftRequests: true,
                },
            });

            if (!shift) {
                return new Response('Shift not found', { status: 404 });
            }

            return shift;
        },
        {
            role: 'member',
            params: t.Object({
                id: t.String(),
            }),
        }
    )

    // Create a new shift
    .post(
        '/',
        async ({ user, body }) => {
            const shift = await prisma.shift.create({
                data: {
                    organizationId: user!.organizationId,
                    title: body.title,
                    location: body.location,
                    date: new Date(body.date),
                    startTime: new Date(body.startTime),
                    endTime: new Date(body.endTime),
                    slots: body.slots,
                    notes: body.notes,
                    adminNotes: body.adminNotes,
                    timezone: body.timezone || 'America/New_York',
                    assignments: body.assignments
                        ? {
                              connect: body.assignments.map((id: string) => ({
                                  id,
                              })),
                          }
                        : undefined,
                },
                include: {
                    assignments: true,
                },
            });

            return shift;
        },
        {
            role: 'admin',
            body: t.Object({
                title: t.String(),
                location: t.Optional(t.String()),
                date: t.String(),
                startTime: t.String(),
                endTime: t.String(),
                slots: t.Number(),
                notes: t.Optional(t.String()),
                adminNotes: t.Optional(t.String()),
                timezone: t.Optional(t.String()),
                assignments: t.Optional(t.Array(t.String())),
            }),
        }
    )

    // Update an existing shift
    .put(
        '/:id',
        async ({ user, params, body }) => {
            try {
                const shift = await prisma.shift.updateMany({
                    where: {
                        id: params.id,
                        organizationId: user!.organizationId, // Ensure it belongs to the user's organization
                    },
                    data: {
                        title: body.title,
                        location: body.location,
                        date: new Date(body.date),
                        startTime: new Date(body.startTime),
                        endTime: new Date(body.endTime),
                        slots: body.slots,
                        notes: body.notes,
                        adminNotes: body.adminNotes,
                        timezone: body.timezone,
                        // assignments: body.assignments
                        //     ? {
                        //           set: body.assignments.map((id: string) => ({
                        //               id,
                        //           })),
                        //       }
                        //     : undefined,
                    },
                });

                if (!shift) {
                    return new Response('Shift not found', { status: 404 });
                }

                return shift;
            } catch (error) {
                return new Response(
                    `Failed to update shift: ${error.message}`,
                    { status: 400 }
                );
            }
        },
        {
            role: 'admin',
            params: t.Object({
                id: t.String(),
            }),
            body: t.Object({
                title: t.String(),
                location: t.Optional(t.String()),
                date: t.String(),
                startTime: t.String(),
                endTime: t.String(),
                slots: t.Number(),
                notes: t.Optional(t.String()),
                adminNotes: t.Optional(t.String()),
                timezone: t.String(),
                assignments: t.Optional(t.Array(t.String())),
            }),
        }
    )

    // Delete a shift
    .delete(
        '/:id',
        async ({ user, params }) => {
            try {
                const shift = await prisma.shift.deleteMany({
                    where: {
                        id: params.id,
                        organizationId: user!.organizationId, // Ensure it belongs to the user's organization
                    },
                });

                if (!shift) {
                    return new Response('Shift not found', { status: 404 });
                }

                return { success: true, message: 'Shift deleted successfully' };
            } catch (error) {
                return new Response(
                    `Failed to delete shift: ${error.message}`,
                    { status: 400 }
                );
            }
        },
        {
            role: 'admin',
            params: t.Object({
                id: t.String(),
            }),
        }
    );

export default apiShiftsRouter;
