import {
    createAuthEndpoint,
    originCheck,
    sessionMiddleware,
} from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import z from 'zod';
import { prisma } from '@/lib/prisma';

//type ImitateOpts = {};

export const imitate = () => {
    return {
        id: 'imitate',
        endpoints: {
            imitateEndpoint: createAuthEndpoint(
                '/imitate',
                {
                    method: 'GET',
                    query: z.any(),
                    use: [
                        sessionMiddleware,
                        originCheck((ctx) => {
                            return ctx.query.callbackURL
                                ? decodeURIComponent(ctx.query.callbackURL)
                                : '/';
                        }),
                        originCheck((ctx) => {
                            return ctx.query.newUserCallbackURL
                                ? decodeURIComponent(
                                      ctx.query.newUserCallbackURL
                                  )
                                : '/';
                        }),
                        originCheck((ctx) => {
                            return ctx.query.errorCallbackURL
                                ? decodeURIComponent(ctx.query.errorCallbackURL)
                                : '/';
                        }),
                    ],
                    requireHeaders: true,
                    metadata: {},
                },
                async (ctx) => {
                    const { session: originalSession, user } =
                        ctx?.context?.session;

                    console.dir({ originalSession });
                    const org = originalSession?.activeOrganizationId as
                        | string
                        | undefined;
                    const uid = user.id;
                    if (!org || !uid || !ctx.query.memberId) {
                        throw new Error('Access Denied');
                    }
                    const member = await prisma.member.findFirst({
                        where: { organizationId: org, userId: uid },
                    });
                    if (!member || !['admin', 'owner'].includes(member.role)) {
                        throw new Error('Access Denied');
                    }

                    const callbackURL = new URL(
                        ctx.query.callbackURL
                            ? decodeURIComponent(ctx.query.callbackURL)
                            : '/',
                        ctx.context.baseURL
                    ).toString();
                    const errorCallbackURL = new URL(
                        ctx.query.errorCallbackURL
                            ? decodeURIComponent(ctx.query.errorCallbackURL)
                            : callbackURL,
                        ctx.context.baseURL
                    ).toString();
                    const newUserCallbackURL = new URL(
                        ctx.query.newUserCallbackURL
                            ? decodeURIComponent(ctx.query.newUserCallbackURL)
                            : callbackURL,
                        ctx.context.baseURL
                    ).toString();
                    const toRedirectTo = callbackURL?.startsWith('http')
                        ? callbackURL
                        : callbackURL
                          ? `${ctx.context.options.baseURL}${callbackURL}`
                          : ctx.context.options.baseURL;

                    const targetMemberId = ctx.query.memberId;
                    const targetUser = await prisma.member.findFirst({
                        where: {
                            id: targetMemberId,
                            organizationId: org,
                        },
                        include: { user: true },
                    });

                    if (
                        !targetUser ||
                        targetUser.role === 'owner' ||
                        (targetUser.role === 'admin' && user.role != 'owner')
                    ) {
                        throw new Error('Access Denied');
                    }

                    const session =
                        await ctx.context.internalAdapter.createSession(
                            targetUser.userId,
                            ctx,
                            true,
                            {
                                impersonatedBy: ctx.context.session.user.id,
                                expiresAt: new Date(
                                    Date.now() + 60 * 60 * 1000
                                ), // 1 hour from now
                            }
                        );

                    await prisma.session.update({
                        where: { id: session.id },
                        data: { impersonatedBy: ctx.context.session.user.id },
                    });

                    console.log({
                        session,
                        impersonatedBy: ctx.context.session.user.id,
                    });
                    //set the cookie to match the current session cookie

                    await setSessionCookie(ctx, {
                        session,
                        user,
                    });
                    throw ctx.redirect(callbackURL);
                }
            ),
            stopImitatingEndpoint: createAuthEndpoint(
                '/stop-imitating',
                {
                    method: 'GET',
                    requireHeaders: true,
                    metadata: {},
                    use: [sessionMiddleware],
                },
                async (ctx) => {
                    const { session: currentSession } = ctx?.context?.session;

                    if (!currentSession) {
                        throw new Error('Unauthorized');
                    }

                    const sessionObj = await prisma.session.findUnique({
                        where: { id: currentSession.id },
                    });


                    if (!sessionObj?.impersonatedBy) {
                        throw new Error('You are not imitating anyone');
                    }

                    // Find the original user (admin who initiated the imitation)
                    const originalUser = await prisma.user.findUnique({
                        where: { id: sessionObj.impersonatedBy },
                    });

                    if (!originalUser) {
                        throw new Error('Failed to find original user');
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
                        throw new Error('Failed to find admin session');
                    }

                    // Delete the current imitation session
                    await prisma.session.delete({
                        where: { id: currentSession.id },
                    });

                    // Set the admin's session cookie
                    await setSessionCookie(ctx, {
                        session: adminSession,
                        user: originalUser,
                    });

                    // Redirect to home page
                    throw ctx.redirect('/');
                }
            ),
            isImitatingEndpoint: createAuthEndpoint(
                '/is-imitating',
                {
                    method: 'POST',
                    query: z.any(),
                    //requireHeaders: true,
                    metadata: {},
                    use: [sessionMiddleware],
                },
                async (ctx) => {
                    const { session: currentSession } = ctx?.context?.session;

                    if (!currentSession) {
                        throw new Error('Unauthorized');
                    }

                    const sessionObj = await prisma.session.findUnique({
                        where: { id: currentSession.id },
                    });

                    // Return true if the user is imitating someone, false otherwise
                    return ctx.json({
                        isImitating: !!sessionObj?.impersonatedBy,
                    });
                }
            ),
        },
        rateLimit: [
            {
                pathMatcher(path: any) {
                    return (
                        path.startsWith('/imitate') ||
                        path.startsWith('/stop-imitating') ||
                        path.startsWith('/is-imitating')
                    );
                },
                window: 60,
                max: 5,
            },
        ],
    };
};
