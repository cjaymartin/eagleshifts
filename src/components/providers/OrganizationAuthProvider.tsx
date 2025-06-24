import { auth } from '@/lib/auth';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function OrganizationAuthProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieList = await cookies();
    const loginOrganizationSlug = cookieList.get(
        'login-organization-slug'
    )?.value;

    const activeOrg = await auth.api
        .getFullOrganization({
            headers: await headers(),
        })
        .catch((e) => {
            console.log('AOE');
            console.log(e);
        });
    if (activeOrg) {
        return children;
    }

    const session = await auth.api.getSession({
        headers: await headers(),
    });
    if (!session?.user) {
        return children;
    }

    if (!loginOrganizationSlug) {
        await auth.api.signOut({
            headers: await headers(),
        });
        return redirect('/');
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
