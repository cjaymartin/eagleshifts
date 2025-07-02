import React from 'react';
import {
    Button,
    Container,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useNotifications } from '@toolpad/core';
import {
    useAuthQuery,
    useCreateMemberInvitationMutation,
} from '@/queries/users';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUpdateMemberMutation } from '@/queries/users';
import { authClient } from '@/lib/auth-client';

// Form validation schema
const teamUserSchema = z.object({
    displayName: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    role: z.enum(['member', 'admin', 'owner']),
});

type TeamUserFormData = z.infer<typeof teamUserSchema>;

// Type for TeamForm props
type TeamFormProps = {
    isNew?: boolean; // Whether this is a new member being added
    user?: {
        id?: string; // User ID for existing members
        name?: string; // Display name of the user
        email?: string; // Email of the user
        role?: 'member' | 'admin' | 'owner'; // Role of the user
    };
    handleClose: () => void; // Callback to close the form
};

export default function TeamForm(props: TeamFormProps) {
    const { isNew, user, handleClose } = props;
    const notifications = useNotifications();

    console.dir(props);

    //const member = user?.member;

    // Default values for the form
    const defaultValues: TeamUserFormData = {
        displayName: '',
        email: '',
        role: 'member',
    };

    // If editing, use the member data as initial values
    // Prioritize member name over user name
    const initialValues = user
        ? {
              displayName: user.name || '',
              email: user.email || '',
              role: user.role || 'member',
          }
        : defaultValues;

    // Form setup with react-hook-form and zod validation
    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<TeamUserFormData>({
        defaultValues: initialValues,
        resolver: zodResolver(teamUserSchema),
    });

    // Get authentication data
    const { data: session } = useAuthQuery();
    const role = session?.user?.role || 'member';
    const isAdmin = ['admin', 'owner'].includes(role);
    const isOwner = role === 'owner';

    // Mutation for updating team members
    const updateMemberMutation = useUpdateMemberMutation();
    const createInvitationMutation = useCreateMemberInvitationMutation();

    // Form submission handler
    const onSubmit = handleSubmit(async (data: TeamUserFormData) => {
        if (isNew) {
            console.log(
                'Invite functionality will be implemented separately',
                data
            );

            await createInvitationMutation.mutateAsync({
                email: data.email,
                role: data.role,
            });

            handleClose();
            return;
        }

        if (!user?.id) {
            notifications.show('Member ID is required for updates', {
                severity: 'error',
            });
            return;
        }

        try {
            await updateMemberMutation.mutateAsync({
                memberId: user.id,
                role: data.role,
                displayName: data.displayName,
            });
            notifications.show('Member updated successfully', {
                severity: 'success',
            });
            handleClose();
        } catch (error) {
            notifications.show(`Error updating member: ${error.message}`, {
                severity: 'error',
            });
        }
    });

    return (
        <Container>
            <form onSubmit={onSubmit}>
                <Stack spacing={2}>
                    <Controller
                        name="displayName"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Name"
                                variant="outlined"
                                error={!!errors.displayName}
                                helperText={errors.displayName?.message}
                            />
                        )}
                    />
                    <Controller
                        name="email"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Email"
                                variant="outlined"
                                disabled={!isNew} // Email can only be set when creating a new member
                                error={!!errors.email}
                                helperText={errors.email?.message}
                            />
                        )}
                    />
                    <Controller
                        name="role"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                select
                                label="Role"
                                variant="outlined"
                                disabled={
                                    !isAdmin ||
                                    (user?.role === 'owner' && !isOwner)
                                }
                                error={!!errors.role}
                                helperText={errors.role?.message}
                            >
                                <MenuItem value="member">Member</MenuItem>
                                <MenuItem value="admin">Admin</MenuItem>
                                {isOwner && (
                                    <MenuItem value="owner">Owner</MenuItem>
                                )}
                            </TextField>
                        )}
                    />
                    <Stack direction="row" spacing={2}>
                        <Button
                            variant="contained"
                            type="submit"
                            disabled={
                                isSubmitting ||
                                (!isAdmin && user?.role === 'owner')
                            }
                        >
                            {isSubmitting
                                ? 'Saving...'
                                : isNew
                                  ? 'Add Member'
                                  : 'Update'}
                        </Button>
                        <Button
                            variant="contained"
                            color="secondary"
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                    </Stack>
                </Stack>
            </form>
        </Container>
    );
}
