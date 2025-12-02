import { authkitMiddleware } from '@workos-inc/authkit-nextjs';

export default authkitMiddleware({
  redirectUri: process.env.WORKOS_REDIRECT_URI,
});

export const config = {
  matcher: [
    // Match all paths except static files and public paths
    '/((?!_next/static|_next/image|favicon.ico|public|auth).*)',
  ],
};
