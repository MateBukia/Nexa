import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { getCurrentUser } from "@/lib/server-auth";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  const canManageCatalog = user.roles.includes("admin");
  if (!canManageCatalog && !user.roles.includes("support_agent")) redirect("/");

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <AdminSidebar canManageCatalog={canManageCatalog} />
      <div className="lg:pl-64">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8 lg:h-20">
          <p className="text-sm text-slate-500">Store operations</p>
          <div className="text-right">
            <p className="text-sm font-semibold">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-slate-500">
              {canManageCatalog ? "Administrator" : "Support agent"}
            </p>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
