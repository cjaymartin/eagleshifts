import { Elysia } from 'elysia';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';

const elysiaUserService = new Elysia({ name: 'auth' })
    .derive({ as: 'scoped' }, async ({}) => {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id || !session?.session?.activeOrganizationId) {
            return {
                user: undefined,
                session: undefined,
            };
        }

        const member = await prisma.member.findFirst({
            where: {
                userId: session?.user?.id,
                organizationId: session?.session?.activeOrganizationId,
            },
        });

        if (!member) {
            return {
                user: undefined,
                session: undefined,
            };
        }

        return {
            user: {
                ...session?.user,
                role: member.role,
                organizationId: session?.session.activeOrganizationId,
            },

            session: session?.session,
        };
    })
    .macro({
        role(roleName: string) {
            return {
                beforeHandle({ user }) {
                    //role strength is guest, member, admin, owner
                    //user.role must be >= roleName
                    if (!user || !user.role) {
                        return new Response('Unauthorized', { status: 401 });
                    }
                    const roles = ['guest', 'member', 'admin', 'owner', 'god'];
                    const userRoleIndex = roles.indexOf(user.role);
                    const requiredRoleIndex = roles.indexOf(roleName);
                    if (userRoleIndex < requiredRoleIndex) {
                        return new Response('Forbidden', { status: 403 });
                    }
                    return undefined;
                },
            };
            //     beforeHandle: (({ user }) => {
            //
            //     })
            // };
        },
    });

export default elysiaUserService;
