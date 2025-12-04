import { withAuth } from '@workos-inc/authkit-nextjs';
import { redirect } from 'next/navigation';
import { WorkOS } from '@workos-inc/node';

const workos = new WorkOS(process.env.WORKOS_API_KEY);

export default async function SuperadminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, organizationId } = await withAuth();

    if (!user || !organizationId) {
        return redirect('/');
    }

    // Get organization details from WorkOS
    const organization =
        await workos.organizations.getOrganization(organizationId);

    // Check if this is the admin organization (identified by name)
    const isAdmin = organization.name === 'Admin';

    console.log('[Superadmin] Access check:', {
        userId: user.id,
        userEmail: user.email,
        orgId: organizationId,
        orgName: organization.name,
        isAdmin,
    });

    if (!isAdmin) {
        console.log('[Superadmin] Access denied - not in Admin organization');
        return redirect('/');
    }

    return <>{children}</>;
}
