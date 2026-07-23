import { AdminOrders } from "@/components/admin/admin-orders";
import { PageHeading } from "@/components/admin/page-heading";

export default function AdminOrdersPage() {
  return (
    <main className="p-5 sm:p-8 lg:p-10">
      <PageHeading
        description="Review incoming purchases and move them through fulfillment."
        eyebrow="Operations"
        title="Orders"
      />
      <div className="mt-8">
        <AdminOrders />
      </div>
    </main>
  );
}
