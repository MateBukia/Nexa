"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { AuthSession } from "@/types/auth";
import { useTranslations } from "@/components/i18n/i18n-provider";

interface AuthFormProps {
  mode: "login" | "register";
  redirectTo?: string;
}

const inputClassName =
  "mt-2 w-full rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/10";

export function AuthForm({ mode, redirectTo = "/" }: AuthFormProps) {
  const router = useRouter();
  const { t } = useTranslations();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      await apiRequest<AuthSession>(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      router.push(redirectTo);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : t("auth.error"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {mode === "register" && (
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm text-slate-300">
            {t("auth.firstName")}
            <input
              className={inputClassName}
              name="firstName"
              autoComplete="given-name"
              required
            />
          </label>
          <label className="text-sm text-slate-300">
            {t("auth.lastName")}
            <input
              className={inputClassName}
              name="lastName"
              autoComplete="family-name"
              required
            />
          </label>
        </div>
      )}

      <label className="block text-sm text-slate-300">
        {t("auth.email")}
        <input
          className={inputClassName}
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </label>

      <label className="block text-sm text-slate-300">
        {t("auth.password")}
        <input
          className={inputClassName}
          name="password"
          type="password"
          minLength={8}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
        />
      </label>

      {error && (
        <p
          className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
          role="alert"
        >
          {error}
        </p>
      )}

      <button
        className="w-full rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting
          ? t("auth.wait")
          : mode === "login"
            ? t("auth.signIn")
            : t("auth.create")}
      </button>
    </form>
  );
}
