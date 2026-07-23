"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useTranslations } from "@/components/i18n/i18n-provider";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  alternateText: string;
  alternateHref: string;
  alternateLabel: string;
  children: ReactNode;
}

export function AuthShell({
  eyebrow,
  title,
  description,
  alternateText,
  alternateHref,
  alternateLabel,
  children,
}: AuthShellProps) {
  const { t } = useTranslations();
  return (
    <main className="grid min-h-screen bg-[#07111f] text-[#edf4ff] lg:grid-cols-[0.9fr_1.1fr]">
      <section className="hidden border-r border-white/10 bg-white/2.5 p-12 lg:flex lg:flex-col lg:justify-between">
        <Link className="text-lg font-semibold tracking-tight" href="/">
          Nexa Commerce
        </Link>
        <div className="max-w-lg">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-cyan-300">
            {t("auth.connected")}
          </p>
          <h2 className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.035em]">
            {t("auth.promise")}
          </h2>
          <p className="mt-5 leading-7 text-slate-400">
            {t("auth.connectedCopy")}
          </p>
        </div>
        <p className="text-sm text-slate-500">{t("auth.secure")}</p>
      </section>

      <section className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-end">
            <LanguageSwitcher dark />
          </div>
          <Link
            className="mb-12 inline-block text-lg font-semibold lg:hidden"
            href="/"
          >
            Nexa Commerce
          </Link>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-300">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.035em]">
            {title}
          </h1>
          <p className="mt-3 leading-7 text-slate-400">{description}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-7 text-sm text-slate-400">
            {alternateText}{" "}
            <Link
              className="font-medium text-cyan-300 hover:text-cyan-200"
              href={alternateHref}
            >
              {alternateLabel}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
