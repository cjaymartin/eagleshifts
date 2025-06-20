"use client";

import { Stack } from "@mui/material";
import {Account} from "@toolpad/core";
import OrgChooser from "@/app/(dashboard)/_components/OrgChooser";

export default function DashboardToolbarActions() {
  return (
    <Stack direction="row">

      <OrgChooser />
      {/* Add your toolbar actions here */}
      <Account />
    </Stack>
  );
}