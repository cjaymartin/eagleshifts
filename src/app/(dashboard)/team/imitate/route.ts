import { NextRequest, NextResponse } from 'next/server';
import { auth, signCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { headers } from 'next/headers';

// Schema for validating the request body
const imitateSchema = z.object({
    memberId: z.string().nonempty('Member ID is required'),
    callbackURL: z.string().optional(),
});

export async function POST(request: NextRequest) {
    try {
        // Parse the request body
        const body = await request.json();

        // Validate the request body
        const validationResult = imitateSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                {
                    error: 'Invalid request',
                    details: validationResult.error.format(),
                },
                { status: 400 }
            );
        }

        const { memberId, callbackURL } = validationResult.data;

        // Get the current session
        const session = await auth.api.getSession({
            headers: await headers(),
        });
        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { user, session: originalSession } = session;

        // Check if user is authenticated and has an active organization
        const org = originalSession?.activeOrganizationId as string | undefined;
        const uid = user.id;

        if (!org || !uid) {
            return NextResponse.json(
                { error: 'Access Denied' },
                { status: 403 }
            );
        }

        // Check if the user has admin or owner role
        const currentMember = await prisma.member.findFirst({
            where: { organizationId: org, userId: uid },
        });

        if (
            !currentMember ||
            !['admin', 'owner'].includes(currentMember.role)
        ) {
            return NextResponse.json(
                { error: 'Access Denied' },
                { status: 403 }
            );
        }

        // Find the target user
        const targetMember = await prisma.member.findFirst({
            where: {
                id: memberId,
                organizationId: org,
            },
            include: { user: true },
        });

        // Check if target user can be imitated
        if (
            !targetMember ||
            targetMember.role === 'owner' ||
            (targetMember.role === 'admin' && currentMember.role !== 'owner')
        ) {
            return NextResponse.json(
                { error: 'Cannot imitate this user' },
                { status: 403 }
            );
        }

        // Create a new session for the target user directly in the database
        const newSession = await prisma.session.create({
            data: {
                id: uuidv4(),
                token: uuidv4(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
                createdAt: new Date(),
                updatedAt: new Date(),
                userId: targetMember.userId,
                impersonatedBy: uid, // Mark as impersonated
                activeOrganizationId: org,
                ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
                userAgent: request.headers.get('user-agent') || 'unknown',
            },
        });

        // Sign the cookie
        const cookieValue = await signCookie(
            newSession.token,
            process.env.BETTER_AUTH_SECRET!
        );

        // Return the response with the session information and cookie
        return NextResponse.json({
            success: true,
            message: `Imitating user ${targetMember.name || targetMember.user.name || targetMember.user.email}`,
            session: {
                id: newSession.id,
                token: newSession.token,
            },
            cookie: cookieValue,
            redirectTo: callbackURL || '/',
        });
    } catch (error) {
        console.error('Error in imitate route:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
