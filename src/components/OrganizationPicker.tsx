'use client';

import * as React from 'react';
import {
    Select,
    MenuItem,
    FormControl,
    SelectChangeEvent,
    CircularProgress,
    Box,
    Typography,
} from '@mui/material';

interface Organization {
    id: string;
    name: string;
}

interface OrganizationPickerProps {
    organizations: Organization[];
    currentOrgId?: string;
    onOrgChange?: (orgId: string) => void;
}

export function OrganizationPicker({
    organizations,
    currentOrgId,
    onOrgChange,
}: OrganizationPickerProps) {
    const [loading, setLoading] = React.useState(false);

    const handleChange = async (event: SelectChangeEvent) => {
        const newOrgId = event.target.value;
        console.log('[OrgPicker] Switching to org:', newOrgId);

        setLoading(true);
        try {
            if (onOrgChange) {
                await onOrgChange(newOrgId);
            }
        } finally {
            setLoading(false);
        }
    };

    if (organizations.length === 0) {
        return null;
    }

    // If only one org, show it as text instead of dropdown
    if (organizations.length === 1) {
        return (
            <Box sx={{ px: 2, display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                    {organizations[0].name}
                </Typography>
            </Box>
        );
    }

    return (
        <FormControl size="small" sx={{ minWidth: 200, mr: 2 }}>
            <Select
                value={currentOrgId || ''}
                onChange={handleChange}
                disabled={loading}
                displayEmpty
                sx={{
                    '& .MuiSelect-select': {
                        py: 1,
                    },
                }}
                startAdornment={
                    loading ? (
                        <CircularProgress size={16} sx={{ mr: 1 }} />
                    ) : null
                }
            >
                {organizations.map((org) => (
                    <MenuItem key={org.id} value={org.id}>
                        {org.name}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
}
