"use client";
import { createContext, useContext, useState} from "react";

const SubdomainContext = createContext<string | null>(null);

export default function SubdomainProviderClient({
  children,
  subdomain,
}: {
  children: React.ReactNode;
  subdomain: string | null;
}) {

  return <SubdomainContext.Provider value={subdomain}>{children}</SubdomainContext.Provider>;
}

export function useSubdomainContext() {
  const context = useContext(SubdomainContext);
  if (context === undefined) {
    throw new Error("useSubdomain must be used within a SubdomainProviderClient");
  }
  return context;
}