import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getFileUrl } from '@/utils/s3';

export async function GET(
    request: NextRequest,
    { params }: { params: { uploadId: string } }
) {
    try {
        // Get the upload ID from the URL
        const { uploadId } = params;

        // Get the user session
        const session = await auth.api.getSession({
            headers: request.headers,
        });
        if (!session?.user?.id || !session?.session?.activeOrganizationId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get the member
        const member = await prisma.member.findFirst({
            where: {
                userId: session.user.id,
                organizationId: session.session.activeOrganizationId,
            },
        });

        if (!member) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Create a user object similar to the one in TRPC context
        const user = {
            ...session.user,
            name: member.name || session.user.name,
            image: member.image || session.user.image,
            role: member.role,
            organizationId: session.session.activeOrganizationId,
            memberId: member.id,
        };

        // Get the upload
        const upload = await prisma.upload.findUnique({
            where: { id: uploadId },
            include: {
                shift: true,
            },
        });

        if (!upload) {
            return NextResponse.json(
                { error: 'Upload not found' },
                { status: 404 }
            );
        }

        // Check if the upload belongs to the user's organization
        if (upload.shift.organizationId !== user.organizationId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        // Check if the user is authorized to view this upload
        const isAdmin = user.role === 'admin' || user.role === 'owner';

        if (!isAdmin && user.memberId) {
            // Check if the user is assigned to the shift
            const assignment = await prisma.shiftAssignment.findFirst({
                where: {
                    shiftId: upload.shiftId,
                    memberId: user.memberId,
                    outcome: 'assigned',
                },
            });

            if (!assignment) {
                return NextResponse.json(
                    { error: 'Unauthorized' },
                    { status: 403 }
                );
            }
        }

        // Get a signed URL for the file with the original filename
        const url = await getFileUrl(upload.fileKey, 3600, upload.fileName);

        // Redirect to the signed URL
        return NextResponse.redirect(url);
    } catch (error: any) {
        console.error('Error viewing file:', error);
        return NextResponse.json(
            { error: `Failed to view file: ${error.message}` },
            { status: 500 }
        );
    }
}
