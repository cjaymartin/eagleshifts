'use server';

import { prisma } from '@/lib/prisma';
import { auth, signCookie } from '@/lib/auth';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
// Import only what we need

function generateBetterAuthId(): string {
    const uuid = uuidv4(); // Generate a regular UUID
    const base64Uuid = Buffer.from(uuid.replace(/-/g, ''), 'hex').toString(
        'base64'
    ); // Convert UUID to base64
    return base64Uuid.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''); // Make it URL-safe
}

export default async function acceptInvitation(invitationId: string) {
    // 1. Make sure the invitationId is 100% valid
    if (!invitationId) {
        throw new Error('Invitation ID is required');
    }

    // Find the invitation in the database
    const invitation = await prisma.invitation.findUnique({
        where: { id: invitationId },
        include: {
            organization: true,
        },
    });

    if (!invitation) {
        throw new Error('Invalid invitation');
    }

    // Check if invitation is expired
    if (invitation?.expiresAt && invitation?.expiresAt < new Date()) {
        throw new Error('Invitation has expired');
    }

    // 2. Create a user if one does not yet exist
    let user = await prisma.user.findUnique({
        where: { email: invitation.email },
    });

    if (!user) {
        user = await prisma.user.create({
            data: {
                //I need to create the ID, it's a better-auth formatted string like "QSNv4skoyTqCOzvpC42D30ymNn0Lu4XW"
                id: generateBetterAuthId(),
                email: invitation.email,
                name: invitation.email.split('@')[0], // Use name from invitation or derive from email
                emailVerified: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });
    }

    // 3. Create a Member from the invitationId in the appropriate organization
    // Check if the user is already a member of the organization
    const existingMember = await prisma.member.findFirst({
        where: {
            userId: user.id,
            organizationId: invitation.organizationId,
        },
    });

    let member;
    if (!existingMember) {
        // Create a new member
        member = await prisma.member.create({
            data: {
                id: generateBetterAuthId(),
                userId: user.id,
                organizationId: invitation.organizationId,
                role: invitation.role || 'member', // Use role from invitation or default to 'member'
                name: invitation.email, //name,
                createdAt: new Date(),
            },
        });
    } else {
        member = existingMember;
    }

    // 4. Login as that newly created user/member
    // Create a new session for the user
    const session = await prisma.session.create({
        data: {
            id: uuidv4(),
            token: uuidv4(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
            createdAt: new Date(),
            updatedAt: new Date(),
            userId: user.id,
            activeOrganizationId: invitation.organizationId,
            ipAddress: 'unknown', // We don't have access to headers in server actions
            userAgent: 'unknown', // We don't have access to headers in server actions
        },
    });

    // Sign the cookie
    const cookieValue = await signCookie(
        session.token,
        process.env.BETTER_AUTH_SECRET || ''
    );

    // const cookieStore = await cookies();
    // // Set the cookie
    // cookieStore.set('better-auth.session_token', cookieValue, {
    //     httpOnly: true,
    //     secure: process.env.NODE_ENV === 'production',
    //     sameSite: 'lax',
    //     path: '/',
    //     expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    // });

    // Delete the invitation after it's been used
    // await prisma.invitation.delete({
    //     where: { id: invitationId },
    // });

    // Return the user and organization info
    return {
        success: true,
        cookie: cookieValue,
        user,
        member,
        organization: invitation.organization,
    };
}
