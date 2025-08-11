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
import ShiftForm from '@/app/(dashboard)/shifts/_components/ShiftForm';
import { inferRouterOutputs } from '@trpc/server';
import { AppRouter } from '@/api/trpc/[trpc]';

export default function ShiftDialog({
    payload,
    open,
    onClose,
}: DialogProps<
    inferRouterOutputs<AppRouter>['shifts']['byId'] | undefined | null
>) {
    //const [dialog] = useDialogContext();
    //const { reset: resetDialog } = useShiftDialogHelpers();
    //const [form] = useDialogForm();

    const isNew = !payload || (payload as any)?.isNew; //dialog?.new;
    const isDuplicate = (payload as any)?.isDuplicate;
    //const open = dialog?.open && dialog?.type === 'shift';

    function handleClose() {
        onClose();
    }

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
                    <Box flexGrow={1}>{isNew ? 'Add' : 'Edit'} Shift</Box>
                    <Box>
                        <IconButton onClick={handleClose}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </Box>
            </DialogTitle>
            <DialogContent>
                <Container sx={{ background: 'white', marginTop: 1 }}>
                    <ShiftForm
                        isNew={!!isNew}
                        isDuplicate={!!isDuplicate}
                        shiftId={payload?.id}
                        shift={payload}
                        onClose={handleClose as any}
                    />
                </Container>
            </DialogContent>
        </Dialog>
    );
}
