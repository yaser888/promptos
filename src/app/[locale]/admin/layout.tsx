import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server-auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { TopBar } from "@/components/layout/top-bar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session.user) {
    redirect("/sign-in");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-surface">
      <AdminSidebar />
      <div className="lg:ps-64 flex flex-col min-h-screen">
        <TopBar />
        <main className="p-6 lg:p-8 flex-1">{children}</main>
      </div>
    </div>
  );
}
