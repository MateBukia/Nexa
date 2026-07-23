import { OrdersList } from "@/components/orders/orders-list";
import { StorefrontShell } from "@/components/storefront/storefront-shell";

export default function OrdersPage() {
  return (
    <StorefrontShell>
      <main className="mx-auto min-h-[70vh] max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
          Your account
        </p>
        <h1 className="mt-3 text-5xl font-semibold tracking-[-0.05em]">
          Order history
        </h1>
        <div className="mt-10">
          <OrdersList />
        </div>
      </main>
    </StorefrontShell>
  );
}
