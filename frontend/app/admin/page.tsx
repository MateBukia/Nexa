import { AdminOverview } from "@/components/admin/admin-overview";
import { PageHeading } from "@/components/admin/page-heading";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server-auth";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (user?.roles.includes("support_agent") && !user.roles.includes("admin")) {
    redirect("/admin/support");
  }
  return (
    <main className="p-5 sm:p-8 lg:p-10">
      <PageHeading
        action={{ href: "/admin/products/new", label: "Add product" }}
        description="Sales, fulfillment, inventory, customers, and support health from live platform data."
        eyebrow="Dashboard"
        title="Store analytics"
      />
      <div className="mt-8">
        <AdminOverview />
      </div>
    </main>
  );
}
