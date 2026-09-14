import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import KcdaDashboard from "@/components/KcdaDashboard";

export default async function DashboardPage() { const session = await getSession(); if (!session) redirect("/login"); return <KcdaDashboard username={session.username} />; }
