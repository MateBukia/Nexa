import { AiWorkbench } from "@/components/admin/ai-workbench";
import { PageHeading } from "@/components/admin/page-heading";
import { getCurrentUser } from "@/lib/server-auth";

export default async function AdminAiPage() {
  const user = await getCurrentUser();
  return (
    <main className="p-5 sm:p-8">
      <PageHeading
        eyebrow="Grounded helpers"
        title="AI tools"
        description="Generate drafts and summaries from real store data. Review all output before publishing or sending."
      />
      <div className="mt-8">
        <AiWorkbench isAdmin={Boolean(user?.roles.includes("admin"))} />
      </div>
    </main>
  );
}
