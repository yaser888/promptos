import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server-auth";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { TopBar } from "@/components/layout/top-bar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session.user) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-surface">
      <DashboardSidebar />
      <div className="lg:ps-64 flex flex-col min-h-screen">
        <TopBar showDashboardLink />
        <main className="p-6 lg:p-8 flex-1">{children}</main>
      </div>
    </div>
  );
}
