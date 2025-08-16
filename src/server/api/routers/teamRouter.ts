import {
    router,
    adminProcedure,
    memberProcedure,
    userProcedure,
} from '@/server/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { v4 as uuidv4 } from 'uuid';

// Schema for business profile
const businessProfileSchema = z.object({
    name: z.string(),
    weekStart: z.string(),
    timezone: z.string(),
});

// Schema for business notification settings
const businessNotificationSettingsSchema = z.object({
    digestEmailDate: z.string(),
});

// Schema for business shift settings
const businessShiftSettingsSchema = z.object({
    uploadNames: z.array(z.string()).max(5),
});

// Schema for user notification settings
const userNotificationSettingsSchema = z.object({
    notifyMeBeforeShift: z.boolean(),
    notifyMeBeforeShiftDays: z.string().optional(),
    weeklyDigest: z.boolean().optional(),
    unfilledDigest: z.boolean().optional(),
});

// Schema for user profile
const userProfileSchema = z.object({
    displayName: z.string(),
    email: z.string().email(),
    phoneNumber: z.string(),
});

export const teamRouter = router({
    // Get business profile
    getBusinessProfile: adminProcedure.query(async ({ ctx }) => {
        // Get the organization with its profile
        const organization = await ctx.prisma.organization.findUnique({
            where: { id: ctx.user.organizationId },
            include: { profile: true },
        });

        if (!organization) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Organization not found',
            });
        }

        // If profile exists, return it, otherwise return default values
        if (organization.profile) {
            return {
                name: organization.name,
                weekStart: organization.profile.weekStart,
                timezone: organization.profile.timezone,
            };
        }

        // Fallback to metadata for backward compatibility
        if (organization.metadata) {
            try {
                const metadata = JSON.parse(organization.metadata);
                if (metadata.businessProfile) {
                    return {
                        name: organization.name,
                        ...metadata.businessProfile,
                    };
                }
            } catch (e) {
                // If JSON parsing fails, continue to default values
            }
        }

        // Return default values
        return {
            name: organization.name,
            weekStart: 'saturday',
            timezone: 'America/New_York',
        };
    }),

    // Update business profile
    updateBusinessProfile: adminProcedure
        .input(businessProfileSchema)
        .mutation(async ({ ctx, input }) => {
            // Get the organization
            const organization = await ctx.prisma.organization.findUnique({
                where: { id: ctx.user.organizationId },
                include: { profile: true },
            });

            if (!organization) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Organization not found',
                });
            }

            // If profile exists, update it, otherwise create it
            if (organization.profile) {
                await ctx.prisma.organizationProfile.update({
                    where: { id: ctx.user.organizationId },
                    data: {
                        weekStart: input.weekStart,
                        timezone: input.timezone,
                    },
                });
            } else {
                await ctx.prisma.organizationProfile.create({
                    data: {
                        id: ctx.user.organizationId,
                        weekStart: input.weekStart,
                        timezone: input.timezone,
                    },
                });
            }

            // Update organization name
            await ctx.prisma.organization.update({
                where: { id: ctx.user.organizationId },
                data: { name: input.name },
            });

            return {
                success: true,
                businessProfile: input,
            };
        }),

    // Get business notification settings
    getBusinessNotificationSettings: adminProcedure.query(async ({ ctx }) => {
        // Get the organization with its profile
        const organization = await ctx.prisma.organization.findUnique({
            where: { id: ctx.user.organizationId },
            include: { profile: true },
        });

        if (!organization) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Organization not found',
            });
        }

        // If profile exists, return notification settings from it
        if (organization.profile) {
            return {
                digestEmailDate:
                    organization.profile.digestEmailDate || 'saturday',
            };
        }

        // Fallback to metadata for backward compatibility
        if (organization.metadata) {
            try {
                const metadata = JSON.parse(organization.metadata);
                if (metadata.notificationSettings) {
                    return metadata.notificationSettings;
                }
            } catch (e) {
                // If JSON parsing fails, continue to default values
            }
        }

        // Return default values
        return {
            digestEmailDate: 'saturday',
        };
    }),

    // Update business notification settings
    updateBusinessNotificationSettings: adminProcedure
        .input(businessNotificationSettingsSchema)
        .mutation(async ({ ctx, input }) => {
            // Get the organization with its profile
            const organization = await ctx.prisma.organization.findUnique({
                where: { id: ctx.user.organizationId },
                include: { profile: true },
            });

            if (!organization) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Organization not found',
                });
            }

            // If profile exists, update it, otherwise create it
            if (organization.profile) {
                await ctx.prisma.organizationProfile.update({
                    where: { id: ctx.user.organizationId },
                    data: {
                        digestEmailDate: input.digestEmailDate,
                    },
                });
            } else {
                await ctx.prisma.organizationProfile.create({
                    data: {
                        id: ctx.user.organizationId,
                        digestEmailDate: input.digestEmailDate,
                        // Set default values for other required fields
                        weekStart: 'saturday',
                        timezone: 'America/New_York',
                    },
                });
            }

            return {
                success: true,
                notificationSettings: input,
            };
        }),

    // Get business shift settings
    getBusinessShiftSettings: adminProcedure.query(async ({ ctx }) => {
        // Get the organization with its profile
        const organization = await ctx.prisma.organization.findUnique({
            where: { id: ctx.user.organizationId },
            include: { profile: true },
        });

        if (!organization) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Organization not found',
            });
        }

        // If profile exists, return shift settings from it
        if (organization.profile) {
            let uploadNames = [];

            // Parse uploadNames from JSON string if it exists
            if (organization.profile.uploadNames) {
                try {
                    uploadNames = JSON.parse(organization.profile.uploadNames);
                } catch (e) {
                    // If JSON parsing fails, use empty array
                    uploadNames = [];
                }
            }

            return {
                uploadNames,
            };
        }

        // Fallback to metadata for backward compatibility
        if (organization.metadata) {
            try {
                const metadata = JSON.parse(organization.metadata);
                if (metadata.shiftSettings) {
                    return metadata.shiftSettings;
                }
            } catch (e) {
                // If JSON parsing fails, continue to default values
            }
        }

        // Return default values
        return {
            uploadNames: [],
        };
    }),

    // Update business shift settings
    updateBusinessShiftSettings: adminProcedure
        .input(businessShiftSettingsSchema)
        .mutation(async ({ ctx, input }) => {
            // Get the organization with its profile
            const organization = await ctx.prisma.organization.findUnique({
                where: { id: ctx.user.organizationId },
                include: { profile: true },
            });

            if (!organization) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Organization not found',
                });
            }

            // Convert uploadNames array to JSON string
            const uploadNamesJson = JSON.stringify(input.uploadNames);

            // If profile exists, update it, otherwise create it
            if (organization.profile) {
                await ctx.prisma.organizationProfile.update({
                    where: { id: ctx.user.organizationId },
                    data: {
                        uploadNames: uploadNamesJson,
                    },
                });
            } else {
                await ctx.prisma.organizationProfile.create({
                    data: {
                        id: ctx.user.organizationId,
                        uploadNames: uploadNamesJson,
                        // Set default values for other required fields
                        weekStart: 'saturday',
                        timezone: 'America/New_York',
                    },
                });
            }

            return {
                success: true,
                shiftSettings: input,
            };
        }),

    // Get user profile
    getUserProfile: memberProcedure.query(async ({ ctx }) => {
        // Get the member
        const member = await ctx.prisma.member.findFirst({
            where: {
                userId: ctx.user.id,
                organizationId: ctx.user.organizationId,
            },
            include: {
                user: true,
                settings: true,
            },
        });

        if (!member) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Member not found',
            });
        }


        return {
            displayName: member.name || member.user.name,
            email: member.user.email,
            phoneNumber: member.phoneNumber || '',
        };
    }),

    // Update user profile
    updateUserProfile: memberProcedure
        .input(userProfileSchema)
        .mutation(async ({ ctx, input }) => {
            // Get the member
            const member = await ctx.prisma.member.findFirst({
                where: {
                    userId: ctx.user.id,
                    organizationId: ctx.user.organizationId,
                },
                include: {
                    user: true,
                },
            });

            if (!member) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Member not found',
                });
            }

            // Update member
            const updatedMember = await ctx.prisma.member.update({
                where: { id: member.id },
                data: {
                    name: input.displayName,
                    phoneNumber: input.phoneNumber,
                },
            });


            // Return the updated profile with the original email (which cannot be changed)
            return {
                success: true,
                profile: {
                    displayName: input.displayName,
                    email: member.user.email, // Use the original email from the user record
                    phoneNumber: input.phoneNumber,
                },
            };
        }),

    // Get user notification settings
    getUserNotificationSettings: memberProcedure.query(async ({ ctx }) => {
        // Get the member with its settings
        const member = await ctx.prisma.member.findFirst({
            where: {
                userId: ctx.user.id,
                organizationId: ctx.user.organizationId,
            },
            include: { settings: true },
        });

        if (!member) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Member not found',
            });
        }

        // If settings exist, return them
        if (member.settings) {
            return {
                notifyMeBeforeShift: member.settings.notifyMeBeforeShift,
                notifyMeBeforeShiftDays:
                    member.settings.notifyMeBeforeShiftDays || '',
                weeklyDigest: member.settings.weeklyDigest,
                unfilledDigest: member.settings.unfilledDigest,
            };
        }

        // Fallback to metadata for backward compatibility
        if (member.metadata) {
            try {
                const metadata = JSON.parse(member.metadata);
                if (metadata.notificationSettings) {
                    return metadata.notificationSettings;
                }
            } catch (e) {
                // If JSON parsing fails, continue to default values
            }
        }

        // Return default values
        return {
            notifyMeBeforeShift: false,
            notifyMeBeforeShiftDays: '',
            weeklyDigest: false,
            unfilledDigest: false,
        };
    }),

    // Update user notification settings
    updateUserNotificationSettings: memberProcedure
        .input(userNotificationSettingsSchema)
        .mutation(async ({ ctx, input }) => {
            // Get the member with its settings
            const member = await ctx.prisma.member.findFirst({
                where: {
                    userId: ctx.user.id,
                    organizationId: ctx.user.organizationId,
                },
                include: { settings: true },
            });

            if (!member) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Member not found',
                });
            }

            // If settings exist, update them, otherwise create them
            if (member.settings) {
                await ctx.prisma.memberSettings.update({
                    where: { id: member.id },
                    data: {
                        notifyMeBeforeShift: input.notifyMeBeforeShift,
                        notifyMeBeforeShiftDays: input.notifyMeBeforeShiftDays,
                        weeklyDigest: input.weeklyDigest || false,
                        unfilledDigest: input.unfilledDigest || false,
                    },
                });
            } else {
                await ctx.prisma.memberSettings.create({
                    data: {
                        id: member.id,
                        notifyMeBeforeShift: input.notifyMeBeforeShift,
                        notifyMeBeforeShiftDays: input.notifyMeBeforeShiftDays,
                        weeklyDigest: input.weeklyDigest || false,
                        unfilledDigest: input.unfilledDigest || false,
                    },
                });
            }

            return {
                success: true,
                notificationSettings: input,
            };
        }),

    // Get user iCal link
    getUserIcalLink: memberProcedure.query(async ({ ctx }) => {
        // Get the member
        const member = await ctx.prisma.member.findFirst({
            where: {
                userId: ctx.user.id,
                organizationId: ctx.user.organizationId,
            },
        });

        if (!member) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Member not found',
            });
        }

        // If no iCal slug exists, create one
        if (!member.icalSlug) {
            const icalSlug = uuidv4().replace(/-/g, '');

            // Update member with new iCal slug
            await ctx.prisma.member.update({
                where: { id: member.id },
                data: { icalSlug },
            });

            return {
                icalSlug,
                icalLink: `${process.env.NEXT_PUBLIC_BASE_URL}/api/t/${ctx.user.organizationId}/u/${icalSlug}/ical`,
            };
        }

        return {
            icalSlug: member.icalSlug,
            icalLink: `${process.env.NEXT_PUBLIC_BASE_URL}/api/t/${ctx.user.organizationId}/u/${member.icalSlug}/ical`,
        };
    }),

    // Regenerate user iCal link
    regenerateUserIcalLink: memberProcedure.mutation(async ({ ctx }) => {
        // Get the member
        const member = await ctx.prisma.member.findFirst({
            where: {
                userId: ctx.user.id,
                organizationId: ctx.user.organizationId,
            },
        });

        if (!member) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Member not found',
            });
        }

        // Generate new iCal slug
        const icalSlug = uuidv4().replace(/-/g, '');

        // Update member with new iCal slug
        await ctx.prisma.member.update({
            where: { id: member.id },
            data: { icalSlug },
        });

        return {
            success: true,
            icalSlug,
            icalLink: `${process.env.NEXT_PUBLIC_APP_URL}/api/t/${ctx.user.organizationId}/u/${icalSlug}/ical/html`,
        };
    }),
});
