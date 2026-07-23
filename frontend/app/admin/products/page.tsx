import { PageHeading } from "@/components/admin/page-heading";
import { ProductsTable } from "@/components/admin/products-table";

export default function AdminProductsPage() {
  return (
    <main className="p-5 sm:p-8 lg:p-10">
      <PageHeading
        action={{ href: "/admin/products/new", label: "Add product" }}
        description="Create, review, and archive storefront catalog entries."
        eyebrow="Catalog"
        title="Products"
      />
      <div className="mt-8">
        <ProductsTable />
      </div>
    </main>
  );
}
