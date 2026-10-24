import Link from "next/link";

export const instant = false;

export default function JoinRestrictedPage() {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">

      <header className="border-b bg-white">

        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">

          <Link href="/">
            <div className="text-2xl font-bold tracking-tight">
              Threeple
            </div>

            <p className="text-sm text-neutral-500">
              Collect. Coordinate. Track.
            </p>
          </Link>

          <Link
            href="/join"
            className="text-sm font-medium text-neutral-500 hover:text-black"
          >
            Join
          </Link>

        </div>

      </header>

      <div className="mx-auto max-w-3xl px-6 py-16">

        <section className="rounded-3xl border bg-white p-8 text-center shadow-sm md:p-12">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-xl font-bold text-amber-700">
            !
          </div>

          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
            Collection Unavailable
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            New joins are currently unavailable
          </h1>

          <p className="mx-auto mt-4 max-w-xl leading-7 text-neutral-600">
            Threeple has temporarily disabled new participation
            in this Collection.
          </p>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-neutral-500">
            If you already joined this Collection previously,
            your existing participation record has not been
            removed. Sign in and use My Collections to access it.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">

            <Link
              href="/my-collections"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-semibold text-white"
            >
              My Collections
            </Link>

            <Link
              href="/join"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-neutral-300 px-5 text-sm font-semibold hover:bg-neutral-50"
            >
              Try Another Code
            </Link>

          </div>

        </section>

      </div>

    </main>
  );
}