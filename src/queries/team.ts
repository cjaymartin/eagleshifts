import { trpc } from '@/lib/trpc/client';
import { useAuthQuery } from './users';

// Business profile hooks
export function useBusinessProfileQuery() {
  const { data: session } = useAuthQuery();
  const role = session?.user?.role || 'member';
  const isAdmin = ['admin', 'owner'].includes(role);

  return trpc.team.getBusinessProfile.useQuery(undefined, {
    enabled: isAdmin,
  });
}

export function useUpdateBusinessProfileMutation() {
  const utils = trpc.useUtils();
  return trpc.team.updateBusinessProfile.useMutation({
    onSuccess: () => {
      utils.team.getBusinessProfile.invalidate();
    },
  });
}

// Business notification settings hooks
export function useBusinessNotificationSettingsQuery() {
  const { data: session } = useAuthQuery();
  const role = session?.user?.role || 'member';
  const isAdmin = ['admin', 'owner'].includes(role);

  return trpc.team.getBusinessNotificationSettings.useQuery(undefined, {
    enabled: isAdmin,
  });
}

export function useUpdateBusinessNotificationSettingsMutation() {
  const utils = trpc.useUtils();
  return trpc.team.updateBusinessNotificationSettings.useMutation({
    onSuccess: () => {
      utils.team.getBusinessNotificationSettings.invalidate();
    },
  });
}

// Business shift settings hooks
export function useBusinessShiftSettingsQuery() {
  const { data: session } = useAuthQuery();
  const role = session?.user?.role || 'member';
  const isAdmin = ['admin', 'owner'].includes(role);

  return trpc.team.getBusinessShiftSettings.useQuery(undefined, {
    enabled: isAdmin,
  });
}

export function useUpdateBusinessShiftSettingsMutation() {
  const utils = trpc.useUtils();
  return trpc.team.updateBusinessShiftSettings.useMutation({
    onSuccess: () => {
      utils.team.getBusinessShiftSettings.invalidate();
    },
  });
}

// User profile hooks
export function useUserProfileQuery() {
  return trpc.team.getUserProfile.useQuery();
}

export function useUpdateUserProfileMutation() {
  const utils = trpc.useUtils();
  return trpc.team.updateUserProfile.useMutation({
    onSuccess: () => {
      utils.team.getUserProfile.invalidate();
    },
  });
}

// User notification settings hooks
export function useUserNotificationSettingsQuery() {
  return trpc.team.getUserNotificationSettings.useQuery();
}

export function useUpdateUserNotificationSettingsMutation() {
  const utils = trpc.useUtils();
  return trpc.team.updateUserNotificationSettings.useMutation({
    onSuccess: () => {
      utils.team.getUserNotificationSettings.invalidate();
    },
  });
}

// User iCal link hooks
export function useUserIcalLinkQuery() {
  return trpc.team.getUserIcalLink.useQuery();
}

export function useRegenerateUserIcalLinkMutation() {
  const utils = trpc.useUtils();
  return trpc.team.regenerateUserIcalLink.useMutation({
    onSuccess: () => {
      utils.team.getUserIcalLink.invalidate();
    },
  });
}