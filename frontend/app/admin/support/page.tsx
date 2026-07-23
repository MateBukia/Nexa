import { PageHeading } from "@/components/admin/page-heading";
import { SupportInbox } from "@/components/admin/support-inbox";

export default function AdminSupportPage() {
  return (
    <main className="p-5 sm:p-8 lg:p-10">
      <PageHeading
        description="Review customer conversations, claim tickets, and coordinate resolution."
        eyebrow="Customer care"
        title="Support inbox"
      />
      <div className="mt-8">
        <SupportInbox />
      </div>
    </main>
  );
}
