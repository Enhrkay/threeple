import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
export const instant = false;
import { joinCollection } from "./actions";

type PageProps = {
  searchParams?: Promise<{
    code?: string;
    joined?: string;
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
  return value
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function formatMoney(
  amount: number | string | null,
  currency: string
) {
  if (amount === null) {
    return "Not set";
  }

  return new Intl.NumberFormat(
    "en-NG",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }
  ).format(Number(amount));
}

function getErrorMessage(
  error?: string
) {
  switch (error) {
    case "invalid_name":
      return "Please enter a valid full name.";

    case "contact_required":
      return "Please provide at least an email address or phone number.";

    case "invalid_email":
      return "Please enter a valid email address.";

    case "amount_required":
      return "Please enter a valid contribution amount.";

    case "already_joined":
      return "A participant with this email address or phone number has already joined this Collection.";

    case "collection_unavailable":
      return "This Collection is no longer available for joining.";

    case "join_failed":
      return "We could not complete your request. Please try again.";

    default:
      return null;
  }
}

export default async function JoinPage({
  searchParams,
}: PageProps) {
  const params =
    await searchParams;

  const code = String(
    params?.code ?? ""
  )
    .trim()
    .toUpperCase();

  const joined =
    params?.joined === "1";

  const joinError =
    getErrorMessage(
      params?.error
    );

  const supabase =
    await createClient();

  let collection:
    | PublicCollection
    | null = null;

  let lookupError = false;

  // -------------------------------------------------------
  // LOOKUP COLLECTION
  // -------------------------------------------------------

  if (code) {
    const {
      data,
      error,
    } = await supabase.rpc(
      "lookup_collection_by_code",
      {
        p_join_code: code,
      }
    );

    if (error) {
      console.error(
        "THREEPLE CODE LOOKUP ERROR:",
        error
      );

      lookupError = true;
    } else if (
      data &&
      data.length > 0
    ) {
      collection =
        data[0] as PublicCollection;
    }
  }

  const targetAmount =
    collection?.target_amount
      ? Number(
          collection.target_amount
        )
      : 0;

  const amountRaised =
    collection?.amount_raised
      ? Number(
          collection.amount_raised
        )
      : 0;

  const progress =
    targetAmount > 0
      ? Math.min(
          Math.round(
            (
              amountRaised /
              targetAmount
            ) * 100
          ),
          100
        )
      : 0;

  const needsChosenAmount =
    collection?.collection_mode ===
      "target" ||
    collection?.collection_mode ===
      "flexible";

  const isRecurring =
    collection?.collection_mode ===
      "recurring_dues" ||
    collection?.collection_mode ===
      "rotating_pool";

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      {/* HEADER */}

      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div>
            <Link
              href="/join"
              className="text-2xl font-bold tracking-tight"
            >
              Threeple
            </Link>

            <p className="text-sm text-neutral-500">
              Collect. Coordinate.
              Track.
            </p>
          </div>

          <Link
            href="/auth/login"
            className="text-sm font-medium text-neutral-600 hover:text-black"
          >
            Organizer login
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-12">
        {/* SEARCH */}

        <section className="text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
            Join a Collection
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Enter your Threeple Code
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-neutral-600">
            Enter the code shared by
            the organizer to find your
            Collection.
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
              className="h-12 flex-1 rounded-xl border border-neutral-300 bg-white px-4 font-mono uppercase tracking-wider outline-none transition focus:border-black"
            />

            <button
              type="submit"
              className="h-12 rounded-xl bg-black px-6 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              Find Collection
            </button>
          </form>
        </section>

        {/* LOOKUP ERROR */}

        {code &&
          lookupError && (
            <section className="mt-10 rounded-3xl border bg-white p-8 text-center">
              <h2 className="text-lg font-semibold">
                We couldn't complete
                that search
              </h2>

              <p className="mt-2 text-sm text-neutral-500">
                Please try again.
              </p>
            </section>
          )}

        {/* NOT FOUND */}

        {code &&
          !lookupError &&
          !collection && (
            <section className="mt-10 rounded-3xl border bg-white p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 font-semibold">
                ?
              </div>

              <h2 className="mt-4 text-lg font-semibold">
                Collection not found
              </h2>

              <p className="mt-2 text-sm text-neutral-500">
                We couldn't find an
                active Collection using
                Threeple Code:
              </p>

              <p className="mt-3 font-mono text-lg font-bold tracking-wider">
                {code}
              </p>
            </section>
          )}

        {/* COLLECTION */}

        {collection && (
          <section className="mt-10 overflow-hidden rounded-3xl border bg-white">
            {/* COLLECTION HEADER */}

            <div className="border-b p-6 md:p-8">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium">
                  {prettyText(
                    collection.collection_type
                  )}
                </span>

                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium">
                  {prettyText(
                    collection.collection_mode
                  )}
                </span>
              </div>

              <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
                {collection.title}
              </h2>

              {collection.description && (
                <p className="mt-3 text-neutral-600">
                  {
                    collection.description
                  }
                </p>
              )}
            </div>

            {/* FINANCIAL SUMMARY */}

            <div className="grid gap-4 p-6 md:grid-cols-2 md:p-8">
              {collection.target_amount !==
                null && (
                <>
                  <div className="rounded-2xl bg-neutral-50 p-5">
                    <p className="text-sm text-neutral-500">
                      Target
                    </p>

                    <p className="mt-2 text-xl font-semibold">
                      {formatMoney(
                        collection.target_amount,
                        collection.currency
                      )}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-neutral-50 p-5">
                    <p className="text-sm text-neutral-500">
                      Raised
                    </p>

                    <p className="mt-2 text-xl font-semibold">
                      {formatMoney(
                        collection.amount_raised,
                        collection.currency
                      )}
                    </p>
                  </div>
                </>
              )}

              {collection.default_amount !==
                null && (
                <div className="rounded-2xl bg-neutral-50 p-5">
                  <p className="text-sm text-neutral-500">
                    Amount per person
                  </p>

                  <p className="mt-2 text-xl font-semibold">
                    {formatMoney(
                      collection.default_amount,
                      collection.currency
                    )}
                  </p>
                </div>
              )}

              <div className="rounded-2xl bg-neutral-50 p-5">
                <p className="text-sm text-neutral-500">
                  Deadline
                </p>

                <p className="mt-2 font-semibold">
                  {collection.deadline
                    ? new Intl.DateTimeFormat(
                        "en-NG",
                        {
                          dateStyle:
                            "medium",
                        }
                      ).format(
                        new Date(
                          collection.deadline
                        )
                      )
                    : "No deadline"}
                </p>
              </div>
            </div>

            {/* PROGRESS */}

            {targetAmount > 0 && (
              <div className="px-6 pb-8 md:px-8">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">
                    Progress
                  </span>

                  <span className="font-semibold">
                    {progress}%
                  </span>
                </div>

                <div className="mt-3 h-3 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-black"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* SUCCESS */}

            {joined && (
              <div className="border-t p-6 md:p-8">
                <div className="rounded-2xl bg-green-50 p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 font-bold text-green-700">
                    ✓
                  </div>

                  <h3 className="mt-4 text-lg font-semibold">
                    You've joined this
                    Collection
                  </h3>

                  <p className="mt-2 text-sm text-neutral-600">
                    Your participant
                    record has been
                    created successfully.
                    Payment will be
                    connected in the next
                    step.
                  </p>
                </div>
              </div>
            )}

            {/* JOIN ERROR */}

            {!joined &&
              joinError && (
                <div className="border-t px-6 pt-6 md:px-8">
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {joinError}
                  </div>
                </div>
              )}

            {/* JOIN FORM */}

            {!joined && (
              <div className="border-t p-6 md:p-8">
                <h3 className="text-lg font-semibold">
                  Join this Collection
                </h3>

                <p className="mt-2 text-sm text-neutral-500">
                  Enter your details to
                  join.
                </p>

                <form
                  action={joinCollection}
                  className="mt-6 space-y-5"
                >
                  <input
                    type="hidden"
                    name="join_code"
                    value={
                      collection.join_code
                    }
                  />

                  <div>
                    <label
                      htmlFor="full_name"
                      className="mb-2 block text-sm font-medium"
                    >
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
                      className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                    />
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="email"
                        className="mb-2 block text-sm font-medium"
                      >
                        Email
                      </label>

                      <input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="phone"
                        className="mb-2 block text-sm font-medium"
                      >
                        Phone number
                      </label>

                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="08012345678"
                        className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-neutral-500">
                    Provide at least an
                    email address or phone
                    number.
                  </p>

                  {/* TARGET / FLEXIBLE */}

                  {needsChosenAmount && (
                    <div>
                      <label
                        htmlFor="contribution_amount"
                        className="mb-2 block text-sm font-medium"
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
                        className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                      />

                      <p className="mt-2 text-xs text-neutral-500">
                        Enter the amount
                        you intend to
                        contribute.
                      </p>
                    </div>
                  )}

                  {/* FIXED / EVENT */}

                  {!needsChosenAmount &&
                    !isRecurring &&
                    collection.default_amount !==
                      null && (
                      <div className="rounded-xl bg-neutral-50 p-4">
                        <p className="text-xs uppercase tracking-wide text-neutral-500">
                          Amount required
                        </p>

                        <p className="mt-1 text-lg font-semibold">
                          {formatMoney(
                            collection.default_amount,
                            collection.currency
                          )}
                        </p>
                      </div>
                    )}

                  {/* RECURRING */}

                  {isRecurring && (
                    <div className="rounded-xl bg-neutral-50 p-4">
                      <p className="font-medium">
                        Recurring
                        contribution
                      </p>

                      <p className="mt-1 text-sm text-neutral-500">
                        Your individual
                        payment obligations
                        will be created from
                        the Collection
                        schedule.
                      </p>
                    </div>
                  )}

                  {collection.requires_approval && (
                    <div className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-600">
                      Joining this
                      Collection requires
                      organizer approval.
                    </div>
                  )}

                  <button
                    type="submit"
                    className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-black px-6 text-sm font-medium text-white transition hover:bg-neutral-800"
                  >
                    Join Collection
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