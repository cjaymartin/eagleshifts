'use client';

import { Organization } from '@/generated/prisma';
import { Crud } from '@toolpad/core';
import tenantDataSource from '@/app/(dashboard)/superadmin/tenants/tenant-datasource';
import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    Box,
} from '@mui/material';
import { useState } from 'react';

export default function TenantPage() {
    const [syncing, setSyncing] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [open, setOpen] = useState(false);

    const handleSync = async () => {
        setSyncing(true);
        setLogs(['Starting sync...']);
        setOpen(true);

        try {
            const res = await fetch('/api/admin/sync-workos', {
                method: 'POST',
            });
            const data = await res.json();

            if (data.success) {
                setLogs(data.logs);
            } else {
                setLogs((prev) => [...prev, `Error: ${data.error}`]);
            }
        } catch (e: any) {
            setLogs((prev) => [...prev, `Network Error: ${e.message}`]);
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSync}
                    disabled={syncing}
                >
                    {syncing ? 'Syncing...' : 'Sync to WorkOS'}
                </Button>
            </Box>

            <Crud<Organization>
                dataSource={tenantDataSource}
                rootPath={'/superadmin/tenants'}
                slots={{
                    pageContainer: (x) => x.children, //hide page container because we have one
                }}
            />

            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>WorkOS Sync Logs</DialogTitle>
                <DialogContent dividers>
                    <Box
                        sx={{
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap',
                            maxHeight: '60vh',
                            overflow: 'auto',
                        }}
                    >
                        {logs.map((log, i) => (
                            <Typography key={i} variant="body2" component="div">
                                {log}
                            </Typography>
                        ))}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
