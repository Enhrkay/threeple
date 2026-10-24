import Link from "next/link";

const features = [
  {
    title: "Create a collection",
    description:
      "Set up a contribution goal, invite participants, and keep everything organized in one place.",
  },
  {
    title: "Track contributions",
    description:
      "See who has joined, what has been paid, what is outstanding, and how the collection is progressing.",
  },
  {
    title: "Get paid safely",
    description:
      "Payments are processed by Paystack and settled through the organizer's connected account. Threeple does not hold organizer funds.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#171717]">
      <nav className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-2xl font-black tracking-tight">
            Threeple
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="rounded-full px-4 py-2 text-sm font-semibold transition hover:bg-black/5"
            >
              Sign in
            </Link>
            <Link
              href="/auth/sign-up"
              className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-85"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-28">
        <div>
          <div className="mb-6 inline-flex rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold">
            Contributions, without the confusion.
          </div>

          <h1 className="max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
            Collect together.
            <br />
            Track everything.
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-black/65 sm:text-xl">
            Threeple helps groups organize collections, invite participants,
            track contributions, and manage payment progress from one simple
            dashboard.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/auth/sign-up"
              className="rounded-full bg-black px-7 py-4 text-center text-base font-bold text-white transition hover:opacity-85"
            >
              Create a collection
            </Link>
            <Link
              href="/join"
              className="rounded-full border border-black/15 bg-white px-7 py-4 text-center text-base font-bold transition hover:bg-black/5"
            >
              Join a collection
            </Link>
          </div>

          <p className="mt-5 text-sm text-black/45">
            Organizers create free. Participants join free.
          </p>
        </div>

        <div className="rounded-[2rem] border border-black/10 bg-black p-7 text-white shadow-2xl shadow-black/10 sm:p-9">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/55">Collection progress</p>
              <h2 className="mt-1 text-2xl font-bold">October Contribution</h2>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
              ACTIVE
            </span>
          </div>

          <div className="mt-10">
            <p className="text-sm text-white/50">Collected</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-5xl font-black tracking-tight">₦720,000</span>
              <span className="pb-1 text-sm text-white/45">of ₦1,000,000</span>
            </div>
          </div>

          <div className="mt-7 h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[72%] rounded-full bg-white" />
          </div>

          <div className="mt-9 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/8 p-4">
              <p className="text-xs text-white/45">Members</p>
              <p className="mt-2 text-2xl font-bold">20</p>
            </div>
            <div className="rounded-2xl bg-white/8 p-4">
              <p className="text-xs text-white/45">Paid</p>
              <p className="mt-2 text-2xl font-bold">14</p>
            </div>
            <div className="rounded-2xl bg-white/8 p-4">
              <p className="text-xs text-white/45">Pending</p>
              <p className="mt-2 text-2xl font-bold">6</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-black/10 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-black/40">
              How it works
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-tight">
              One place for the whole collection.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="rounded-3xl border border-black/10 bg-[#f7f7f5] p-7"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
                  {index + 1}
                </div>
                <h3 className="mt-6 text-xl font-bold">{feature.title}</h3>
                <p className="mt-3 leading-7 text-black/60">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="rounded-[2rem] bg-[#ecece7] px-7 py-12 sm:px-12 lg:flex lg:items-center lg:justify-between">
          <div>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
              Ready to organize your next collection?
            </h2>
            <p className="mt-3 text-black/60">
              Create your account, set up a collection, and invite your group.
            </p>
          </div>

          <Link
            href="/auth/sign-up"
            className="mt-7 inline-block rounded-full bg-black px-7 py-4 font-bold text-white transition hover:opacity-85 lg:mt-0"
          >
            Start with Threeple
          </Link>
        </div>
      </section>

      <footer className="border-t border-black/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-sm text-black/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Threeple</p>
          <p>Built for transparent group contributions.</p>
        </div>
      </footer>
    </main>
  );
}

