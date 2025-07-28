import { NextRequest, NextResponse } from 'next/server';
import { createTRPCContext } from '@/server/trpc';
import { appRouter } from '@/server/api/root';

export async function GET(
    request: NextRequest,
    { params }: { params: { tenantId: string; icalSlug: string } }
) {
    try {
        await params;

        // Create a context and caller
        const ctx = await createTRPCContext();
        const caller = appRouter.createCaller(ctx);

        // Call the getIcal procedure
        const icalData = await caller.ical.getIcal({
            tenantId: params.tenantId,
            icalSlug: params.icalSlug,
        });

        // Return the iCal data with the appropriate content type
        return new NextResponse(icalData, {
            headers: {
                'Content-Type': 'text/calendar; charset=utf-8',
            },
        });
    } catch (error: any) {
        console.error('Error generating iCal:', error);

        // Return appropriate error responses
        if (error.code === 'NOT_FOUND') {
            return NextResponse.json(
                { error: 'No user found matching the provided icalSlug' },
                { status: 404 }
            );
        }

        if (error.code === 'BAD_REQUEST') {
            return NextResponse.json(
                { error: error.message || 'Bad request' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
