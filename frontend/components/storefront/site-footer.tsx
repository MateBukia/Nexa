import Link from "next/link";
import { getTranslations } from "@/lib/i18n/server";

export async function SiteFooter() {
  const { t } = await getTranslations();
  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-xl font-bold tracking-[-0.04em]">NEXA/</p>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
            {t("footer.copy")}
          </p>
        </div>
        <div className="flex flex-wrap gap-6 text-sm text-slate-400">
          <Link className="hover:text-white" href="/products">
            {t("footer.products")}
          </Link>
          <Link className="hover:text-white" href="/login">
            {t("footer.account")}
          </Link>
          <Link className="hover:text-white" href="/support">
            {t("footer.support")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
