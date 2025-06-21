"use client"

import {authClient} from "@/lib/auth-client";
import {usePathname} from "next/navigation";
import {useSubdomainContext} from "@/components/providers/SubdomainProviderClient";
import { useEffect } from "react";
import {useRouter} from "next/navigation";
import {useCookies} from "next-client-cookies";

export default function OrgChooser() {
  const session = authClient.useSession();
  if (!session) {
    return null; // or a loading state, or redirect to login
  }


  const { data: organizations } = authClient.useListOrganizations()
  const { data: currentOrganization } = authClient.useActiveOrganization()
  const subdomain = useSubdomainContext();
  const pathname = usePathname();
  const router = useRouter();
  const cookies = useCookies();

  const loginSubdomain = cookies.get("login-subdomain") || null;

  const isStrictOrg = subdomain && subdomain !== "www" && subdomain !== "localhost";
  //
  // useEffect(() => {
  //   if(isStrictOrg && currentOrganization) {
  //     const baseUrlStr = process.env.NEXT_PUBLIC_BASE_URL as string;
  //     const baseUrl = new URL(baseUrlStr);
  //
  //     const protocol = baseUrl.protocol;
  //     const host = baseUrl.host;
  //     const domainParts = host.split('.');
  //     //const basesubdomain = domainParts.length > 2 ? domainParts.slice(0, -2).join('.') : null;
  //     const domain = domainParts.length > 2 ? domainParts.slice(-2).join('.') : host;
  //
  //     if(loginSubdomain && loginSubdomain != subdomain) {
  //       const newUrl = `${protocol}${loginSubdomain}.${domain}`;
  //       router.push(newUrl);
  //     }
  //     else if(currentOrganization.slug !== subdomain) {
  //
  //       // the correct org subdomain is the the baseurl after any http(s)// but before the first letter
  //       // ...unless the baseurl has www.  if it does, leave out the www.
  //       const newUrl = `${protocol}${currentOrganization.slug}.${domain}`;
  //       router.push(newUrl);
  //
  //     }
  //   }
  // }, [subdomain, loginSubdomain, organizations, isStrictOrg, currentOrganization]);
  //
  //
  // useEffect(() => {
  //   if(isStrictOrg && !currentOrganization) {
  //     const org = organizations?.find(org => org.slug === subdomain);
  //     if(org) {
  //       authClient.organization.setActive({organizationSlug: org.slug});
  //     } else {
  //       // If the organization does not exist, you might want to redirect or show an error
  //       console.error(`Organization with slug ${subdomain} not found.`);
  //     }
  //   }
  // }, [subdomain, organizations, isStrictOrg, currentOrganization]);
  //
  // useEffect(() => {
  //
  // }, [subdomain, loginSubdomain, currentOrganization]);

  //const headerList = await headers();
  //const pathname = headerList.get("x-current-path");



  console.log({organizations, currentOrganization, pathname, subdomain})

  return <div>
    {currentOrganization ? currentOrganization.name : null}
  </div>

}