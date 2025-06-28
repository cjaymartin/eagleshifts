import {
    Box,
    Container,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
} from '@mui/material';

import CloseIcon from '@mui/icons-material/Close';
import { DialogProps } from '@toolpad/core';
import RequestForm from '@/app/(dashboard)/requests/_components/RequestForm';
import { inferRouterOutputs } from '@trpc/server';
import { AppRouter } from '@/api/trpc/[trpc]';
import { useShiftGetQuery } from '@/queries/shifts';

export default function RequestDialog({
    payload,
    open,
    onClose,
}: DialogProps<
    inferRouterOutputs<AppRouter>['requests']['byId'] | undefined | null
>) {
    const isNew = !payload;
    
    // If we have a request, get the associated shift
    const { data: shift } = useShiftGetQuery(payload?.shiftId || '', {
        enabled: !!payload?.shiftId,
    });

    function handleClose() {
        onClose();
    }

    return (
        <Dialog
            fullWidth={true}
            maxWidth="md"
            open={open}
            onClose={handleClose}
            aria-labelledby="request-dialog-title"
            aria-describedby="request-dialog-description"
        >
            <DialogTitle>
                <Box display="flex">
                    <Box flexGrow={1}>{isNew ? 'Submit' : 'View'} Shift Request</Box>
                    <Box>
                        <IconButton onClick={handleClose}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </Box>
            </DialogTitle>
            <DialogContent>
                <Container sx={{ background: 'white', marginTop: 1 }}>
                    <RequestForm
                        isNew={isNew}
                        requestId={payload?.id}
                        request={payload}
                        shift={shift || payload?.shift}
                        onClose={handleClose}
                    />
                </Container>
            </DialogContent>
        </Dialog>
    );
}