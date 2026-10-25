import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--tp-bg)] px-5 py-12">
      <section className="w-full max-w-xl rounded-[var(--tp-radius-xl)] border border-[var(--tp-border)] bg-[var(--tp-surface)] p-8 text-center shadow-[var(--tp-shadow-md)] sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--tp-primary-soft)] text-lg font-black text-[var(--tp-primary)]">
          404
        </div>

        <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-[var(--tp-faint)]">
          Page not found
        </p>

        <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[var(--tp-ink)] sm:text-4xl">
          We couldn&apos;t find that page.
        </h1>

        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[var(--tp-muted)] sm:text-base">
          The page may have moved, the link may be incorrect, or the resource
          may no longer be available.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="tp-btn tp-btn-primary inline-flex items-center justify-center px-5"
          >
            Go to dashboard
          </Link>

          <Link
            href="/"
            className="tp-btn tp-btn-secondary inline-flex items-center justify-center px-5"
          >
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}