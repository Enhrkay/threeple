import Link from "next/link";

const features = [
  {
    title: "Create",
    description:
      "Set up a contribution, define the rules and invite your group.",
  },
  {
    title: "Contribute",
    description:
      "Members join, pay and keep up with what is due and what is complete.",
  },
  {
    title: "Track",
    description:
      "Everyone sees progress clearly while organizers stay in control.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--tp-bg)] text-[var(--tp-ink)]">
      {/* NAV */}
      <nav className="border-b border-[var(--tp-border)] bg-[var(--tp-surface)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--tp-primary)] text-sm font-black text-white shadow-[0_8px_24px_rgba(47,125,101,0.16)]">
              T
            </span>

            <span className="text-xl font-black tracking-[-0.04em] text-[var(--tp-ink)]">
              Threeple
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/auth/login"
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--tp-ink-soft)] transition hover:bg-[var(--tp-bg-soft)] hover:text-[var(--tp-ink)]"
            >
              Sign in
            </Link>

            <Link
              href="/auth/sign-up"
              className="rounded-xl bg-[var(--tp-primary)] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--tp-primary-hover)]"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <div className="overflow-hidden rounded-[2rem] bg-[var(--tp-primary)]">
          <div className="grid gap-10 px-6 py-10 sm:px-10 sm:py-14 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:px-14 lg:py-16">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/65">
                Group contributions, simplified
              </p>

              <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.05em] text-white sm:text-5xl lg:text-6xl">
                Money together.
                <br />
                Clear from start to finish.
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-white/72 sm:text-lg">
                Threeple helps groups organize
                contributions, track payments,
                manage Ajo cycles and keep
                everyone aligned.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/auth/sign-up"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-6 text-sm font-bold text-[var(--tp-primary)] transition hover:bg-white/92"
                >
                  Get started
                </Link>

                <Link
                  href="/join"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/25 bg-white/8 px-6 text-sm font-bold text-white transition hover:bg-white/14"
                >
                  Join a collection
                </Link>
              </div>

              <p className="mt-5 text-xs font-medium text-white/55">
                Simple for organizers.
                Clear for participants.
              </p>
            </div>

            {/* PRODUCT PREVIEW */}
            <div className="rounded-[1.75rem] bg-white p-5 shadow-[0_24px_70px_rgba(0,0,0,0.12)] sm:p-6">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--tp-muted)]">
                    Collection
                  </p>

                  <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-[var(--tp-ink)]">
                    October Contribution
                  </h2>
                </div>

                <span className="rounded-full border border-[var(--tp-success-border)] bg-[var(--tp-success-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--tp-success)]">
                  Active
                </span>
              </div>

              <div className="mt-8">
                <p className="text-sm text-[var(--tp-muted)]">
                  Collected
                </p>

                <div className="mt-2 flex flex-wrap items-end gap-x-2 gap-y-1">
                  <span className="text-4xl font-black tracking-[-0.045em] text-[var(--tp-ink)] sm:text-5xl">
                    ₦720,000
                  </span>

                  <span className="pb-1 text-sm text-[var(--tp-muted)]">
                    of ₦1,000,000
                  </span>
                </div>
              </div>

              <div className="mt-6 h-2 overflow-hidden rounded-full bg-[var(--tp-primary-soft)]">
                <div className="h-full w-[72%] rounded-full bg-[var(--tp-primary)]" />
              </div>

              <div className="mt-8 grid grid-cols-3 divide-x divide-[var(--tp-border)] border-y border-[var(--tp-border)] py-5">
                <div className="px-2 first:pl-0">
                  <p className="text-xs text-[var(--tp-muted)]">
                    Members
                  </p>
                  <p className="mt-1 text-xl font-black text-[var(--tp-ink)]">
                    20
                  </p>
                </div>

                <div className="px-4">
                  <p className="text-xs text-[var(--tp-muted)]">
                    Paid
                  </p>
                  <p className="mt-1 text-xl font-black text-[var(--tp-ink)]">
                    14
                  </p>
                </div>

                <div className="px-4">
                  <p className="text-xs text-[var(--tp-muted)]">
                    Pending
                  </p>
                  <p className="mt-1 text-xl font-black text-[var(--tp-ink)]">
                    6
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-4">
                <span className="text-xs font-semibold text-[var(--tp-muted)]">
                  72% complete
                </span>

                <span className="text-sm font-bold text-[var(--tp-primary)]">
                  View collection →
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--tp-primary)]">
            How it works
          </p>

          <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[var(--tp-ink)] sm:text-4xl">
            Simple enough for the whole group.
          </h2>

          <p className="mt-4 text-base leading-7 text-[var(--tp-muted)]">
            No complicated workflow.
            Create, contribute and keep
            progress visible.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {features.map(
            (feature, index) => (
              <div
                key={feature.title}
                className="rounded-[1.5rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] p-6 shadow-[var(--tp-shadow-sm)]"
              >
                <span className="text-xs font-black text-[var(--tp-primary)]">
                  0{index + 1}
                </span>

                <h3 className="mt-5 text-xl font-black tracking-[-0.03em] text-[var(--tp-ink)]">
                  {feature.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-[var(--tp-muted)]">
                  {feature.description}
                </p>
              </div>
            )
          )}
        </div>
      </section>

      {/* TRUST MESSAGE */}
      <section className="border-y border-[var(--tp-border)] bg-[var(--tp-surface)]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-6 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-8 lg:py-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--tp-primary)]">
              Built for clarity
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[var(--tp-ink)]">
              Everyone should know
              what is happening with
              the money.
            </h2>
          </div>

          <p className="text-base leading-8 text-[var(--tp-muted)]">
            Threeple keeps contribution
            activity, participant progress
            and collection status in one
            place, so organizers and
            members are working from the
            same information.
          </p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="flex flex-col gap-8 rounded-[2rem] border border-[var(--tp-primary-border)] bg-[var(--tp-primary-soft)] px-6 py-9 sm:px-10 sm:py-11 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-[-0.035em] text-[var(--tp-ink)] sm:text-3xl">
              Start your next collection
              with clarity.
            </h2>

            <p className="mt-3 text-sm leading-7 text-[var(--tp-muted)] sm:text-base">
              Create your account and
              bring your group together
              on Threeple.
            </p>
          </div>

          <Link
            href="/auth/sign-up"
            className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-[var(--tp-primary)] px-6 text-sm font-bold text-white transition hover:bg-[var(--tp-primary-hover)]"
          >
            Create account
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[var(--tp-border)] bg-[var(--tp-surface)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-[var(--tp-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© 2026 Threeple</p>
          <p>
            Contributions, clearly managed.
          </p>
        </div>
      </footer>
    </main>
  );
}
