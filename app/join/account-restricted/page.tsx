import Link from "next/link";

export const instant = false;

type PageProps = {
  searchParams: Promise<{
    code?: string;
  }>;
};

export default async function AccountRestrictedPage({
  searchParams,
}: PageProps) {
  const query =
    await searchParams;

  const code =
    query.code?.trim() ?? "";

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto flex min-h-screen max-w-2xl items-center px-6 py-12">
        <section className="w-full rounded-3xl border bg-white p-7 shadow-sm md:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-xl font-bold text-red-700">
            !
          </div>

          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-red-700">
            Account Restriction
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Participation Unavailable
          </h1>

          <p className="mt-4 leading-7 text-neutral-600">
            Your Threeple account currently has an active administrative
            restriction that prevents joining or participating in new
            Collections.
          </p>

          <div className="mt-6 rounded-2xl bg-neutral-50 p-5">
            <p className="text-sm leading-6 text-neutral-600">
              Existing records and historical activity are preserved. This
              restriction remains in effect until it is reviewed and lifted by
              an authorized Threeple administrator.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              Return to Dashboard
            </Link>

            <Link
              href={
                code
                  ? `/join?code=${encodeURIComponent(code)}`
                  : "/join"
              }
              className="inline-flex h-11 items-center justify-center rounded-xl border border-neutral-300 px-5 text-sm font-semibold hover:bg-neutral-50"
            >
              Back
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
