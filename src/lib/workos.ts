import { WorkOS } from '@workos-inc/node';

const workos = new WorkOS(process.env.WORKOS_API_KEY);

export const clientId = process.env.WORKOS_CLIENT_ID as string;
export const redirectUri = process.env.WORKOS_REDIRECT_URI as string;

export default workos;
