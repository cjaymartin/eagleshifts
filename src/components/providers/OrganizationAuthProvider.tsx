import { auth } from '@/lib/auth';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { logTeamInviteAccept } from '@/lib/logging';

export default async function OrganizationAuthProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    // Check if we're already in a redirect loop by looking for _rsc parameter in the URL
    const headersList = await headers();

    // Get the URL from the headers
    const url = headersList.get('x-url') || '';
    const referer = headersList.get('referer') || '';

    // Check if this is an RSC request
    const isRscRequest = url.includes('_rsc=') || referer.includes('_rsc=');

    // If this is an RSC request and we're on the home page, just render children
    // to break potential redirect loops
    if (isRscRequest && url.match(/\/(\?|$)/)) {
        console.log('Breaking potential RSC redirect loop:', url);
        return children;
    }

    console.log('ONE');

    const cookieList = await cookies();

    // Get the login-organization-slug cookie
    const loginOrganizationSlugCookie = cookieList.get(
        'login-organization-slug'
    );
    const loginOrganizationSlug = loginOrganizationSlugCookie?.value;

    // Log cookie information for debugging
    console.log({
        loginOrganizationSlug,
        cookieExists: !!loginOrganizationSlugCookie,
        cookieValue: loginOrganizationSlugCookie?.value,
    });

    const activeOrg = await auth.api
        .getFullOrganization({
            headers: await headers(),
        })
        .catch((e) => {
            console.log(e);
        });
    if (activeOrg) {
        return children;
    }

    console.log('ONE2');

    const session = await auth.api.getSession({
        headers: await headers(),
    });
    if (!session?.user) {
        return children;
    }

    console.log('ONE3');
    // Check if the user is being imitated by an admin
    const isImitated = false; //session.impersonatedBy !== undefined;

    // If the user is not being imitated, check if they are an activated member
    if (!isImitated && loginOrganizationSlug) {
        // Find the member record for this user in the organization
        const member = await prisma.member.findFirst({
            where: {
                userId: session.user.id,
                organization: {
                    slug: loginOrganizationSlug,
                },
            },
        });

        // If the member exists but is not activated, sign them out and redirect
        if (member && !member.isActivated) {
            await auth.api.signOut({
                headers: await headers(),
            });
            return redirect('/auth/login/organization/not_activated');
        }
    }
    console.log('ONE4');

    // If there's no loginOrganizationSlug, we need to sign out and redirect
    // But first, check if we're already on the home page to prevent redirect loops
    if (!loginOrganizationSlug) {
        console.log('BYE BYE BYE BYE BYE');

        // Check if we're already on the home page
        const isHomePage = url === '/' || url === '' || url.match(/^\/(\?|$)/);

        // Check if this is an RSC request
        if (isRscRequest) {
            console.log(
                'RSC request detected, not signing out to prevent loop'
            );
            return children;
        }

        await auth.api.signOut({
            headers: await headers(),
        });

        // Only redirect if we're not already on the home page
        if (!isHomePage) {
            return redirect('/');
        } else {
            console.log(
                'Already on home page, not redirecting to prevent loop'
            );
            return children;
        }
    }
    console.log('ONE5');

    // Check if the user has an outstanding invitation
    const invitation = await prisma.invitation.findFirst({
        where: {
            email: session.user.email,
            organization: {
                slug: loginOrganizationSlug,
            },
        },
        include: {
            organization: true,
        },
    });
    if (invitation) {
        //accept the invitation
        await auth.api.acceptInvitation({
            headers: await headers(),
            body: {
                invitationId: invitation.id,
            },
        });

        // Log the invitation acceptance
        await logTeamInviteAccept(
            prisma,
            invitation.organizationId,
            session.user.id,
            invitation.id,
            session.user.email,
            invitation.role || 'member',
            {
                organizationName: invitation.organization.name,
                organizationId: invitation.organizationId,
            }
        );
    }

    await auth.api
        .setActiveOrganization({
            headers: await headers(),
            body: {
                organizationSlug: loginOrganizationSlug,
            },
        })
        .catch(async () => {
            await auth.api.signOut({
                headers: await headers(),
            });
            return redirect('/auth/login/organization/no_access');
        });

    return children;
}
