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
import AvailabilityForm from '@/app/(dashboard)/availability/_components/AvailabilityForm';
import { inferRouterOutputs } from '@trpc/server';
import { AppRouter } from '@/api/trpc/[trpc]';

export default function AvailabilityDialog({
    payload,
    open,
    onClose,
}: DialogProps<
    inferRouterOutputs<AppRouter>['availability']['byId'] | undefined | null
>) {
    const isNew = !payload || !payload.id;

    function handleClose() {
        onClose();
    }

    console.log('AvailabilityDialog payload:', payload);

    return (
        <Dialog
            fullWidth={true}
            maxWidth="lg"
            open={open}
            onClose={handleClose}
            aria-labelledby="dialog-dialog-title"
            aria-describedby="dialog-dialog-description"
        >
            <DialogTitle>
                <Box display="flex">
                    <Box flexGrow={1}>{isNew ? 'Add' : 'Edit'} Availability</Box>
                    <Box>
                        <IconButton onClick={handleClose}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </Box>
            </DialogTitle>
            <DialogContent>
                <Container sx={{ background: 'white', marginTop: 1 }}>
                    <AvailabilityForm
                        isNew={!!isNew}
                        availabilityId={payload?.id}
                        availability={payload}
                        onClose={handleClose}
                        memberId={payload?.memberId || undefined}
                    />
                </Container>
            </DialogContent>
        </Dialog>
    );
}
