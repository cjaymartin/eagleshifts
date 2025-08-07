import { appRouter } from '@/server/api/root';
import { createTRPCContext } from '@/server/trpc';

export async function serverCaller() {
  const ctx = await createTRPCContext();
  return appRouter.createCaller(ctx);
}
