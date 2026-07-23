import { CheckoutForm } from "@/components/checkout/checkout-form";
import { StorefrontShell } from "@/components/storefront/storefront-shell";

export default function CheckoutPage() {
  return (
    <StorefrontShell>
      <main className="mx-auto min-h-[70vh] max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
          Secure checkout
        </p>
        <h1 className="mt-3 text-5xl font-semibold tracking-[-0.05em]">
          Delivery details
        </h1>
        <div className="mt-10">
          <CheckoutForm />
        </div>
      </main>
    </StorefrontShell>
  );
}
