"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n/messages";
import { useTranslations } from "./i18n-provider";

const options: { value: Locale; short: string; label: string }[] = [
  { value: "en", short: "EN", label: "English" },
  { value: "ka", short: "KA", label: "ქართული" },
];

export function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  const router = useRouter();
  const { locale, t } = useTranslations();
  const [working, setWorking] = useState(false);

  async function change(next: Locale) {
    if (next === locale || working) return;
    setWorking(true);
    try {
      const response = await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
      if (!response.ok) throw new Error("Unable to change language.");
      router.refresh();
    } finally {
      setWorking(false);
    }
  }

  return (
    <div
      aria-label={t("language.label")}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border p-1 shadow-sm ${
        dark
          ? "border-white/15 bg-white/8"
          : "border-slate-200 bg-white/90"
      }`}
      role="group"
    >
      <span
        className={`grid size-7 place-items-center rounded-full ${
          dark ? "text-cyan-300" : "text-emerald-700"
        }`}
        aria-hidden="true"
      >
        <svg
          className="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
      </span>

      {options.map((option) => {
        const active = option.value === locale;
        return (
          <button
            aria-pressed={active}
            className={`rounded-full px-2.5 py-1.5 text-xs font-bold transition sm:px-3 ${
              active
                ? dark
                  ? "bg-cyan-300 text-slate-950 shadow-sm"
                  : "bg-slate-950 text-white shadow-sm"
                : dark
                  ? "text-slate-300 hover:bg-white/10 hover:text-white"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
            } disabled:cursor-wait disabled:opacity-60`}
            disabled={working}
            key={option.value}
            onClick={() => void change(option.value)}
            title={option.label}
            type="button"
          >
            <span className="sm:hidden">{option.short}</span>
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
