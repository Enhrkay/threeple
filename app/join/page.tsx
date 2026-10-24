import Link from "next/link";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  joinCollection,
} from "./actions";

import {
  ThreepleBadge,
  ThreepleProgress,
} from "@/components/threeple/design-system";

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
  target_amount:
    | number
    | string
    | null;
  default_amount:
    | number
    | string
    | null;
  amount_raised:
    | number
    | string
    | null;
  deadline: string | null;
  join_code: string;
  visibility: string;
  allow_partial_payments: boolean;
  allow_custom_amount: boolean;
  requires_approval: boolean;
  access_mode: string;
};

type PublicCapacity = {
  collection_id: string;
  expected_participant_count:
    | number
    | null;
  joined_participants: number;
  remaining_slots:
    | number
    | null;
  is_full: boolean;
  contribution_amount_policy:
    | string
    | null;
  calculated_contribution_amount:
    | number
    | string
    | null;
  default_amount:
    | number
    | string
    | null;
};

function prettyText(
  value: string
) {
  return value
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function formatMoney(
  amount:
    | number
    | string
    | null,
  currency: string
) {
  if (
    amount === null
  ) {
    return "Not set";
  }

  return new Intl.NumberFormat(
    "en-NG",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }
  ).format(
    Number(amount)
  );
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return "No deadline";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "No deadline";
  }

  return new Intl.DateTimeFormat(
    "en-NG",
    {
      dateStyle: "medium",
    }
  ).format(date);
}

function getErrorMessage(
  error?: string
) {
  switch (error) {
    case "invalid_name":
      return "Please enter your full name.";

    case "account_email_required":
      return "Your Threeple account needs a valid email address before you can join.";

    case "amount_required":
      return "Please enter a valid contribution amount.";

    case "collection_unavailable":
      return "This collection is no longer available for joining.";

    case "collection_full":
      return "This collection is full. All available participant slots have been taken.";

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

  const code =
    String(
      params?.code ?? ""
    )
      .trim()
      .toUpperCase();

  const joinError =
    getErrorMessage(
      params?.error
    );

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  let collection:
    | PublicCollection
    | null = null;

  let capacity:
    | PublicCapacity
    | null = null;

  let lookupError =
    false;

  if (code) {
    const {
      data,
      error,
    } =
      await supabase.rpc(
        "lookup_collection_by_code",
        {
          p_join_code:
            code,
        }
      );

    if (error) {
      console.error(
        "THREEPLE CODE LOOKUP ERROR:",
        error
      );

      lookupError =
        true;
    } else if (
      data &&
      data.length > 0
    ) {
      collection =
        data[0] as PublicCollection;

      const {
        data:
          capacityData,
        error:
          capacityError,
      } =
        await supabase.rpc(
          "lookup_collection_capacity_by_code",
          {
            p_join_code:
              code,
          }
        );

      if (
        capacityError
      ) {
        console.error(
          "THREEPLE CAPACITY LOOKUP ERROR:",
          capacityError
        );
      } else if (
        capacityData &&
        capacityData.length >
          0
      ) {
        capacity =
          capacityData[0] as PublicCapacity;
      }
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
            ) *
              100
          ),
          100
        )
      : 0;

  const needsChosenAmount =
    collection?.collection_mode ===
    "flexible";

  const isRecurring =
    collection?.collection_mode ===
      "recurring_dues" ||
    collection?.collection_mode ===
      "rotating_pool";

  const isAjo =
    collection?.collection_mode ===
    "rotating_pool";

  const isGoal =
    collection?.collection_mode ===
      "target" ||
    collection?.collection_mode ===
      "flexible";

  const isFixed =
    collection?.collection_mode ===
      "fixed_per_person" ||
    collection?.collection_mode ===
      "event_fee";

  const returnToJoin =
    `/join?code=${encodeURIComponent(
      code
    )}`;

  const accountName =
    typeof user?.user_metadata
      ?.full_name ===
      "string"
      ? user.user_metadata
          .full_name
      : "";

  return (
    <main className="min-h-screen bg-[var(--tp-bg)] text-[var(--tp-ink)]">
      <header className="border-b border-[var(--tp-border)] bg-[var(--tp-surface)]">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="text-2xl font-black tracking-tight text-[var(--tp-primary)]"
          >
            Threeple
          </Link>

          {user ? (
            <Link
              href="/my-collections"
              className="tp-btn tp-btn-secondary"
            >
              My Collections
            </Link>
          ) : (
            <Link
              href={`/auth/login?next=${encodeURIComponent(
                returnToJoin
              )}`}
              className="text-sm font-black text-[var(--tp-ink-soft)] transition hover:text-[var(--tp-primary)]"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <section className="mx-auto max-w-3xl text-center">
          <p className="tp-kicker">
            Join a collection
          </p>

          <h1 className="tp-heading mt-3 text-3xl sm:text-4xl lg:text-5xl">
            Enter your Threeple Code.
          </h1>

          <p className="tp-body mx-auto mt-4 max-w-xl text-sm sm:text-base">
            See what the collection is for, understand what is expected, then join with your Threeple account.
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
              defaultValue={
                code
              }
              placeholder="e.g. AB12CD34"
              autoComplete="off"
              maxLength={
                20
              }
              className="tp-input flex-1 font-mono uppercase tracking-[0.12em]"
            />

            <button
              type="submit"
              className="tp-btn tp-btn-primary min-h-12 px-7"
            >
              Find collection
            </button>
          </form>

          <p className="mt-3 text-xs text-[var(--tp-muted)]">
            Your organizer will give you the code.
          </p>
        </section>

        {code &&
          lookupError && (
            <section className="tp-card mt-10 p-8 text-center">
              <h2 className="tp-heading text-lg">
                We could not complete that search
              </h2>

              <p className="tp-body mt-2 text-sm">
                Please check the code and try again.
              </p>
            </section>
          )}

        {code &&
          !lookupError &&
          !collection && (
            <section className="tp-card mt-10 p-8 text-center">
              <h2 className="tp-heading text-lg">
                Collection not found
              </h2>

              <p className="tp-body mt-2 text-sm">
                We could not find an active collection using this Threeple Code.
              </p>

              <p className="mt-4 font-mono text-lg font-black tracking-[0.12em] text-[var(--tp-primary)]">
                {code}
              </p>
            </section>
          )}

        {collection && (
          <section className="mt-10 overflow-hidden rounded-[2rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] shadow-[var(--tp-shadow-md)]">
            <div
              className={[
                "h-2",
                isAjo
                  ? "bg-[var(--tp-warning)]"
                  : isGoal
                    ? "bg-[var(--tp-primary)]"
                    : "bg-[var(--tp-success)]",
              ].join(
                " "
              )}
            />

            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <ThreepleBadge
                  tone={
                    isAjo
                      ? "warning"
                      : isGoal
                        ? "primary"
                        : "success"
                  }
                >
                  {isAjo
                    ? "Ajo"
                    : isGoal
                      ? "Goal contribution"
                      : isFixed
                        ? "Fixed contribution"
                        : prettyText(
                            collection.collection_mode
                          )}
                </ThreepleBadge>

                <ThreepleBadge>
                  {prettyText(
                    collection.collection_type
                  )}
                </ThreepleBadge>
              </div>

              <h2 className="tp-heading mt-5 text-3xl sm:text-4xl">
                {collection.title}
              </h2>

              {collection.description && (
                <p className="tp-body mt-3 max-w-3xl">
                  {collection.description}
                </p>
              )}

              <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {isGoal &&
                  collection.target_amount !==
                    null && (
                    <div className="rounded-2xl bg-[var(--tp-primary-soft)] p-5">
                      <p className="tp-kicker">
                        Target
                      </p>

                      <p className="tp-heading mt-2 text-xl">
                        {formatMoney(
                          collection.target_amount,
                          collection.currency
                        )}
                      </p>
                    </div>
                  )}

                {isGoal && (
                  <div className="rounded-2xl bg-[var(--tp-success-soft)] p-5">
                    <p className="tp-kicker">
                      Raised
                    </p>

                    <p className="tp-heading mt-2 text-xl">
                      {formatMoney(
                        collection.amount_raised,
                        collection.currency
                      )}
                    </p>
                  </div>
                )}

                {collection.default_amount !==
                  null && (
                  <div className="rounded-2xl bg-[var(--tp-bg-soft)] p-5">
                    <p className="tp-kicker">
                      {isAjo
                        ? "Per cycle"
                        : "Required"}
                    </p>

                    <p className="tp-heading mt-2 text-xl">
                      {formatMoney(
                        collection.default_amount,
                        collection.currency
                      )}
                    </p>
                  </div>
                )}

                <div className="rounded-2xl bg-[var(--tp-bg-soft)] p-5">
                  <p className="tp-kicker">
                    Deadline
                  </p>

                  <p className="mt-2 font-black text-[var(--tp-ink)]">
                    {formatDate(
                      collection.deadline
                    )}
                  </p>
                </div>
              </div>

              {targetAmount >
                0 && (
                <div className="mt-7 rounded-2xl border border-[var(--tp-border)] bg-[var(--tp-bg-soft)] p-5">
                  <ThreepleProgress
                    value={
                      progress
                    }
                    label="Collection progress"
                    helper={`${progress}%`}
                  />

                  <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-[var(--tp-muted)]">
                    <span>
                      {formatMoney(
                        amountRaised,
                        collection.currency
                      )}{" "}
                      raised
                    </span>

                    <span>
                      {formatMoney(
                        targetAmount,
                        collection.currency
                      )}{" "}
                      goal
                    </span>
                  </div>
                </div>
              )}
            </div>

            {capacity && (
              <div className="border-t border-[var(--tp-border)] bg-[var(--tp-bg-soft)] px-6 py-6 sm:px-8">
                <p className="tp-kicker">
                  Group capacity
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  {capacity.expected_participant_count !==
                    null && (
                    <div className="rounded-2xl bg-[var(--tp-surface)] p-5">
                      <p className="text-sm text-[var(--tp-muted)]">
                        Planned
                      </p>

                      <p className="mt-2 text-xl font-black">
                        {
                          capacity.expected_participant_count
                        }
                      </p>
                    </div>
                  )}

                  <div className="rounded-2xl bg-[var(--tp-surface)] p-5">
                    <p className="text-sm text-[var(--tp-muted)]">
                      Joined
                    </p>

                    <p className="mt-2 text-xl font-black">
                      {
                        capacity.joined_participants
                      }
                    </p>
                  </div>

                  {capacity.remaining_slots !==
                    null && (
                    <div className="rounded-2xl bg-[var(--tp-surface)] p-5">
                      <p className="text-sm text-[var(--tp-muted)]">
                        Remaining
                      </p>

                      <p className="mt-2 text-xl font-black">
                        {
                          capacity.remaining_slots
                        }
                      </p>
                    </div>
                  )}
                </div>

                {capacity.contribution_amount_policy ===
                  "calculated_equal_share" && (
                  <div className="mt-4 rounded-2xl bg-[var(--tp-primary)] p-5 text-white">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-white/55">
                      Your required share
                    </p>

                    <p className="mt-2 text-2xl font-black">
                      {formatMoney(
                        capacity.calculated_contribution_amount ??
                          capacity.default_amount,
                        collection.currency
                      )}
                    </p>

                    <p className="mt-2 text-xs leading-5 text-white/60">
                      The target is shared equally across the planned group size.
                    </p>
                  </div>
                )}

                {capacity.is_full && (
                  <div className="tp-alert tp-alert-warning mt-4">
                    <p className="font-black">
                      This collection is full
                    </p>

                    <p className="mt-1 text-sm">
                      All planned participant slots have been taken.
                    </p>
                  </div>
                )}
              </div>
            )}

            {joinError && (
              <div className="border-t border-[var(--tp-border)] px-6 pt-6 sm:px-8">
                <div className="tp-alert tp-alert-danger text-sm">
                  {joinError}
                </div>
              </div>
            )}

            {!user ? (
              <div className="border-t border-[var(--tp-border)] p-6 sm:p-8">
                <div className="rounded-[1.75rem] bg-[var(--tp-primary-soft)] p-6 sm:p-7">
                  <p className="tp-kicker text-[var(--tp-primary)]">
                    Threeple account required
                  </p>

                  <h3 className="tp-heading mt-2 text-2xl">
                    Join once. Keep the history.
                  </h3>

                  <p className="tp-body mt-3 max-w-2xl text-sm">
                    Your account keeps this collection connected to you, so you can return later to see your status, contribution history, group progress and Ajo position.
                  </p>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Link
                      href={`/auth/sign-up?next=${encodeURIComponent(
                        returnToJoin
                      )}`}
                      className="tp-btn tp-btn-primary"
                    >
                      Create account to join
                    </Link>

                    <Link
                      href={`/auth/login?next=${encodeURIComponent(
                        returnToJoin
                      )}`}
                      className="tp-btn tp-btn-secondary"
                    >
                      Sign in to join
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-t border-[var(--tp-border)] p-6 sm:p-8">
                <div className="mb-6">
                  <p className="tp-kicker">
                    Your details
                  </p>

                  <h3 className="tp-heading mt-2 text-2xl">
                    Join this collection
                  </h3>

                  <p className="tp-body mt-2 text-sm">
                    Signed in as{" "}
                    <span className="font-bold text-[var(--tp-ink)]">
                      {user.email}
                    </span>
                  </p>
                </div>

                <form
                  action={
                    joinCollection
                  }
                  className="space-y-5"
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
                      className="mb-2 block text-sm font-black"
                    >
                      Full name
                    </label>

                    <input
                      id="full_name"
                      name="full_name"
                      type="text"
                      required
                      minLength={
                        2
                      }
                      maxLength={
                        120
                      }
                      defaultValue={
                        accountName
                      }
                      placeholder="Your full name"
                      className="tp-input"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      className="mb-2 block text-sm font-black"
                    >
                      Phone number
                      <span className="ml-1 font-normal text-[var(--tp-muted)]">
                        optional
                      </span>
                    </label>

                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="08012345678"
                      className="tp-input"
                    />
                  </div>

                  <div className="rounded-2xl bg-[var(--tp-bg-soft)] p-4 text-sm">
                    <p className="text-[var(--tp-muted)]">
                      Account email
                    </p>

                    <p className="mt-1 font-black">
                      {user.email}
                    </p>
                  </div>

                  {needsChosenAmount && (
                    <div>
                      <label
                        htmlFor="contribution_amount"
                        className="mb-2 block text-sm font-black"
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
                        className="tp-input"
                      />

                      <p className="mt-2 text-xs leading-5 text-[var(--tp-muted)]">
                        This collection lets participants choose how much they want to contribute toward the goal.
                      </p>
                    </div>
                  )}

                  {!needsChosenAmount &&
                    !isRecurring &&
                    collection.default_amount !==
                      null && (
                      <div className="rounded-2xl bg-[var(--tp-success-soft)] p-5">
                        <p className="tp-kicker text-[var(--tp-success)]">
                          Amount required
                        </p>

                        <p className="mt-2 text-xl font-black text-[var(--tp-success)]">
                          {formatMoney(
                            collection.default_amount,
                            collection.currency
                          )}
                        </p>
                      </div>
                    )}

                  {isRecurring && (
                    <div className="rounded-2xl bg-[var(--tp-warning-soft)] p-5">
                      <p className="font-black text-[var(--tp-warning)]">
                        {isAjo
                          ? "Ajo contribution"
                          : "Recurring contribution"}
                      </p>

                      <p className="mt-2 text-sm leading-6 text-[var(--tp-warning)]">
                        Your obligations will follow this collection&apos;s schedule and cycles after you join.
                      </p>
                    </div>
                  )}

                  {collection.requires_approval && (
                    <div className="tp-alert tp-alert-info text-sm">
                      The organizer will approve your participation before you can begin contributing.
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={
                      Boolean(
                        capacity?.is_full
                      )
                    }
                    className="tp-btn tp-btn-primary min-h-12 w-full disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {capacity?.is_full
                      ? "Collection full"
                      : "Join collection"}
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
