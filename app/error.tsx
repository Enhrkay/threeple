"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--tp-bg)] px-5 py-12">
      <section className="w-full max-w-xl rounded-[var(--tp-radius-xl)] border border-[var(--tp-danger-border)] bg-[var(--tp-surface)] p-8 text-center shadow-[var(--tp-shadow-md)] sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--tp-danger-soft)] text-xl font-black text-[var(--tp-danger)]">
          !
        </div>

        <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-[var(--tp-danger)]">
          Something went wrong
        </p>

        <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[var(--tp-ink)] sm:text-4xl">
          We hit an unexpected problem.
        </h1>

        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[var(--tp-muted)] sm:text-base">
          Your data has not been intentionally changed. Try the action again,
          or return to the dashboard if the problem continues.
        </p>

        {error.digest ? (
          <p className="mt-4 text-xs text-[var(--tp-faint)]">
            Reference: {error.digest}
          </p>
        ) : null}

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="tp-btn tp-btn-primary inline-flex items-center justify-center px-5"
          >
            Try again
          </button>

          <Link
            href="/dashboard"
            className="tp-btn tp-btn-secondary inline-flex items-center justify-center px-5"
          >
            Go to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}