import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-[var(--tp-bg)] px-4 py-10 text-[var(--tp-ink)] sm:px-6">
      <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
        <section className="tp-card w-full p-6 text-center sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--tp-warning-soft)] text-xl font-black text-[var(--tp-warning)]">
            â†“
          </div>

          <p className="tp-kicker mt-6">
            Offline
          </p>

          <h1 className="tp-heading mt-2 text-3xl">
            You&apos;re working without internet.
          </h1>

          <p className="tp-body mt-3 text-sm leading-7">
            Previously opened Collector Mode screens may still be available. You can also keep field contributions on this device and sync them once connectivity returns.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href="/collector"
              className="tp-btn tp-btn-primary"
            >
              Open Collector Mode
            </Link>

            <Link
              href="/collector/offline-queue"
              className="tp-btn tp-btn-secondary"
            >
              Offline Queue
            </Link>
          </div>

          <p className="mt-6 text-xs leading-5 text-[var(--tp-muted)]">
            Electronic payment verification requires an internet connection.
          </p>
        </section>
      </div>
    </main>
  );
}



