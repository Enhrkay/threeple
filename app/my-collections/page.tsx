import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const instant = false;

// =========================================================
// HELPERS
// =========================================================

function friendlyText(
  value: string | null | undefined
) {
  if (!value) {
    return "—";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

function formatMoney(
  amount: number | null,
  currency: string
) {
  if (
    amount === null ||
    amount === undefined
  ) {
    return "—";
  }

  try {
    return new Intl.NumberFormat(
      "en-NG",
      {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    ).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function participationStyle(
  status: string,
  active: boolean
) {
  if (!active) {
    return "bg-neutral-200 text-neutral-600";
  }

  switch (status) {
    case "approved":
      return "bg-green-100 text-green-700";

    case "approval_pending":
      return "bg-amber-100 text-amber-700";

    case "joined":
      return "bg-blue-100 text-blue-700";

    case "invited":
      return "bg-purple-100 text-purple-700";

    case "declined":
      return "bg-red-100 text-red-700";

    case "cancelled":
      return "bg-neutral-200 text-neutral-600";

    default:
      return "bg-neutral-100 text-neutral-600";
  }
}

// =========================================================
// PAGE
// =========================================================

export default async function MyCollectionsPage() {
  const supabase =
    await createClient();

  // =======================================================
  // AUTH
  // =======================================================

  const {
    data: claimsData,
    error: claimsError,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (
    claimsError ||
    !userId
  ) {
    redirect("/auth/login");
  }

  // =======================================================
  // PROFILE
  // =======================================================

  const {
    data: profile,
  } = await supabase
    .from("profiles")
    .select(`
      full_name
    `)
    .eq(
      "id",
      userId
    )
    .maybeSingle();

  // =======================================================
  // PARTICIPANT RECORDS LINKED TO USER
  // =======================================================

  const {
    data: participantRows,
    error: participantError,
  } = await supabase
    .from("participants")
    .select(`
      id,
      collection_id,
      full_name,
      expected_amount,
      payment_status,
      participation_status,
      join_method,
      is_active,
      created_at
    `)
    .eq(
      "user_id",
      userId
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (participantError) {
    throw new Error(
      "Threeple could not load your Collections."
    );
  }

  const participants =
    participantRows ?? [];

  const collectionIds =
    Array.from(
      new Set(
        participants.map(
          (participant) =>
            participant.collection_id
        )
      )
    );

  // =======================================================
  // COLLECTIONS
  // =======================================================

  let collections:
    {
      id: string;
      title: string;
      description: string | null;
      collection_type: string;
      collection_mode: string;
      currency: string;
      deadline: string | null;
      status: string;
      archived_at: string | null;
    }[] = [];

  if (
    collectionIds.length > 0
  ) {
    const {
      data: collectionRows,
    } = await supabase
      .from("collections")
      .select(`
        id,
        title,
        description,
        collection_type,
        collection_mode,
        currency,
        deadline,
        status,
        archived_at
      `)
      .in(
        "id",
        collectionIds
      );

    collections =
      collectionRows ?? [];
  }

  const collectionMap =
    new Map(
      collections.map(
        (collection) => [
          collection.id,
          collection,
        ]
      )
    );

  // =======================================================
  // COUNTS
  // =======================================================

  const activeMemberships =
    participants.filter(
      (participant) =>
        participant.is_active
    ).length;

  const approvedMemberships =
    participants.filter(
      (participant) =>
        participant.is_active &&
        participant
          .participation_status ===
          "approved"
    ).length;

  const pendingMemberships =
    participants.filter(
      (participant) =>
        participant.is_active &&
        participant
          .participation_status ===
          "approval_pending"
    ).length;

  const displayName =
    profile?.full_name?.trim() ||
    "there";

  // =======================================================
  // UI
  // =======================================================

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">

      {/* HEADER */}

      <header className="border-b bg-white">

        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">

          <Link
            href="/"
          >
            <div className="text-2xl font-bold tracking-tight">
              Threeple
            </div>

            <p className="text-sm text-neutral-500">
              Collect. Coordinate.
              Track.
            </p>
          </Link>

          <Link
            href="/join"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-neutral-300 px-4 text-sm font-semibold hover:bg-neutral-50"
          >
            Join a Collection
          </Link>

        </div>

      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">

        {/* INTRO */}

        <section>

          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
            Participant Portal
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            My Collections
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-neutral-600">
            Welcome, {displayName}.
            View the Collections you
            participate in and track
            your current participation
            status.
          </p>

        </section>

        {/* SUMMARY */}

        <section className="mt-8 grid gap-4 sm:grid-cols-3">

          <div className="rounded-2xl border bg-white p-5">

            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Collections
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {participants.length}
            </p>

          </div>

          <div className="rounded-2xl border bg-white p-5">

            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Approved
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {approvedMemberships}
            </p>

          </div>

          <div
            className={`rounded-2xl border p-5 ${
              pendingMemberships > 0
                ? "border-amber-200 bg-amber-50"
                : "bg-white"
            }`}
          >

            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Awaiting Approval
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {pendingMemberships}
            </p>

          </div>

        </section>

        {/* COLLECTIONS */}

        <section className="mt-10">

          <div className="flex items-center justify-between">

            <div>

              <h2 className="text-xl font-semibold">
                Your participation
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                {activeMemberships} active{" "}
                {activeMemberships === 1
                  ? "membership"
                  : "memberships"}
              </p>

            </div>

          </div>

          {participants.length >
          0 ? (
            <div className="mt-5 grid gap-5 lg:grid-cols-2">

              {participants.map(
                (participant) => {
                  const collection =
                    collectionMap.get(
                      participant.collection_id
                    );

                  if (!collection) {
                    return null;
                  }

                  const archived =
                    Boolean(
                      collection.archived_at
                    );

                  return (
                    <article
                      key={
                        participant.id
                      }
                      className="rounded-3xl border bg-white p-6"
                    >

                      <div className="flex flex-wrap items-start justify-between gap-3">

                        <div>

                          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                            {friendlyText(
                              collection.collection_type
                            )}
                          </p>

                          <h3 className="mt-2 text-xl font-semibold">
                            {
                              collection.title
                            }
                          </h3>

                        </div>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${participationStyle(
                            participant.participation_status,
                            participant.is_active
                          )}`}
                        >
                          {participant.is_active
                            ? friendlyText(
                                participant.participation_status
                              )
                            : "Inactive"}
                        </span>

                      </div>

                      {collection.description && (
                        <p className="mt-4 line-clamp-2 text-sm leading-6 text-neutral-500">
                          {
                            collection.description
                          }
                        </p>
                      )}

                      <div className="mt-6 grid gap-3 sm:grid-cols-2">

                        <div className="rounded-2xl bg-neutral-50 p-4">

                          <p className="text-xs text-neutral-400">
                            Expected
                          </p>

                          <p className="mt-2 font-semibold">
                            {formatMoney(
                              participant.expected_amount !==
                                null
                                ? Number(
                                    participant.expected_amount
                                  )
                                : null,
                              collection.currency
                            )}
                          </p>

                        </div>

                        <div className="rounded-2xl bg-neutral-50 p-4">

                          <p className="text-xs text-neutral-400">
                            Current status
                          </p>

                          <p className="mt-2 font-semibold">
                            {friendlyText(
                              participant.payment_status
                            )}
                          </p>

                        </div>

                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">

                        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">
                          {friendlyText(
                            collection.collection_mode
                          )}
                        </span>

                        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">
                          Joined via{" "}
                          {friendlyText(
                            participant.join_method
                          )}
                        </span>

                        {archived && (
                          <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold text-white">
                            Archived
                          </span>
                        )}

                      </div>

                      {collection.deadline && (
                        <p className="mt-5 text-xs text-neutral-500">
                          Deadline:{" "}
                          {new Date(
                            collection.deadline
                          ).toLocaleDateString(
                            "en-NG"
                          )}
                        </p>
                      )}

                      <div className="mt-6 border-t pt-5">

                        <Link
                          href={`/my-collections/${participant.id}`}
                          className="text-sm font-semibold hover:underline"
                        >
                          View Collection →
                        </Link>

                      </div>

                    </article>
                  );
                }
              )}

            </div>
          ) : (
            <div className="mt-5 rounded-3xl border border-dashed bg-white p-10 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-xl">
                +
              </div>

              <h3 className="mt-5 font-semibold">
                You haven't joined a
                Collection yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">
                Enter a Threeple Code
                or use an invitation
                link to join a
                Collection.
              </p>

              <Link
                href="/join"
                className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-semibold text-white"
              >
                Join a Collection
              </Link>

            </div>
          )}

        </section>

      </div>

    </main>
  );
}