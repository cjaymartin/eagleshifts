import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/api/root';
import { createTRPCContext } from '@/server/trpc';

const handler = async (req: Request) => {
    try {
        return await fetchRequestHandler({
            endpoint: '/api/trpc',
            req,
            router: appRouter,
            createContext: createTRPCContext,
            onError(opts) {
                const { path, error } = opts;
                console.error(`tRPC Error on '${path}':`, error);
            },
        });
    } catch (error) {
        console.error('tRPC request handler error:', error);
        return new Response(
            `tRPC request handler error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            { status: 500 }
        );
    }
};

export { handler as GET, handler as POST };
