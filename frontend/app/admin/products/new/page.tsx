import { PageHeading } from "@/components/admin/page-heading";
import { ProductForm } from "@/components/admin/product-form";

export default function NewProductPage() {
  return (
    <main className="p-5 sm:p-8 lg:p-10">
      <PageHeading
        description="Add product content, a storefront image, and the initial stock-keeping variant."
        eyebrow="Catalog"
        title="New product"
      />
      <div className="mt-8 max-w-4xl">
        <ProductForm />
      </div>
    </main>
  );
}
