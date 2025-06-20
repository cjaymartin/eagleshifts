import {
  createAuthClient
} from "better-auth/react";
import {
  magicLinkClient,
} from "better-auth/client/plugins";
import { organizationClient } from "better-auth/client/plugins"

import path from "path-browserify";

console.log("Auth client base URL:", process.env.NEXT_PUBLIC_APP_URL);

export const authClient = createAuthClient({
  //baseURL: process.env.NEXT_PUBLIC_APP_URL,
  //basePath: path.join(process.env.NEXT_PUBLIC_APP_URL ?? "", "/auth/api"),
  plugins: [magicLinkClient(), organizationClient() ],
  fetchOptions: {
    credentials: "include"
  }
})

export const {
  signIn,
  signOut,
  signUp,
  useSession
} = authClient;