import Link from "next/link";
import { UserMenu } from "@/components/auth/user-menu";
import { getCurrentUser } from "@/lib/server-auth";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { getTranslations } from "@/lib/i18n/server";

export async function SiteHeader() {
  const [user, { t }] = await Promise.all([
    getCurrentUser(),
    getTranslations(),
  ]);
  const navigation = [
    { href: "/products", label: t("nav.shop") },
    { href: "/products?sort=newest", label: t("nav.new") },
    { href: "/products?sort=price_asc", label: t("nav.discover") },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#f7f7f2]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
        <Link
          className="text-xl font-bold tracking-[-0.04em] text-slate-950"
          href="/"
        >
          NEXA<span className="text-emerald-600">/</span>
        </Link>

        <nav
          className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex"
          aria-label="Main navigation"
        >
          {navigation.map((item) => (
            <Link
              className="transition hover:text-slate-950"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            className="text-sm font-medium text-slate-600 hover:text-slate-950"
            href="/cart"
          >
            {t("nav.cart")}
          </Link>
          <Link
            className="hidden text-sm font-medium text-slate-600 hover:text-slate-950 sm:block"
            href="/orders"
          >
            {t("nav.orders")}
          </Link>
          <Link
            className="hidden text-sm font-medium text-slate-600 hover:text-slate-950 md:block"
            href="/wishlist"
          >
            {t("nav.wishlist")}
          </Link>
          {user ? (
            <UserMenu user={user} />
          ) : (
            <>
              <Link
                className="hidden text-sm font-medium text-slate-600 hover:text-slate-950 sm:block"
                href="/login"
              >
                {t("nav.signIn")}
              </Link>
              <Link
                className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                href="/register"
              >
                {t("nav.join")}
              </Link>
            </>
          )}
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
