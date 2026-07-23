import { InventoryManager } from "@/components/admin/inventory-manager";
import { PageHeading } from "@/components/admin/page-heading";

export default function AdminInventoryPage() {
  return (
    <main className="p-5 sm:p-8 lg:p-10">
      <PageHeading
        description="Manage product options, pricing, available units, and low-stock thresholds."
        eyebrow="Operations"
        title="Inventory"
      />
      <div className="mt-8">
        <InventoryManager />
      </div>
    </main>
  );
}
