import { trpc } from '@/lib/trpc/client';

// Ad-hoc mutation to parse a shift from freeform text using the AI router
export function useParseShiftMutation() {
  return trpc.ai.parseShift.useMutation();
}
