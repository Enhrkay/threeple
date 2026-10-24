import Link from "next/link";

export const instant = false;

type PageProps = {
  searchParams: Promise<{
    collection?: string;
    status?: string;
  }>;
};

export default async function JoinSuccessPage({
  searchParams,
}: PageProps) {
  const query =
    await searchParams;

  const collectionName =
    query.collection?.trim() ||
    "the Collection";

  const awaitingApproval =
    query.status ===
    "approval_pending";

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-12 text-neutral-900">

      <div className="mx-auto max-w-xl">

        <div className="rounded-3xl border bg-white p-7 text-center shadow-sm md:p-10">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl font-bold text-green-700">
            ✓
          </div>

          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
            Threeple
          </p>

          <h1 className="mt-2 text-3xl font-semibold">
            You've joined successfully
          </h1>

          <p className="mt-4 leading-7 text-neutral-600">
            Your participation in{" "}
            <strong>
              {collectionName}
            </strong>{" "}
            has been recorded.
          </p>

          {awaitingApproval && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left">

              <p className="font-semibold text-amber-950">
                Approval required
              </p>

              <p className="mt-2 text-sm leading-6 text-amber-800">
                The organizer must
                approve your
                participation before
                your status becomes
                approved.
              </p>

            </div>
          )}

          <div className="mt-7 grid gap-3">

            <Link
              href="/auth/sign-up"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-semibold text-white"
            >
              Create a Threeple Account
            </Link>

            <Link
              href="/join"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-neutral-300 px-5 text-sm font-semibold hover:bg-neutral-50"
            >
              Join Another Collection
            </Link>

          </div>

          <p className="mt-6 text-xs leading-5 text-neutral-500">
            If you later create an
            account using the same
            email address, Threeple
            can link your existing
            participant record when
            you access the Collection
            again.
          </p>

        </div>

      </div>

    </main>
  );
}
