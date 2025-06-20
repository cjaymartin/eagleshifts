import {auth} from "@/lib/auth";
import {headers} from "next/headers";
import {redirect} from "next/navigation";

export default async function SuperadminLayout({children} : { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers() // you need to pass the headers object.
  });

  //VERY TEMPORARY HACK
  const isGod = session?.user?.email === "cjay.martin@gmail.com";

  console.log("ARE YOU A GOD? ", isGod ? "Yes, les I am" : "No, I am not");
  if(!isGod) {
    return redirect("/");
  }

  return <>
    {children}
  </>
}