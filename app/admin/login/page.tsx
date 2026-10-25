import Link from "next/link";
import { Suspense } from "react";

import { LoginForm } from "@/components/login-form";

export const instant = false;

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-[var(--tp-bg)] text-[var(--tp-ink)]">
      <nav className="border-b border-[var(--tp-border)] bg-[var(--tp-surface)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--tp-primary)] text-sm font-black text-white shadow-[0_8px_24px_rgba(47,125,101,0.16)]">
              T
            </span>

            <div>
              <p className="text-lg font-black tracking-[-0.04em]">
                Threeple
              </p>

              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--tp-faint)]">
                Administration
              </p>
            </div>
          </Link>

          <Link
            href="/"
            className="text-sm font-bold text-[var(--tp-muted)] transition hover:text-[var(--tp-primary)]"
          >
            Return to Threeple
          </Link>
        </div>
      </nav>

      <section className="mx-auto grid min-h-[calc(100vh-81px)] max-w-7xl lg:grid-cols-[0.95fr_1.05fr]">
        <div className="hidden p-8 lg:flex">
          <div className="flex w-full flex-col justify-between rounded-[2rem] bg-[var(--tp-primary)] p-10 text-white xl:p-12">
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">
                Admin Control Center
              </p>

              <h1 className="mt-5 text-5xl font-black leading-[1] tracking-[-0.05em]">
                Operate Threeple.
                <br />
                Clearly and securely.
              </h1>

              <p className="mt-6 max-w-lg text-base leading-8 text-white/70">
                Access platform operations, users, organizations, collections,
                Trust & Safety, restrictions and administrative oversight.
              </p>
            </div>

            <div className="space-y-2 text-sm text-white/55">
              <p>Authorized Threeple personnel only.</p>
              <p>Administrative actions are logged and traceable.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-5 py-12 sm:px-8 lg:px-12">
          <div className="w-full max-w-md">
            <div className="mb-5 rounded-2xl border border-[var(--tp-warning-border)] bg-[var(--tp-warning-soft)] px-4 py-3 text-sm leading-6 text-[var(--tp-warning)]">
              This portal is restricted to authorized Threeple administrators.
            </div>

            <div className="rounded-[1.75rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] p-6 shadow-[var(--tp-shadow-md)] sm:p-8">
              <Suspense
                fallback={
                  <div className="text-sm text-[var(--tp-muted)]">
                    Loading...
                  </div>
                }
              >
                <LoginForm
                  adminMode
                  defaultNext="/admin"
                />
              </Suspense>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}