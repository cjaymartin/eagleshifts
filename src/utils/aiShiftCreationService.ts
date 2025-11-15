import { PrismaClient } from '@/generated/prisma';
import { TRPCError } from '@trpc/server';
import { AllEntityMatchingResults } from './entityMatchingService';

/**
 * Interface for the input to the shift creation service
 */
export interface CreateShiftFromAIInput {
    title: string;
    startTime: string | null;
    endTime: string | null;
    date: string;
    locationId?: string;
    departmentId?: string;
    notes?: string;
    slots?: number;
    timezone?: string;
    newLocation?: {
        name: string;
        address?: string;
    };
    newDepartment?: {
        name: string;
    };
    assignees?: string[];
    entityMatches?: AllEntityMatchingResults;
    organizationId: string;
}

/**
 * Creates a shift from AI-parsed data
 * 
 * @param input The input data for creating the shift
 * @param prisma The Prisma client instance
 * @param userId The ID of the user creating the shift
 * @returns The created shift data
 */
export async function createShiftFromAI(
    input: CreateShiftFromAIInput,
    prisma: PrismaClient,
    userId: string
): Promise<any> {
    try {
        // Validate input
        if (!input.title) {
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Shift title is required',
            });
        }

        if (!input.startTime) {
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Start time is required',
            });
        }

        if (!input.endTime) {
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'End time is required',
            });
        }

        // Set default timezone if not provided
        const timezone = input.timezone || 'America/New_York';

        // Use Prisma transaction to ensure data consistency
        return await prisma.$transaction(async (tx) => {
            // Create new location if needed
            let locationId = input.locationId;
            if (input.newLocation && !locationId) {
                const newLocation = await tx.location.create({
                    data: {
                        name: input.newLocation.name,
                        address: input.newLocation.address || 'Created from AI Shift Entry',
                        organizationId: input.organizationId,
                    },
                });
                locationId = newLocation.id;
            }

            // Create new department if needed
            let departmentId = input.departmentId;
            if (input.newDepartment && !departmentId) {
                const newDepartment = await tx.department.create({
                    data: {
                        name: input.newDepartment.name,
                        organizationId: input.organizationId,
                    },
                });
                departmentId = newDepartment.id;
            }

            // Create the shift
            const shift = await tx.shift.create({
                data: {
                    organizationId: input.organizationId,
                    title: input.title,
                    locationId: locationId,
                    departmentId: departmentId,
                    startTime: new Date(input.startTime),
                    endTime: new Date(input.endTime),
                    slots: input.slots || 1,
                    notes: input.notes || '',
                    timezone: timezone,
                },
                include: {
                    location: true,
                    department: true,
                    shiftAssignments: true,
                },
            });

            // Create shift assignments if assignees are provided
            if (input.assignees && input.assignees.length > 0 && input.entityMatches?.members) {
                // Get the matched members
                const memberMatches = input.entityMatches.members;
                
                // Create a list of valid member IDs
                const validMemberIds: string[] = [];
                
                // For each assignee, find the best match if available
                for (let i = 0; i < input.assignees.length; i++) {
                    const match = memberMatches[i]?.bestMatch;
                    if (match) {
                        validMemberIds.push(match.entity.id);
                    }
                }
                
                // Verify that the member IDs exist in the current organization
                const members = await tx.member.findMany({
                    where: {
                        organizationId: input.organizationId,
                        id: {
                            in: validMemberIds,
                        },
                    },
                    select: {
                        id: true,
                    },
                });
                
                // Create a set of valid member IDs
                const confirmedMemberIds = new Set(
                    members.map((member) => member.id)
                );
                
                // Create assignments for valid members
                for (const memberId of validMemberIds) {
                    if (confirmedMemberIds.has(memberId)) {
                        await tx.shiftAssignment.create({
                            data: {
                                shiftId: shift.id,
                                memberId: memberId,
                                outcome: 'assigned',
                                reason: '',
                            },
                        });
                    }
                }
                
                // Refresh the shift with the new assignments
                return await tx.shift.findUnique({
                    where: { id: shift.id },
                    include: {
                        location: true,
                        department: true,
                        shiftAssignments: {
                            include: {
                                member: true,
                            },
                        },
                    },
                });
            }

            return shift;
        });
    } catch (error: any) {
        if (error instanceof TRPCError) {
            throw error;
        }

        throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to create shift: ${error.message}`,
        });
    }
}