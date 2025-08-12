import { NextRequest, NextResponse } from 'next/server';
import { auth, signCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
    try {
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

        const { session: currentSession } = session;

        console.log({ currentSession });
        if (!currentSession?.id) {
            return NextResponse.json(
                {
                    error: 'Bad Request',
                    message: 'Something went wrong',
                },
                { status: 400 }
            );
        }

        const sessionObj = await prisma.session.findUnique({
            where: {
                id: currentSession.id,
            },
        });

        console.log({ sessionObj });

        const impersonatedBy = sessionObj?.impersonatedBy;

        // Check if the user is currently imitating someone
        if (!impersonatedBy) {
            return NextResponse.json(
                {
                    error: 'Bad Request',
                    message: 'You are not imitating anyone',
                },
                { status: 400 }
            );
        }

        // Find the original user (admin who initiated the imitation)
        const originalUser = await prisma.user.findUnique({
            where: { id: impersonatedBy },
        });

        if (!originalUser) {
            return NextResponse.json(
                {
                    error: 'Internal Server Error',
                    message: 'Failed to find original user',
                },
                { status: 500 }
            );
        }

        // Find the admin's original session
        const adminSession = await prisma.session.findFirst({
            where: {
                userId: originalUser.id,
                // Only find active sessions
                expiresAt: {
                    gt: new Date(),
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        if (!adminSession) {
            return NextResponse.json(
                {
                    error: 'Internal Server Error',
                    message: 'Failed to find admin session',
                },
                { status: 500 }
            );
        }

        // Delete the current imitation session
        await prisma.session.delete({
            where: { id: currentSession.id },
        });

        // Sign the admin's session cookie
        const cookieValue = await signCookie(
            adminSession.token,
            process.env.BETTER_AUTH_SECRET!
        );

        // Return the response with the admin session information and cookie
        return NextResponse.json({
            success: true,
            message: 'Stopped imitating user',
            session: {
                id: adminSession.id,
                token: adminSession.token,
            },
            cookie: cookieValue,
            redirectTo: '/',
        });
    } catch (error) {
        console.error('Error in stop-imitating route:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export const GET = POST;
