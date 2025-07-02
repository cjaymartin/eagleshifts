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
import TeamForm from '@/app/(dashboard)/team/_components/TeamForm';
import { inferRouterOutputs } from '@trpc/server';
import { AppRouter } from '@/api/trpc/[trpc]';

export default function TeamDialog({
    payload,
    open,
    onClose,
}: DialogProps<
    inferRouterOutputs<AppRouter>['users']['getMemberById'] | undefined | null
>) {
    //const isNew = !payload;
    const { isNew, user } = payload || {};

    function handleClose() {
        onClose();
    }

    return (
        <Dialog
            fullWidth={true}
            maxWidth="md"
            open={open}
            onClose={handleClose}
            aria-labelledby="team-dialog-title"
            aria-describedby="team-dialog-description"
        >
            <DialogTitle>
                <Box display="flex">
                    <Box flexGrow={1}>{isNew ? 'Add' : 'Edit'} Team Member</Box>
                    <Box>
                        <IconButton onClick={handleClose}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </Box>
            </DialogTitle>
            <DialogContent>
                <Container sx={{ background: 'white', marginTop: 1 }}>
                    <TeamForm
                        isNew={!!isNew}
                        user={user}
                        handleClose={handleClose}
                    />
                </Container>
            </DialogContent>
        </Dialog>
    );
}
