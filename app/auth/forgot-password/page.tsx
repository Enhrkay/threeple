import Link from "next/link";

import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function Page() {
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

            <span className="text-xl font-black tracking-[-0.04em]">
              Threeple
            </span>
          </Link>

          <Link
            href="/auth/login"
            className="text-sm font-bold text-[var(--tp-primary)] transition hover:text-[var(--tp-primary-hover)]"
          >
            Back to sign in
          </Link>
        </div>
      </nav>

      <section className="flex min-h-[calc(100vh-81px)] items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-md rounded-[1.75rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] p-6 shadow-[var(--tp-shadow-md)] sm:p-8">
          <ForgotPasswordForm />
        </div>
      </section>
    </main>
  );
}
