"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { reviewApi } from "@/lib/review-api";
import type { ReviewListResponse } from "@/types/review";

export function ReviewSection({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<ReviewListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const load = useCallback(
    () =>
      reviewApi
        .list(productId)
        .then(setReviews)
        .catch((caught: unknown) =>
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load reviews.",
          ),
        ),
    [productId],
  );
  useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await reviewApi.create(productId, {
        rating: Number(data.get("rating")),
        title: String(data.get("title") ?? "").trim() || undefined,
        body: String(data.get("body")).trim(),
      });
      form.reset();
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to submit review.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-20 border-t border-slate-200 pt-14">
      <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
            Customer feedback
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.045em]">
            Reviews
          </h2>
          {reviews && (
            <div className="mt-6">
              <p className="text-5xl font-semibold">
                {reviews.summary.average?.toFixed(1) ?? "—"}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {reviews.summary.count} published reviews
              </p>
            </div>
          )}
          <form
            className="mt-8 space-y-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200"
            onSubmit={submit}
          >
            <h3 className="font-semibold">Share your experience</h3>
            <label className="block text-sm">
              Rating
              <select
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                defaultValue="5"
                name="rating"
              >
                <option value="5">★★★★★</option>
                <option value="4">★★★★☆</option>
                <option value="3">★★★☆☆</option>
                <option value="2">★★☆☆☆</option>
                <option value="1">★☆☆☆☆</option>
              </select>
            </label>
            <label className="block text-sm">
              Title
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                maxLength={120}
                name="title"
              />
            </label>
            <label className="block text-sm">
              Review
              <textarea
                className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                minLength={10}
                name="body"
                required
              />
            </label>
            {error && (
              <p className="text-sm text-rose-700">
                {error}{" "}
                <Link className="font-semibold underline" href="/login">
                  Sign in
                </Link>
              </p>
            )}
            <button
              className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Publishing…" : "Publish review"}
            </button>
          </form>
        </div>
        <div className="space-y-4">
          {!reviews ? (
            <div className="h-60 animate-pulse rounded-2xl bg-white" />
          ) : reviews.items.length ? (
            reviews.items.map((review) => (
              <article
                className="rounded-2xl border border-slate-200 bg-white p-6"
                key={review.id}
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-semibold">
                    {review.user.firstName} {review.user.lastInitial}.
                  </p>
                  <p className="text-amber-500">
                    {"★".repeat(review.rating)}
                    <span className="text-slate-200">
                      {"★".repeat(5 - review.rating)}
                    </span>
                  </p>
                </div>
                {review.isVerifiedPurchase && (
                  <p className="mt-2 text-xs font-semibold text-emerald-700">
                    Verified purchase
                  </p>
                )}
                {review.title && (
                  <h3 className="mt-4 font-semibold">{review.title}</h3>
                )}
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {review.body}
                </p>
                <p className="mt-4 text-xs text-slate-400">
                  {new Date(review.createdAt).toLocaleDateString()}
                </p>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
              No reviews yet. Be the first to share an experience.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
