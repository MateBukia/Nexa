import { CartView } from "@/components/cart/cart-view";
import { StorefrontShell } from "@/components/storefront/storefront-shell";

export default function CartPage() {
  return (
    <StorefrontShell>
      <main className="mx-auto min-h-[70vh] max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
          Your selection
        </p>
        <h1 className="mt-3 text-5xl font-semibold tracking-tighter">
          Shopping cart
        </h1>
        <div className="mt-10">
          <CartView />
        </div>
      </main>
    </StorefrontShell>
  );
}
