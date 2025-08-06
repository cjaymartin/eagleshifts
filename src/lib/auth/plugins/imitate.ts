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
                            ctx
                        );
                    await setSessionCookie(ctx, {
                        session,
                        user,
                    });
                    throw ctx.redirect(callbackURL);
                }
            ),
        },
        rateLimit: [
            {
                pathMatcher(path: any) {
                    return path.startsWith('/imitate');
                },
                window: 60,
                max: 5,
            },
        ],
    };
};
