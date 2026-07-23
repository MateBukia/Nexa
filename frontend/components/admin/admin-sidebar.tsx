import Link from "next/link";

const links = [
  { href: "/admin", label: "Overview", glyph: "◫" },
  { href: "/admin/products", label: "Products", glyph: "◇" },
  { href: "/admin/categories", label: "Categories", glyph: "⌘" },
  { href: "/admin/inventory", label: "Inventory", glyph: "▤" },
  { href: "/admin/orders", label: "Orders", glyph: "◎" },
  { href: "/admin/support", label: "Support", glyph: "◌" },
  { href: "/admin/ai", label: "AI tools", glyph: "AI" },
];

export function AdminSidebar({
  canManageCatalog,
}: {
  canManageCatalog: boolean;
}) {
  const visibleLinks = canManageCatalog
    ? links
    : links.filter((link) =>
        ["/admin/support", "/admin/ai"].includes(link.href),
      );
  return (
    <aside className="border-b border-slate-800 bg-slate-950 text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:border-b-0 lg:border-r">
      <div className="flex h-18 items-center justify-between px-6 lg:h-20">
        <Link className="text-xl font-bold tracking-[-0.04em]" href="/admin">
          NEXA<span className="text-emerald-400">/</span>
          <span className="ml-2 text-xs font-medium tracking-normal text-slate-500">
            ADMIN
          </span>
        </Link>
        <Link
          className="text-xs text-slate-400 hover:text-white lg:hidden"
          href="/"
        >
          Store ↗
        </Link>
      </div>
      <nav
        className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:px-4 lg:pt-5"
        aria-label="Admin navigation"
      >
        {visibleLinks.map((link) => (
          <Link
            className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            href={link.href}
            key={link.href}
          >
            <span className="w-5 text-center text-slate-500">{link.glyph}</span>
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="absolute bottom-6 left-4 right-4 hidden lg:block">
        <Link
          className="block rounded-xl border border-slate-800 px-4 py-3 text-sm text-slate-400 transition hover:border-slate-600 hover:text-white"
          href="/"
        >
          View storefront ↗
        </Link>
      </div>
    </aside>
  );
}
