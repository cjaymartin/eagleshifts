import { treaty } from '@elysiajs/eden';
import type { App } from '@/api/app';

const edenClient = treaty<App>('localhost:3000');

export default edenClient;
