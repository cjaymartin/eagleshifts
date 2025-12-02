'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { setOrgCookie } from '@/app/actions/auth';

import {
    Select as MuiSelect,
    MenuItem,
    FormControl,
    InputLabel,
    SelectChangeEvent,
} from '@mui/material';

interface Organization {
    id: string;
    name: string;
}

interface OrgPickerProps {
    organizations: Organization[];
    currentOrgId?: string;
}

export function OrgPicker({ organizations, currentOrgId }: OrgPickerProps) {
    const router = useRouter();
    const [val, setVal] = React.useState(currentOrgId || '');

    const handleChange = async (event: SelectChangeEvent) => {
        const newOrgId = event.target.value;
        setVal(newOrgId);

        // Set cookie via Server Action (handles redirect)
        await setOrgCookie(newOrgId);
    };

    return (
        <FormControl fullWidth size="small">
            <InputLabel id="org-select-label">Organization</InputLabel>
            <MuiSelect
                labelId="org-select-label"
                id="org-select"
                value={val}
                label="Organization"
                onChange={handleChange}
            >
                {organizations.map((org) => (
                    <MenuItem key={org.id} value={org.id}>
                        {org.name}
                    </MenuItem>
                ))}
            </MuiSelect>
        </FormControl>
    );
}
