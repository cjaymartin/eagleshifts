import React, { useState, useEffect } from 'react';
import {
    Button,
    Container,
    MenuItem,
    Stack,
    TextField,
    Typography,
    FormControlLabel,
    Checkbox,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useNotifications } from '@/components/providers/NotificationsProvider';
import { useAuthQuery } from '@/queries/users';
import { useCreateInvitationMutation } from '@/queries/invitations';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUpdateMemberMutation } from '@/queries/users';
import { authClient } from '@/lib/auth-client';

// Form validation schema
const teamUserSchema = z
    .object({
        displayName: z.string().min(1, 'Name is required'),
        email: z.string().optional(),
        role: z.enum(['member', 'admin', 'owner']),
        sendInvitation: z.boolean().optional().default(true),
    })
    .refine(
        (data) => {
            // If sendInvitation is true, the email field must be a non-empty string and a valid email.
            if (data.sendInvitation) {
                // We use safeParse to avoid an exception and return a boolean.
                const email = data.email;
                return email ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) : true;
            }

            // If sendInvitation is false, the email field can be empty or null.
            return true;
        },
        {
            message:
                'Email is required and must be a valid email when "sendInvitation" is active',
            path: ['email'],
        }
    );

// return email ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) : true;

type TeamUserFormData = z.infer<typeof teamUserSchema>;

// Type for TeamForm props
type TeamFormProps = {
    isNew?: boolean; // Whether this is a new member being added
    user?: {
        isActivated?: boolean;
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

    // State for the email change confirmation modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pendingFormData, setPendingFormData] =
        useState<TeamUserFormData | null>(null);
    const [newEmail, setNewEmail] = useState<string>('');

    console.dir(props);

    //const member = user?.member;

    // Default values for the form
    const defaultValues: TeamUserFormData = {
        displayName: '',
        email: '',
        role: 'member',
        sendInvitation: false, // Default to unchecked
    };

    // If editing, use the member data as initial values
    // Prioritize member name over user name
    const initialValues = user
        ? {
              displayName: user.name || '',
              email: user.email || '',
              role: user.role || 'member',
              // Set sendInvitation based on whether email is empty or a placeholder
              sendInvitation:
                  user.email && !user.email.includes('@placeholder.local')
                      ? true
                      : false,
          }
        : defaultValues;

    // Form setup with react-hook-form and zod validation
    const {
        control,
        setValue,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<TeamUserFormData>({
        defaultValues: initialValues,
        resolver: zodResolver(teamUserSchema) as any,
    });

    // Watch the email field to update the checkbox state
    const emailValue = watch('email');

    // Automatically check/uncheck sendInvitation based on email value
    useEffect(() => {
        if (isNew) {
            const hasValidEmail =
                emailValue &&
                emailValue.trim() !== '' &&
                !emailValue.includes('@placeholder.local');

            // Update sendInvitation field based on the email's validity
            if (hasValidEmail && !watch('sendInvitation')) {
                setValue('sendInvitation', true);
            } else if (!hasValidEmail && watch('sendInvitation')) {
                setValue('sendInvitation', false);
            }
        }
    }, [emailValue, isNew, watch, setValue]);

    // Get authentication data
    const { data: session } = useAuthQuery();
    const role = session?.user?.role || 'member';
    const isAdmin = ['admin', 'owner'].includes(role);
    const isOwner = role === 'owner';

    // Mutation for updating team members
    const updateMemberMutation = useUpdateMemberMutation();
    const createInvitationMutation = useCreateInvitationMutation();

    // Function to handle the actual form submission after modal confirmation (if needed)
    const handleFormSubmit = async (
        data: TeamUserFormData,
        sendInvitation: boolean
    ) => {
        if (isNew) {
            await createInvitationMutation.mutateAsync({
                email: data.email,
                role: data.role,
                name: data.displayName,
                sendInvitation: data.sendInvitation,
            });

            handleClose();
            return;
        }

        if (!user?.id) {
            notifications.show('Member ID is required for updates', {
                severity: 'error',
                autoHideDuration: 3000,
            });
            return;
        }

        try {
            // Include email and sendInvitation in the mutation if email has changed
            const emailChanged = data.email !== user.email;

            await updateMemberMutation.mutateAsync({
                memberId: user.id,
                role: data.role,
                displayName: data.displayName,
                ...(emailChanged && {
                    email: data.email,
                    sendInvitation,
                }),
            });

            notifications.show('Member updated successfully', {
                severity: 'success',
                autoHideDuration: 3000,
            });
            handleClose();
        } catch (error: any) {
            notifications.show(`Error updating member: ${error.message}`, {
                severity: 'error',
                autoHideDuration: 3000,
            });
        }
    };

    // Form submission handler
    const onSubmit = handleSubmit((data: TeamUserFormData) => {
        if (isNew) {
            // For new users, just submit directly
            handleFormSubmit(data, data.sendInvitation);
            return;
        }

        // Check if this is an email change for a non-activated user
        const emailChanged = data.email !== user?.email;
        const isNonActivatedUser = user?.isActivated === false;

        if (emailChanged && isNonActivatedUser) {
            // Store the form data and new email for the modal
            setPendingFormData(data);
            setNewEmail(data.email!);
            // Show the modal to ask if they want to send an invitation
            setIsModalOpen(true);
        } else {
            // For regular updates or activated users, just submit directly
            handleFormSubmit(data, false);
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
                                disabled={
                                    isNew ? false : user?.isActivated !== false
                                } // Email can be edited for non-activated users
                                error={!!errors.email}
                                helperText={errors.email?.message}
                                // Hide placeholder emails by displaying an empty string
                                value={
                                    field.value &&
                                    field.value.includes('@placeholder.local')
                                        ? ''
                                        : field.value
                                }
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
                    {isNew && (
                        <Controller
                            name="sendInvitation"
                            control={control}
                            render={({ field, fieldState }) => {
                                // Use the watched email value
                                const isEmailEmpty =
                                    !emailValue || emailValue.trim() === '';

                                return (
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={field.value}
                                                onChange={(e) => {
                                                    field.onChange(e);
                                                    // If checking the box with empty email, show a message
                                                    if (
                                                        e.target.checked &&
                                                        isEmailEmpty
                                                    ) {
                                                        notifications.show(
                                                            'Please enter an email address to send an invitation',
                                                            {
                                                                severity:
                                                                    'warning',
                                                                autoHideDuration: 3000,
                                                            }
                                                        );
                                                        // Prevent checking if email is empty
                                                        field.onChange(false);
                                                    }
                                                }}
                                                // Never disable the checkbox
                                            />
                                        }
                                        label="Send Invitation"
                                        title={
                                            isEmailEmpty
                                                ? 'Enter an email address to send an invitation'
                                                : 'Check to send an invitation email'
                                        }
                                    />
                                );
                            }}
                        />
                    )}
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

            {/* Modal for confirming email change for non-activated users */}
            <Dialog
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                aria-labelledby="email-change-dialog-title"
                aria-describedby="email-change-dialog-description"
            >
                <DialogTitle id="email-change-dialog-title">
                    Send Invitation to New Email?
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="email-change-dialog-description">
                        You&apos;ve changed the email address for this user.
                        Would you like to send an invitation to the new email
                        address ({newEmail})?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            // Close the modal and submit the form with sendInvitation=false
                            setIsModalOpen(false);
                            if (pendingFormData) {
                                handleFormSubmit(pendingFormData, false);
                            }
                        }}
                        color="secondary"
                    >
                        No, Just Update Email
                    </Button>
                    <Button
                        onClick={() => {
                            // Close the modal and submit the form with sendInvitation=true
                            setIsModalOpen(false);
                            if (pendingFormData) {
                                handleFormSubmit(pendingFormData, true);
                            }
                        }}
                        color="primary"
                        autoFocus
                    >
                        Yes, Send Invitation
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
