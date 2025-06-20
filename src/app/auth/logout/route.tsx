import { auth } from "@/lib/auth";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {headers} from "next/headers";

export async function GET() {
  await auth.api.signOut({
    headers: await headers()
  });
  revalidatePath("/", "layout");
  return redirect('/');
}