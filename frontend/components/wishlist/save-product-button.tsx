"use client";

import Link from "next/link";
import { useState } from "react";
import { wishlistApi } from "@/lib/wishlist-api";

export function SaveProductButton({ productId }: { productId: string }) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setStatus("saving");
    setError(null);
    try {
      await wishlistApi.add(productId);
      setStatus("saved");
    } catch (caught) {
      setStatus("idle");
      setError(
        caught instanceof Error ? caught.message : "Unable to save product.",
      );
    }
  }

  return (
    <div className="mt-3">
      <button
        className="w-full rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold transition hover:border-slate-950 disabled:opacity-60"
        disabled={status !== "idle"}
        onClick={save}
        type="button"
      >
        {status === "saving"
          ? "Saving…"
          : status === "saved"
            ? "Saved to wishlist"
            : "Save for later"}
      </button>
      {status === "saved" && (
        <Link
          className="mt-2 block text-center text-xs font-semibold text-emerald-700"
          href="/wishlist"
        >
          View wishlist →
        </Link>
      )}
      {error && (
        <p className="mt-2 text-sm text-rose-700">
          {error}{" "}
          <Link className="font-semibold underline" href="/login">
            Sign in
          </Link>
        </p>
      )}
    </div>
  );
}
