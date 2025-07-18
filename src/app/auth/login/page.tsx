import LoginDialog from '@/components/LoginDialog';
import { prisma } from '@/lib/prisma';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';

export default async function LoginPage() {
    const cookieStore = await cookies();
    const loginOrganizationSlug = cookieStore.get(
        'login-organization-slug'
    )?.value;
    // const loginOrganization = await auth.api.getFullOrganization({
    //     headers: await headers(),
    // });
    // const loginOrganizationSlug = await loginOrganization.slug;

    //TODO: If there's no loginOrganizationSlug, we should redirect to the organization selection page.

    const organization = await prisma.organization.findFirst({
        where: {
            slug: loginOrganizationSlug,
        },
    });

    const anyOrganization = await prisma.organization.findFirst({});
    //const organizations = prisma.organization.

    return (
        <LoginDialog
            activeOrganization={organization || (anyOrganization as any)}
        />
    );
}
