import { SupportAssistant } from "@/components/ai/support-assistant";
import { StorefrontShell } from "@/components/storefront/storefront-shell";
import { SupportHub } from "@/components/support/support-hub";

export default function SupportPage() {
  return (
    <StorefrontShell>
      <main className="mx-auto min-h-[70vh] max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
          We&apos;re here to help
        </p>
        <h1 className="mt-3 text-5xl font-semibold tracking-tighter">
          Customer support
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-slate-600">
          Get immediate account-aware help, or create a ticket and keep the
          conversation in one place.
        </p>
        <div className="mt-10">
          <SupportAssistant />
        </div>
        <div className="mt-10">
          <SupportHub />
        </div>
      </main>
    </StorefrontShell>
  );
}
