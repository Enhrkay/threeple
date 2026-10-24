import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { joinCollection } from "./actions";

export const instant = false;

type PageProps = {
  searchParams?: Promise<{
    code?: string;
    error?: string;
  }>;
};

type PublicCollection = {
  title: string;
  description: string | null;
  collection_type: string;
  collection_mode: string;
  currency: string;
  target_amount: number | string | null;
  default_amount: number | string | null;
  amount_raised: number | string | null;
  deadline: string | null;
  join_code: string;
  visibility: string;
  allow_partial_payments: boolean;
  allow_custom_amount: boolean;
  requires_approval: boolean;
  access_mode: string;
};

function prettyText(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMoney(amount: number | string | null, currency: string) {
  if (amount === null) return "Not set";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

function getErrorMessage(error?: string) {
  switch (error) {
    case "invalid_name":
      return "Please enter your full name.";
    case "account_email_required":
      return "Your Threeple account needs a valid email address before you can join.";
    case "amount_required":
      return "Please enter a valid contribution amount.";
    case "collection_unavailable":
      return "This Collection is no longer available for joining.";
    case "join_failed":
      return "We could not complete your request. Please try again.";
    default:
      return null;
  }
}

export default async function JoinPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const code = String(params?.code ?? "").trim().toUpperCase();
  const joinError = getErrorMessage(params?.error);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let collection: PublicCollection | null = null;
  let lookupError = false;

  if (code) {
    const { data, error } = await supabase.rpc("lookup_collection_by_code", {
      p_join_code: code,
    });

    if (error) {
      console.error("THREEPLE CODE LOOKUP ERROR:", error);
      lookupError = true;
    } else if (data && data.length > 0) {
      collection = data[0] as PublicCollection;
    }
  }

  const targetAmount = collection?.target_amount ? Number(collection.target_amount) : 0;
  const amountRaised = collection?.amount_raised ? Number(collection.amount_raised) : 0;
  const progress =
    targetAmount > 0
      ? Math.min(Math.round((amountRaised / targetAmount) * 100), 100)
      : 0;

  const needsChosenAmount =
    collection?.collection_mode === "target" ||
    collection?.collection_mode === "flexible";

  const isRecurring =
    collection?.collection_mode === "recurring_dues" ||
    collection?.collection_mode === "rotating_pool";

  const returnToJoin = `/join?code=${encodeURIComponent(code)}`;

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#171717]">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-2xl font-black tracking-tight">
            Threeple
          </Link>

          {user ? (
            <Link
              href="/my-collections"
              className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold transition hover:bg-black/5"
            >
              My collections
            </Link>
          ) : (
            <Link
              href={`/auth/login?next=${encodeURIComponent(returnToJoin)}`}
              className="text-sm font-semibold text-black/60 hover:text-black"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-12">
        <section className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-black/40">
            Join a collection
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-[-0.04em]">
            Enter your Threeple Code
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-black/55">
            Find your collection, review the progress, then join with your
            Threeple account.
          </p>

          <form
            action="/join"
            method="get"
            className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row"
          >
            <input
              name="code"
              type="text"
              required
              defaultValue={code}
              placeholder="e.g. AB12CD34"
              autoComplete="off"
              maxLength={20}
              className="h-12 flex-1 rounded-2xl border border-black/10 bg-white px-4 font-mono uppercase tracking-wider outline-none transition focus:border-black"
            />
            <button
              type="submit"
              className="h-12 rounded-full bg-black px-7 text-sm font-bold text-white transition hover:opacity-85"
            >
              Find collection
            </button>
          </form>
        </section>

        {code && lookupError && (
          <section className="mt-10 rounded-3xl border border-black/10 bg-white p-8 text-center">
            <h2 className="text-lg font-bold">We couldn&apos;t complete that search</h2>
            <p className="mt-2 text-sm text-black/50">Please try again.</p>
          </section>
        )}

        {code && !lookupError && !collection && (
          <section className="mt-10 rounded-3xl border border-black/10 bg-white p-8 text-center">
            <h2 className="text-lg font-bold">Collection not found</h2>
            <p className="mt-2 text-sm text-black/50">
              We couldn&apos;t find an active collection using this Threeple Code.
            </p>
            <p className="mt-3 font-mono text-lg font-bold tracking-wider">{code}</p>
          </section>
        )}

        {collection && (
          <section className="mt-10 overflow-hidden rounded-[2rem] border border-black/10 bg-white">
            <div className="border-b border-black/10 p-6 md:p-8">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold">
                  {prettyText(collection.collection_type)}
                </span>
                <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold">
                  {prettyText(collection.collection_mode)}
                </span>
              </div>

              <h2 className="mt-4 text-3xl font-black tracking-tight">
                {collection.title}
              </h2>

              {collection.description && (
                <p className="mt-3 leading-7 text-black/55">
                  {collection.description}
                </p>
              )}
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2 md:p-8">
              {collection.target_amount !== null && (
                <>
                  <div className="rounded-2xl bg-[#f7f7f5] p-5">
                    <p className="text-sm text-black/45">Target</p>
                    <p className="mt-2 text-xl font-bold">
                      {formatMoney(collection.target_amount, collection.currency)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#f7f7f5] p-5">
                    <p className="text-sm text-black/45">Raised</p>
                    <p className="mt-2 text-xl font-bold">
                      {formatMoney(collection.amount_raised, collection.currency)}
                    </p>
                  </div>
                </>
              )}

              {collection.default_amount !== null && (
                <div className="rounded-2xl bg-[#f7f7f5] p-5">
                  <p className="text-sm text-black/45">Amount per person</p>
                  <p className="mt-2 text-xl font-bold">
                    {formatMoney(collection.default_amount, collection.currency)}
                  </p>
                </div>
              )}

              <div className="rounded-2xl bg-[#f7f7f5] p-5">
                <p className="text-sm text-black/45">Deadline</p>
                <p className="mt-2 font-bold">
                  {collection.deadline
                    ? new Intl.DateTimeFormat("en-NG", {
                        dateStyle: "medium",
                      }).format(new Date(collection.deadline))
                    : "No deadline"}
                </p>
              </div>
            </div>

            {targetAmount > 0 && (
              <div className="px-6 pb-8 md:px-8">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-black/45">Collection progress</span>
                  <span className="font-bold">{progress}%</span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-black/5">
                  <div
                    className="h-full rounded-full bg-black"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {joinError && (
              <div className="border-t border-black/10 px-6 pt-6 md:px-8">
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {joinError}
                </div>
              </div>
            )}

            {!user ? (
              <div className="border-t border-black/10 p-6 md:p-8">
                <div className="rounded-3xl bg-[#f7f7f5] p-6">
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-black/40">
                    Threeple account required
                  </p>
                  <h3 className="mt-2 text-2xl font-black">
                    Join transparently. Stay connected.
                  </h3>
                  <p className="mt-3 max-w-xl leading-7 text-black/55">
                    Your account gives you a participant dashboard where you can
                    contribute, track your own status, and continue seeing how
                    the collection progresses.
                  </p>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Link
                      href={`/auth/sign-up?next=${encodeURIComponent(returnToJoin)}`}
                      className="rounded-full bg-black px-6 py-3 text-center text-sm font-bold text-white transition hover:opacity-85"
                    >
                      Create account to join
                    </Link>
                    <Link
                      href={`/auth/login?next=${encodeURIComponent(returnToJoin)}`}
                      className="rounded-full border border-black/10 bg-white px-6 py-3 text-center text-sm font-bold transition hover:bg-black/5"
                    >
                      Sign in to join
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-t border-black/10 p-6 md:p-8">
                <div className="mb-6">
                  <p className="text-sm font-semibold text-black/45">
                    Signed in as {user.email}
                  </p>
                  <h3 className="mt-1 text-xl font-black">Join this collection</h3>
                </div>

                <form action={joinCollection} className="space-y-5">
                  <input type="hidden" name="join_code" value={collection.join_code} />

                  <div>
                    <label htmlFor="full_name" className="mb-2 block text-sm font-semibold">
                      Full name
                    </label>
                    <input
                      id="full_name"
                      name="full_name"
                      type="text"
                      required
                      minLength={2}
                      maxLength={120}
                      placeholder="Your full name"
                      className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="mb-2 block text-sm font-semibold">
                      Phone number
                      <span className="ml-1 font-normal text-black/35">optional</span>
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="08012345678"
                      className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-black"
                    />
                  </div>

                  <div className="rounded-2xl bg-[#f7f7f5] p-4 text-sm">
                    <p className="text-black/45">Account email</p>
                    <p className="mt-1 font-bold">{user.email}</p>
                  </div>

                  {needsChosenAmount && (
                    <div>
                      <label
                        htmlFor="contribution_amount"
                        className="mb-2 block text-sm font-semibold"
                      >
                        Contribution amount
                      </label>
                      <input
                        id="contribution_amount"
                        name="contribution_amount"
                        type="number"
                        min="1"
                        step="0.01"
                        required
                        placeholder="e.g. 50000"
                        className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-black"
                      />
                    </div>
                  )}

                  {!needsChosenAmount &&
                    !isRecurring &&
                    collection.default_amount !== null && (
                      <div className="rounded-2xl bg-[#f7f7f5] p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-black/40">
                          Amount required
                        </p>
                        <p className="mt-1 text-lg font-bold">
                          {formatMoney(collection.default_amount, collection.currency)}
                        </p>
                      </div>
                    )}

                  {isRecurring && (
                    <div className="rounded-2xl bg-[#f7f7f5] p-4">
                      <p className="font-bold">Recurring contribution</p>
                      <p className="mt-1 text-sm leading-6 text-black/50">
                        Your contribution obligations will follow this
                        collection&apos;s schedule and cycles.
                      </p>
                    </div>
                  )}

                  {collection.requires_approval && (
                    <div className="rounded-2xl bg-[#f7f7f5] p-4 text-sm text-black/55">
                      This collection requires organizer approval before you can begin contributing.
                    </div>
                  )}

                  <button
                    type="submit"
                    className="inline-flex h-12 w-full items-center justify-center rounded-full bg-black px-6 text-sm font-bold text-white transition hover:opacity-85"
                  >
                    Join collection
                  </button>
                </form>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
