import Link from "next/link";

interface PaginationProps {
  page: number;
  pages: number;
  pathname: string;
  params: Record<string, string | undefined>;
}

function pageHref(
  pathname: string,
  params: Record<string, string | undefined>,
  page: number,
) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value && key !== "page") search.set(key, value);
  });
  search.set("page", String(page));
  return `${pathname}?${search.toString()}`;
}

export function Pagination({ page, pages, pathname, params }: PaginationProps) {
  if (pages <= 1) return null;

  return (
    <nav
      className="mt-14 flex items-center justify-between border-t border-slate-200 pt-6"
      aria-label="Product pages"
    >
      {page > 1 ? (
        <Link
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold hover:border-slate-950"
          href={pageHref(pathname, params, page - 1)}
        >
          Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-slate-500">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold hover:border-slate-950"
          href={pageHref(pathname, params, page + 1)}
        >
          Next
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
