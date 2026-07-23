import Link from "next/link";
import { StorefrontShell } from "@/components/storefront/storefront-shell";
import { TicketConversation } from "@/components/support/ticket-conversation";

export default async function SupportTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <StorefrontShell>
      <main className="mx-auto min-h-[70vh] max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <Link
          className="text-sm font-semibold text-emerald-700"
          href="/support"
        >
          ← Support center
        </Link>
        <div className="mt-7">
          <TicketConversation ticketId={id} />
        </div>
      </main>
    </StorefrontShell>
  );
}
