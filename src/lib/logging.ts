import { PrismaClient } from '@/generated/prisma';

// Define the action types for logging
export enum LogActionType {
    LOGIN = 'LOGIN',
    SHIFT_CREATE = 'SHIFT_CREATE',
    SHIFT_UPDATE = 'SHIFT_UPDATE',
    SHIFT_CANCEL = 'SHIFT_CANCEL',
    SHIFT_DELETE = 'SHIFT_DELETE',
    SHIFT_ASSIGNMENT_CREATE = 'SHIFT_ASSIGNMENT_CREATE',
    SHIFT_ASSIGNMENT_UPDATE = 'SHIFT_ASSIGNMENT_UPDATE',
    SHIFT_ASSIGNMENT_DELETE = 'SHIFT_ASSIGNMENT_DELETE',
    TEAM_INVITE_SEND = 'TEAM_INVITE_SEND',
    TEAM_INVITE_ACCEPT = 'TEAM_INVITE_ACCEPT',
    SHIFT_REQUEST_CREATE = 'SHIFT_REQUEST_CREATE',
    SHIFT_REQUEST_UPDATE = 'SHIFT_REQUEST_UPDATE',
    USER_STATUS_CHANGE = 'USER_STATUS_CHANGE',
}

// Define the entity types for logging
export enum LogEntityType {
    SHIFT = 'SHIFT',
    USER = 'USER',
    MEMBER = 'MEMBER',
    INVITATION = 'INVITATION',
    SHIFT_ASSIGNMENT = 'SHIFT_ASSIGNMENT',
    SHIFT_REQUEST = 'SHIFT_REQUEST',
}

// Interface for log creation
export interface CreateLogParams {
    prisma: PrismaClient;
    organizationId: string;
    userId: string;
    actionType: LogActionType;
    entityId?: string;
    entityType?: LogEntityType;
    description: string;
    metadata?: Record<string, any>;
}

/**
 * Creates a log entry in the database
 * @param params Parameters for creating a log entry
 * @returns The created log entry
 */
export async function createLog(params: CreateLogParams) {
    const {
        prisma,
        organizationId,
        userId,
        actionType,
        entityId,
        entityType,
        description,
        metadata,
    } = params;

    try {
        const log = await prisma.logEntry.create({
            data: {
                organizationId,
                userId,
                actionType,
                entityId,
                entityType,
                description,
                metadata,
            },
        });

        return log;
    } catch (error) {
        // Log the error but don't throw it to prevent impacting core functionality
        console.error('Failed to create log entry:', error);
        return null;
    }
}

/**
 * Helper function to create a log entry for login events
 */
export async function logLogin(
    prisma: PrismaClient,
    organizationId: string,
    userId: string,
    metadata?: Record<string, any>
) {
    return createLog({
        prisma,
        organizationId,
        userId,
        actionType: LogActionType.LOGIN,
        entityId: userId,
        entityType: LogEntityType.USER,
        description: 'User logged in',
        metadata,
    });
}

/**
 * Helper function to create a log entry for shift creation
 */
export async function logShiftCreate(
    prisma: PrismaClient,
    organizationId: string,
    userId: string,
    shiftId: string,
    shiftTitle: string,
    metadata?: Record<string, any>
) {
    return createLog({
        prisma,
        organizationId,
        userId,
        actionType: LogActionType.SHIFT_CREATE,
        entityId: shiftId,
        entityType: LogEntityType.SHIFT,
        description: `Created shift: ${shiftTitle}`,
        metadata,
    });
}

/**
 * Helper function to create a log entry for shift updates
 */
export async function logShiftUpdate(
    prisma: PrismaClient,
    organizationId: string,
    userId: string,
    shiftId: string,
    shiftTitle: string,
    beforeState: Record<string, any>,
    afterState: Record<string, any>
) {
    return createLog({
        prisma,
        organizationId,
        userId,
        actionType: LogActionType.SHIFT_UPDATE,
        entityId: shiftId,
        entityType: LogEntityType.SHIFT,
        description: `Updated shift: ${shiftTitle}`,
        metadata: {
            before: beforeState,
            after: afterState,
        },
    });
}

export async function logShiftCancellation(
    prisma: PrismaClient,
    organizationId: string,
    userId: string,
    shiftId: string,
    shiftTitle: string,
    beforeState: Record<string, any>,
    afterState: Record<string, any>
) {
    return createLog({
        prisma,
        organizationId,
        userId,
        actionType: LogActionType.SHIFT_CANCEL,
        entityId: shiftId,
        entityType: LogEntityType.SHIFT,
        description: `Updated shift cancellation status: ${shiftTitle}`,
        metadata: {
            before: beforeState,
            after: afterState,
        },
    });
}

/**
 * Helper function to create a log entry for shift deletion
 */
export async function logShiftDelete(
    prisma: PrismaClient,
    organizationId: string,
    userId: string,
    shiftId: string,
    shiftTitle: string,
    metadata?: Record<string, any>
) {
    return createLog({
        prisma,
        organizationId,
        userId,
        actionType: LogActionType.SHIFT_DELETE,
        entityId: shiftId,
        entityType: LogEntityType.SHIFT,
        description: `Deleted shift: ${shiftTitle}`,
        metadata,
    });
}

/**
 * Helper function to create a log entry for shift assignment creation
 */
export async function logShiftAssignmentCreate(
    prisma: PrismaClient,
    organizationId: string,
    userId: string,
    assignmentId: string,
    shiftId: string,
    memberId: string,
    shiftTitle: string,
    memberName: string,
    metadata?: Record<string, any>
) {
    return createLog({
        prisma,
        organizationId,
        userId,
        actionType: LogActionType.SHIFT_ASSIGNMENT_CREATE,
        entityId: assignmentId,
        entityType: LogEntityType.SHIFT_ASSIGNMENT,
        description: `Assigned ${memberName} to shift: ${shiftTitle}`,
        metadata: {
            ...metadata,
            shiftId,
            memberId,
        },
    });
}

/**
 * Helper function to create a log entry for team invitation
 */
export async function logTeamInviteSend(
    prisma: PrismaClient,
    organizationId: string,
    userId: string,
    invitationId: string,
    email: string,
    role: string,
    metadata?: Record<string, any>
) {
    return createLog({
        prisma,
        organizationId,
        userId,
        actionType: LogActionType.TEAM_INVITE_SEND,
        entityId: invitationId,
        entityType: LogEntityType.INVITATION,
        description: `Sent invitation to ${email} with role ${role}`,
        metadata,
    });
}

/**
 * Helper function to create a log entry for team invitation acceptance
 */
export async function logTeamInviteAccept(
    prisma: PrismaClient,
    organizationId: string,
    userId: string,
    invitationId: string,
    email: string,
    role: string,
    metadata?: Record<string, any>
) {
    return createLog({
        prisma,
        organizationId,
        userId,
        actionType: LogActionType.TEAM_INVITE_ACCEPT,
        entityId: invitationId,
        entityType: LogEntityType.INVITATION,
        description: `Accepted invitation for ${email} with role ${role}`,
        metadata,
    });
}

/**
 * Helper function to create a log entry for shift request creation
 */
export async function logShiftRequestCreate(
    prisma: PrismaClient,
    organizationId: string,
    userId: string,
    requestId: string,
    shiftId: string,
    memberId: string,
    shiftTitle: string,
    memberName: string,
    metadata?: Record<string, any>
) {
    return createLog({
        prisma,
        organizationId,
        userId,
        actionType: LogActionType.SHIFT_REQUEST_CREATE,
        entityId: requestId,
        entityType: LogEntityType.SHIFT_REQUEST,
        description: `${memberName} requested shift: ${shiftTitle}`,
        metadata: {
            ...metadata,
            shiftId,
            memberId,
        },
    });
}

/**
 * Helper function to create a log entry for shift request status update
 */
export async function logShiftRequestUpdate(
    prisma: PrismaClient,
    organizationId: string,
    userId: string,
    requestId: string,
    shiftId: string,
    memberId: string,
    shiftTitle: string,
    memberName: string,
    status: string,
    metadata?: Record<string, any>
) {
    return createLog({
        prisma,
        organizationId,
        userId,
        actionType: LogActionType.SHIFT_REQUEST_UPDATE,
        entityId: requestId,
        entityType: LogEntityType.SHIFT_REQUEST,
        description: `${status === 'approved' ? 'Approved' : 'Rejected'} shift request from ${memberName} for shift: ${shiftTitle}`,
        metadata: {
            ...metadata,
            shiftId,
            memberId,
            status,
        },
    });
}

/**
 * Helper function to create a log entry for user status change
 */
export async function logUserStatusChange(
    prisma: PrismaClient,
    organizationId: string,
    userId: string,
    targetUserId: string,
    targetUserName: string,
    status: string,
    metadata?: Record<string, any>
) {
    return createLog({
        prisma,
        organizationId,
        userId,
        actionType: LogActionType.USER_STATUS_CHANGE,
        entityId: targetUserId,
        entityType: LogEntityType.USER,
        description: `Changed status for ${targetUserName} to ${status}`,
        metadata,
    });
}
