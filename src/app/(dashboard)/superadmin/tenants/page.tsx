"use client";

import {Organization} from "@/generated/prisma";
import { Crud } from "@toolpad/core";
import tenantDataSource from "@/app/(dashboard)/superadmin/tenants/tenant-datasource";

export default function TenantPage() {
  return (
    <div>
      <Crud<Organization>
        dataSource={tenantDataSource}
        rootPath={"/superadmin/tenants"}
        slots={{
          pageContainer: x => x.children, //hide page container because we have one
        }}
      />
    </div>
  );
}