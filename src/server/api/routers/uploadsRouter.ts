import { z } from 'zod';
import { router, adminProcedure, memberProcedure } from '@/server/trpc';
import { TRPCError } from '@trpc/server';
import {
    deleteFile,
    generateFileKey,
    getFileUrl,
    uploadFile,
} from '@/utils/s3';

// Helper function to check if a user is authorized to access a shift's uploads
// Users can access uploads if they are an admin or if they are assigned to the shift
async function isAuthorizedForShiftUploads(
    ctx: any,
    shiftId: string
): Promise<boolean> {
    // Check if user is admin
    const isAdmin = ctx.user.role === 'admin' || ctx.user.role === 'owner';
    if (isAdmin) return true;

    // If not admin, check if user is assigned to the shift
    if (!ctx.user.memberId) return false;

    const assignment = await ctx.prisma.shiftAssignment.findFirst({
        where: {
            shiftId,
            memberId: ctx.user.memberId,
            outcome: 'assigned',
        },
    });

    return !!assignment;
}

export const uploadsRouter = router({
    // Initialize upload groups based on organization_profile.uploadNames
    initializeUploadGroups: adminProcedure.mutation(async ({ ctx }) => {
        try {
            // Get the organization profile
            const profile = await ctx.prisma.organizationProfile.findUnique({
                where: { id: ctx.user.organizationId },
            });

            if (!profile || !profile.uploadNames) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'No upload names defined in organization profile',
                });
            }

            // Parse the uploadNames JSON array
            let uploadNames: string[] = [];
            try {
                uploadNames = JSON.parse(profile.uploadNames);
            } catch (error) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message:
                        'Invalid upload names format in organization profile',
                });
            }

            // Get existing upload groups
            const existingGroups = await ctx.prisma.uploadGroup.findMany({
                where: { organizationId: ctx.user.organizationId },
            });

            // Create a map of existing upload names
            const existingUploadNames = new Map(
                existingGroups.map((group) => [group.uploadName, group])
            );

            // Create new upload groups for names that don't exist
            const newGroups = [];
            for (const name of uploadNames) {
                if (!existingUploadNames.has(name)) {
                    newGroups.push({
                        organizationId: ctx.user.organizationId,
                        uploadName: name,
                    });
                }
            }

            // Deactivate groups for names that no longer exist
            const groupsToDeactivate = existingGroups.filter(
                (group) =>
                    !uploadNames.includes(group.uploadName) && group.isActive
            );

            // Create new groups
            if (newGroups.length > 0) {
                await ctx.prisma.uploadGroup.createMany({
                    data: newGroups,
                });
            }

            // Deactivate groups
            for (const group of groupsToDeactivate) {
                await ctx.prisma.uploadGroup.update({
                    where: { id: group.id },
                    data: { isActive: false },
                });
            }

            return {
                success: true,
                created: newGroups.length,
                deactivated: groupsToDeactivate.length,
            };
        } catch (error: any) {
            if (error instanceof TRPCError) throw error;
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to initialize upload groups: ${error.message}`,
            });
        }
    }),

    // Get upload groups for the current organization
    getUploadGroups: memberProcedure.query(async ({ ctx }) => {
        try {
            const groups = await ctx.prisma.uploadGroup.findMany({
                where: {
                    organizationId: ctx.user.organizationId,
                    OR: [
                        { isActive: true },
                        {
                            isActive: false,
                            uploads: {
                                some: {
                                    isDeleted: false, // Ensure only non-deleted uploads are considered
                                },
                            },
                        },
                    ],
                },
                include: {
                    uploads: {
                        where: { isDeleted: false }, // Include a count of active uploads
                    },
                },
            });

            return groups;
        } catch (error: any) {
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to get upload groups: ${error.message}`,
            });
        }
    }),

    // Get uploads for a specific shift
    getShiftUploads: memberProcedure
        .input(z.object({ shiftId: z.string() }))
        .query(async ({ ctx, input }) => {
            try {
                // Check if user is authorized to access this shift's uploads
                const isAuthorized = await isAuthorizedForShiftUploads(
                    ctx,
                    input.shiftId
                );
                if (!isAuthorized) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You do not have permission to access uploads for this shift',
                    });
                }

                // Get the shift to verify it belongs to the user's organization
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

                // Get all active upload groups
                const uploadGroups = await ctx.prisma.uploadGroup.findMany({
                    where: {
                        organizationId: ctx.user.organizationId,
                        isActive: true,
                    },
                });

                // Get all uploads for this shift
                const uploads = await ctx.prisma.upload.findMany({
                    where: {
                        shiftId: input.shiftId,
                        isDeleted: false,
                    },
                    include: {
                        uploadGroup: true,
                        uploader: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                });

                // Create a map of upload group ID to uploads
                const uploadsByGroup = new Map();
                for (const group of uploadGroups) {
                    uploadsByGroup.set(group.id, {
                        group,
                        upload:
                            uploads.find((u) => u.uploadGroupId === group.id) ||
                            null,
                    });
                }

                return Array.from(uploadsByGroup.values());
            } catch (error: any) {
                if (error instanceof TRPCError) throw error;
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Failed to get shift uploads: ${error.message}`,
                });
            }
        }),

    // Upload a file
    uploadFile: memberProcedure
        .input(
            z.object({
                shiftId: z.string(),
                uploadGroupId: z.string(),
                fileName: z.string(),
                fileSize: z.number(),
                fileType: z.string(),
                fileData: z.string(), // Base64 encoded file data
            })
        )
        .mutation(async ({ ctx, input }) => {
            try {
                // Check if user is authorized to upload to this shift
                const isAuthorized = await isAuthorizedForShiftUploads(
                    ctx,
                    input.shiftId
                );
                if (!isAuthorized) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You do not have permission to upload files to this shift',
                    });
                }

                // Get the shift to verify it belongs to the user's organization
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

                // Get the upload group to verify it belongs to the user's organization
                const uploadGroup = await ctx.prisma.uploadGroup.findFirst({
                    where: {
                        id: input.uploadGroupId,
                        organizationId: ctx.user.organizationId,
                        isActive: true,
                    },
                });

                if (!uploadGroup) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Upload group not found',
                    });
                }

                // Check if there's already an upload for this shift and upload group
                const existingUpload = await ctx.prisma.upload.findFirst({
                    where: {
                        shiftId: input.shiftId,
                        uploadGroupId: input.uploadGroupId,
                        isDeleted: false,
                    },
                });

                if (existingUpload) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message:
                            'An upload already exists for this shift and upload group',
                    });
                }

                // Generate a unique file key
                const fileKey = generateFileKey(
                    ctx.user.organizationId,
                    input.shiftId,
                    input.uploadGroupId,
                    input.fileName
                );

                // Decode the base64 file data
                const fileBuffer = Buffer.from(
                    input.fileData.split(',')[1],
                    'base64'
                );

                // Upload the file to S3
                await uploadFile(fileKey, fileBuffer, input.fileType);

                // Create a record in the database
                const upload = await ctx.prisma.upload.create({
                    data: {
                        uploadGroupId: input.uploadGroupId,
                        shiftId: input.shiftId,
                        fileName: input.fileName,
                        fileKey,
                        fileSize: input.fileSize,
                        fileType: input.fileType,
                        uploaderId: ctx.user.memberId,
                    },
                });

                return {
                    success: true,
                    upload,
                };
            } catch (error: any) {
                if (error instanceof TRPCError) throw error;
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Failed to upload file: ${error.message}`,
                });
            }
        }),

    // Get a signed URL for downloading a file
    getFileUrl: memberProcedure
        .input(z.object({ uploadId: z.string() }))
        .query(async ({ ctx, input }) => {
            try {
                // Get the upload
                const upload = await ctx.prisma.upload.findUnique({
                    where: { id: input.uploadId },
                    include: {
                        shift: true,
                    },
                });

                if (!upload) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Upload not found',
                    });
                }

                // Check if user is authorized to access this upload
                const isAuthorized = await isAuthorizedForShiftUploads(
                    ctx,
                    upload.shiftId
                );
                if (!isAuthorized) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You do not have permission to access this upload',
                    });
                }

                // Check if the upload belongs to the user's organization
                if (upload.shift.organizationId !== ctx.user.organizationId) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You do not have permission to access this upload',
                    });
                }

                // Get a signed URL for the file
                const url = await getFileUrl(upload.fileKey);

                return {
                    url,
                    fileName: upload.fileName,
                    fileType: upload.fileType,
                };
            } catch (error: any) {
                if (error instanceof TRPCError) throw error;
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Failed to get file URL: ${error.message}`,
                });
            }
        }),

    // Delete a file (mark as deleted)
    deleteFile: memberProcedure
        .input(z.object({ uploadId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            try {
                // Get the upload
                const upload = await ctx.prisma.upload.findUnique({
                    where: { id: input.uploadId },
                    include: {
                        shift: true,
                    },
                });

                if (!upload) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Upload not found',
                    });
                }

                // Check if user is authorized to delete this upload
                const isAuthorized = await isAuthorizedForShiftUploads(
                    ctx,
                    upload.shiftId
                );
                if (!isAuthorized) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You do not have permission to delete this upload',
                    });
                }

                // Check if the upload belongs to the user's organization
                if (upload.shift.organizationId !== ctx.user.organizationId) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You do not have permission to delete this upload',
                    });
                }

                // Mark the upload as deleted
                const updatedUpload = await ctx.prisma.upload.update({
                    where: { id: input.uploadId },
                    data: {
                        isDeleted: true,
                        deletedAt: new Date(),
                        deleterId: ctx.user.memberId,
                    },
                });

                return {
                    success: true,
                    upload: updatedUpload,
                };
            } catch (error: any) {
                if (error instanceof TRPCError) throw error;
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Failed to delete file: ${error.message}`,
                });
            }
        }),

    // Permanently delete a file (admin only)
    permanentlyDeleteFile: adminProcedure
        .input(z.object({ uploadId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            try {
                // Get the upload
                const upload = await ctx.prisma.upload.findUnique({
                    where: { id: input.uploadId },
                    include: {
                        shift: true,
                    },
                });

                if (!upload) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Upload not found',
                    });
                }

                // Check if the upload belongs to the user's organization
                if (upload.shift.organizationId !== ctx.user.organizationId) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message:
                            'You do not have permission to delete this upload',
                    });
                }

                // Delete the file from S3
                await deleteFile(upload.fileKey);

                // Delete the upload from the database
                await ctx.prisma.upload.delete({
                    where: { id: input.uploadId },
                });

                return {
                    success: true,
                };
            } catch (error: any) {
                if (error instanceof TRPCError) throw error;
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Failed to permanently delete file: ${error.message}`,
                });
            }
        }),

    // Get all uploads for the organization (admin only)
    getAllUploads: adminProcedure
        .input(
            z.object({
                includeDeleted: z.boolean().default(false),
                showOnlyInactive: z.boolean().default(false),
                shiftId: z.string().optional(),
                uploadGroupId: z.string().optional(),
                uploaderId: z.string().optional(),
            })
        )
        .query(async ({ ctx, input }) => {
            try {
                // Build the where clause
                const where: any = {
                    shift: {
                        organizationId: ctx.user.organizationId,
                    },
                };

                // Add optional filters
                if (!input.includeDeleted) {
                    where.isDeleted = false;
                }
                if (input.shiftId) {
                    where.shiftId = input.shiftId;
                }
                if (input.uploadGroupId) {
                    where.uploadGroupId = input.uploadGroupId;
                }
                if (input.uploaderId) {
                    where.uploaderId = input.uploaderId;
                }
                if (input.showOnlyInactive) {
                    where.uploadGroup = {
                        ...where.uploadGroup,
                        isActive: false,
                    };
                }

                // Get all uploads
                const uploads = await ctx.prisma.upload.findMany({
                    where,
                    include: {
                        shift: {
                            select: {
                                id: true,
                                title: true,
                                startTime: true,
                                endTime: true,
                            },
                        },
                        uploadGroup: true,
                        uploader: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        deleter: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                    orderBy: {
                        uploadedAt: 'desc',
                    },
                });

                return uploads;
            } catch (error: any) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Failed to get uploads: ${error.message}`,
                });
            }
        }),
});
