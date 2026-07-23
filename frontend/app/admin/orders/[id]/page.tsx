import { AdminOrderDetail } from "@/components/admin/admin-order-detail";
import { PageHeading } from "@/components/admin/page-heading";

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="p-5 sm:p-8 lg:p-10">
      <PageHeading
        description="Inspect fulfillment details and update the customer-visible order status."
        eyebrow="Orders"
        title="Manage order"
      />
      <div className="mt-8">
        <AdminOrderDetail orderId={id} />
      </div>
    </main>
  );
}
