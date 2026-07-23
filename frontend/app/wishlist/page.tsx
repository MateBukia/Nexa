import { StorefrontShell } from "@/components/storefront/storefront-shell";
import { WishlistView } from "@/components/wishlist/wishlist-view";

export default function WishlistPage() {
  return (
    <StorefrontShell>
      <main className="mx-auto min-h-[70vh] max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
          Saved for later
        </p>
        <h1 className="mt-3 text-5xl font-semibold tracking-[-0.05em]">
          Your wishlist
        </h1>
        <div className="mt-10">
          <WishlistView />
        </div>
      </main>
    </StorefrontShell>
  );
}
