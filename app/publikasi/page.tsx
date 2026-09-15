import { redirect } from "next/navigation";
import KcdaDashboard from "@/components/KcdaDashboard";
import { getSession } from "@/lib/auth";

export default async function PublicationPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <KcdaDashboard username={session.username} initialScreen="publication" />
  );
}
