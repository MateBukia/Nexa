import { PageHeading } from "@/components/admin/page-heading";
import { TicketConversation } from "@/components/support/ticket-conversation";

export default async function AdminSupportTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="p-5 sm:p-8 lg:p-10">
      <PageHeading
        description="Reply to the customer, add private context, assign ownership, and update status."
        eyebrow="Support"
        title="Ticket conversation"
      />
      <div className="mt-8">
        <TicketConversation staff ticketId={id} />
      </div>
    </main>
  );
}
