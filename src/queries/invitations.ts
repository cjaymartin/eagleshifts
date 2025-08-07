import { trpc } from '@/lib/trpc/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Hook to list all invitations for the organization
export function useInvitationsListQuery() {
    return trpc.invitations.listInvitations.useQuery();
}

// Hook to create an invitation
export function useCreateInvitationMutation() {
    const queryClient = useQueryClient();
    return trpc.invitations.createInvitation.useMutation({
        onSuccess: () => {
            // Invalidate the invitations list and members list to show the new invitation and inactive member
            queryClient.invalidateQueries({ queryKey: ['invitations'] });
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
}

// Hook to accept an invitation
export function useAcceptInvitationMutation() {
    const queryClient = useQueryClient();
    return trpc.invitations.acceptInvitation.useMutation({
        onSuccess: () => {
            // Invalidate the invitations list and members list
            queryClient.invalidateQueries({ queryKey: ['invitations'] });
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
}

// Hook to delete an invitation
export function useDeleteInvitationMutation() {
    const queryClient = useQueryClient();
    return trpc.invitations.deleteInvitation.useMutation({
        onSuccess: () => {
            // Invalidate the invitations list and members list
            queryClient.invalidateQueries({ queryKey: ['invitations'] });
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
}

// Hook to re-invite a user (create a new invitation for an existing inactive member)
export function useReInviteMutation() {
    const queryClient = useQueryClient();
    return trpc.invitations.createInvitation.useMutation({
        onSuccess: () => {
            // Invalidate the invitations list and members list to reflect the updated data
            queryClient.invalidateQueries({ queryKey: ['invitations'] });
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
}
