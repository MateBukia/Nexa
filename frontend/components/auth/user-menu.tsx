"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest } from "@/lib/api";
import type { AuthUser } from "@/types/auth";
import { useTranslations } from "@/components/i18n/i18n-provider";

export function UserMenu({ user }: { user: AuthUser }) {
  const router = useRouter();
  const { t } = useTranslations();
  const [loggingOut, setLoggingOut] = useState(false);
  const initials =
    `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
  const canAccessAdmin = user.roles.some((role) =>
    ["admin", "support_agent"].includes(role),
  );

  async function logout() {
    setLoggingOut(true);
    try {
      await apiRequest<void>("/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 shadow-sm transition hover:border-emerald-300 [&::-webkit-details-marker]:hidden">
        <span
          className="grid size-8 place-items-center rounded-full bg-emerald-600 text-xs font-bold text-white"
          aria-hidden="true"
        >
          {initials}
        </span>
        <span className="hidden max-w-28 truncate text-sm font-semibold sm:block">
          {user.firstName}
        </span>
        <svg
          className="size-3 text-slate-400 transition group-open:rotate-180"
          viewBox="0 0 12 8"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="m1 1.5 5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="sr-only">{t("account.open")}</span>
      </summary>
      <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-100 px-4 py-4">
          <p className="font-semibold">
            {user.firstName} {user.lastName}
          </p>
          <p className="mt-1 truncate text-xs text-slate-500">{user.email}</p>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            {t("account.signedIn")}
          </p>
        </div>
        <nav className="p-2 text-sm">
          <Link
            className="block rounded-xl px-3 py-2.5 hover:bg-slate-50"
            href="/orders"
          >
            {t("account.orders")}
          </Link>
          <Link
            className="block rounded-xl px-3 py-2.5 hover:bg-slate-50"
            href="/wishlist"
          >
            {t("account.wishlist")}
          </Link>
          <Link
            className="block rounded-xl px-3 py-2.5 hover:bg-slate-50"
            href="/support"
          >
            {t("account.support")}
          </Link>
          {canAccessAdmin && (
            <Link
              className="block rounded-xl px-3 py-2.5 font-semibold text-emerald-700 hover:bg-emerald-50"
              href="/admin"
            >
              {t("account.admin")}
            </Link>
          )}
        </nav>
        <div className="border-t border-slate-100 p-2">
          <button
            className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            disabled={loggingOut}
            onClick={() => void logout()}
            type="button"
          >
            {loggingOut ? t("account.signingOut") : t("account.signOut")}
          </button>
        </div>
      </div>
    </details>
  );
}
