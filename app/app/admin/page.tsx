import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";

export default async function BandosAdminPage() {
  const session = await getSessionUser();

  if (!session?.isBandosAdmin) {
    redirect("/app");
  }

  redirect("/bandos-admin");
}
