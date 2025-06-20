import {headers} from "next/headers";
import SubdomainProviderClient from "@/components/providers/SubdomainProviderClient";

export default async function SubdomainProvider({children} : { children: React.ReactNode }) {
  const headerList = await headers();
  const subdomain = headerList.get('x-subdomain') || null;

  return <SubdomainProviderClient
  subdomain={subdomain}
  >{children}</SubdomainProviderClient>

}
