import { PageHeading } from "@/components/admin/page-heading";
import { ProductForm } from "@/components/admin/product-form";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="p-5 sm:p-8 lg:p-10">
      <PageHeading
        description="Update storefront content and product visibility."
        eyebrow="Catalog"
        title="Edit product"
      />
      <div className="mt-8 max-w-4xl">
        <ProductForm productId={id} />
      </div>
    </main>
  );
}
