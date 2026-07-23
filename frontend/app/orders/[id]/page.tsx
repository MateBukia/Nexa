import Link from "next/link";
import { OrderDetail } from "@/components/orders/order-detail";
import { StorefrontShell } from "@/components/storefront/storefront-shell";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <StorefrontShell>
      <main className="mx-auto min-h-[70vh] max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <Link className="text-sm font-semibold text-emerald-700" href="/orders">
          ← Order history
        </Link>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-0.045em]">
          Order details
        </h1>
        <div className="mt-8">
          <OrderDetail orderId={id} />
        </div>
      </main>
    </StorefrontShell>
  );
}
