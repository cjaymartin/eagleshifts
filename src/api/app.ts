import { Elysia, t } from 'elysia';
import elysiaUserService from '@/api/utils/elysiaUserService';
import apiShiftsRouter from '@/api/shifts';
import apiUserRouter from '@/api/users';

const app = new Elysia({ prefix: '/api' })
    .use(elysiaUserService)

    .use(apiUserRouter)
    .use(apiShiftsRouter)
    .get('/', () => 'hello Next')
    .get('/fnord', () => 'fnord')
    //.use(userService)
    .get(
        '/session',
        async ({ user, session }) => {
            return { user, session };
        },
        { role: 'admin' }
    )
    .post('/', ({ body }) => body, {
        body: t.Object({
            name: t.String(),
        }),
    });

export default app;
export type App = typeof app;
