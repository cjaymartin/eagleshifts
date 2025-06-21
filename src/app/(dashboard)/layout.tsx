import * as React from 'react';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import { PageContainer } from '@toolpad/core/PageContainer';
import DashboardToolbarActions from '@/app/(dashboard)/_components/DashboardToolbarActions';
import OrganizationAuthProvider from '@/components/providers/OrganizationAuthProvider';

export default function DashboardPagesLayout(props: {
    children: React.ReactNode;
}) {
    return (
        <OrganizationAuthProvider>
            <DashboardLayout
                slots={{
                    toolbarActions: DashboardToolbarActions,
                }}
            >
                <PageContainer>{props.children}</PageContainer>
            </DashboardLayout>
        </OrganizationAuthProvider>
    );
}
