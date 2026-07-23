import { CategoryManager } from "@/components/admin/category-manager";
import { PageHeading } from "@/components/admin/page-heading";

export default function AdminCategoriesPage() {
  return (
    <main className="p-5 sm:p-8 lg:p-10">
      <PageHeading
        description="Organize the storefront taxonomy and control category visibility."
        eyebrow="Catalog"
        title="Categories"
      />
      <div className="mt-8">
        <CategoryManager />
      </div>
    </main>
  );
}
