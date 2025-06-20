import { NextRequest, NextResponse } from "next/server";
import { headers as nextheaders } from "next/headers";
import { auth } from "@/lib/auth";
import {rootDomain} from "@/lib/utils";

const enforceAuthPaths = [
  '/fnord',
  '/superadmin',
  '/dashboard',
]

function extractSubdomain(request: NextRequest): string | null {
  const url = request.url;
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0];

  // Local development environment
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    // Try to extract subdomain from the full URL
    const fullUrlMatch = url.match(/http:\/\/([^.]+)\.localhost/);
    if (fullUrlMatch && fullUrlMatch[1]) {
      return fullUrlMatch[1];
    }

    // Fallback to host header approach
    if (hostname.includes('.localhost')) {
      return hostname.split('.')[0];
    }

    return null;
  }

  // Production environment
  const rootDomainFormatted = rootDomain.split(':')[0];

  // Handle preview deployment URLs (tenant---branch-name.vercel.app)
  if (hostname.includes('---') && hostname.endsWith('.vercel.app')) {
    const parts = hostname.split('---');
    return parts.length > 0 ? parts[0] : null;
  }

  // Regular subdomain detection
  const isSubdomain =
    hostname !== rootDomainFormatted &&
    hostname !== `www.${rootDomainFormatted}` &&
    hostname.endsWith(`.${rootDomainFormatted}`);

  return isSubdomain ? hostname.replace(`.${rootDomainFormatted}`, '') : null;
}


export async function middleware(request: NextRequest) {
  const {pathname} = request.nextUrl;
  const subdomain = extractSubdomain(request);

  const headers = new Headers();
  headers.set("x-current-path", pathname);

  if (subdomain) {
    headers.set("x-subdomain", subdomain);
  }


  //const requiresAuth = enforceAuthPaths.some((prefix) => currentPath.startsWith(prefix));

  // if (!requiresAuth) {
  //   return NextResponse.next({ headers });;
  // }
  //
  // const session = await auth.api.getSession({
  //   headers: await nextheaders()
  // })
  //
  // if(!session) {
  //   return NextResponse.redirect(new URL("/auth/login", request.url));
  // }

  return NextResponse.next({ headers });
}

export const config = {
  //runtime: "nodejs",
  //matcher: ["/fnord"], // Apply middleware to specific routes
};