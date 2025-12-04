'use client';

import { Crud } from '@toolpad/core';
import tenantDataSource, {
    OrganizationData,
} from '@/app/(dashboard)/superadmin/tenants/tenant-datasource';

export default function TenantPage() {
    return (
        <div>
            <Crud<OrganizationData>
                dataSource={tenantDataSource}
                rootPath={'/superadmin/tenants'}
                slots={{
                    pageContainer: (x) => x.children, //hide page container because we have one
                }}
            />
        </div>
    );
}
