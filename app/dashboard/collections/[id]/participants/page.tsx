import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  approveParticipant,
  declineParticipant,
  deactivateParticipant,
  reactivateParticipant,
} from "./actions";

export const instant = false;

type PageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams?: Promise<{
    result?: string;
  }>;
};

// =========================================================
// HELPERS
// =========================================================

function friendlyText(
  value: string
) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
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
    return `${currency} ${amount}`;
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

function resultMessage(
  result?: string
) {
  switch (result) {
    case "approved":
      return {
        type: "success",
        text:
          "Participant approved successfully.",
      };

    case "declined":
      return {
        type: "success",
        text:
          "Participant declined.",
      };

    case "deactivated":
      return {
        type: "success",
        text:
          "Participant deactivated. Their history has been preserved.",
      };

    case "reactivated":
      return {
        type: "success",
        text:
          "Participant reactivated successfully.",
      };

    case "approve_failed":
    case "decline_failed":
    case "deactivate_failed":
    case "reactivate_failed":
      return {
        type: "error",
        text:
          "Threeple could not complete that participant action.",
      };

    default:
      return null;
  }
}

// =========================================================
// PAGE
// =========================================================

export default async function ParticipantsPage({
  params,
  searchParams,
}: PageProps) {
  const { id } =
    await params;

  const query =
    await searchParams;

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
  // COLLECTION
  // =======================================================

  const {
    data: collection,
    error: collectionError,
  } = await supabase
    .from("collections")
    .select(`
      id,
      organization_id,
      title,
      currency,
      requires_approval,
      status
    `)
    .eq(
      "id",
      id
    )
    .maybeSingle();

  if (
    collectionError ||
    !collection
  ) {
    notFound();
  }

  // =======================================================
  // ACCESS
  // =======================================================

  const {
    data: organization,
  } = await supabase
    .from("organizations")
    .select(`
      owner_id
    `)
    .eq(
      "id",
      collection.organization_id
    )
    .maybeSingle();

  let canManage =
    organization?.owner_id ===
    userId;

  if (!canManage) {
    const {
      data: membership,
    } = await supabase
      .from(
        "organization_members"
      )
      .select("role")
      .eq(
        "organization_id",
        collection.organization_id
      )
      .eq(
        "user_id",
        userId
      )
      .in(
        "role",
        [
          "admin",
          "treasurer",
        ]
      )
      .maybeSingle();

    canManage =
      Boolean(membership);
  }

  if (!canManage) {
    notFound();
  }

  // =======================================================
  // PARTICIPANTS
  // =======================================================

  const {
    data: participants,
    error: participantError,
  } = await supabase
    .from("participants")
    .select(`
      id,
      full_name,
      email,
      phone,
      expected_amount,
      payment_status,
      participation_status,
      join_method,
      is_active,
      created_at
    `)
    .eq(
      "collection_id",
      collection.id
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (participantError) {
    throw new Error(
      "Threeple could not load participants."
    );
  }

  const allParticipants =
    participants ?? [];

  const activeCount =
    allParticipants.filter(
      (participant) =>
        participant.is_active
    ).length;

  const pendingCount =
    allParticipants.filter(
      (participant) =>
        participant.is_active &&
        participant.participation_status ===
          "approval_pending"
    ).length;

  const approvedCount =
    allParticipants.filter(
      (participant) =>
        participant.is_active &&
        participant.participation_status ===
          "approved"
    ).length;

  const inactiveCount =
    allParticipants.filter(
      (participant) =>
        !participant.is_active
    ).length;

  const message =
    resultMessage(
      query?.result
    );

  // =======================================================
  // UI
  // =======================================================

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">

      {/* HEADER */}

      <header className="border-b bg-white">

        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">

          <div>
            <Link
              href="/dashboard"
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
            href={`/dashboard/collections/${collection.id}`}
            className="text-sm font-medium text-neutral-600 hover:text-black"
          >
            ← Collection
          </Link>

        </div>

      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">

        {/* TITLE */}

        <section>

          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Participants
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {collection.title}
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-neutral-600">
            Review participants,
            approve join requests
            and manage access to
            this Collection.
          </p>

        </section>

        {/* MESSAGE */}

        {message && (
          <div
            className={`mt-6 rounded-2xl border p-4 text-sm ${
              message.type ===
              "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* SUMMARY */}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl border bg-white p-5">
            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Active
            </p>

            <p className="mt-2 text-3xl font-semibold">
              {activeCount}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Awaiting approval
            </p>

            <p className="mt-2 text-3xl font-semibold">
              {pendingCount}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Approved
            </p>

            <p className="mt-2 text-3xl font-semibold">
              {approvedCount}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Inactive
            </p>

            <p className="mt-2 text-3xl font-semibold">
              {inactiveCount}
            </p>
          </div>

        </section>

        {/* APPROVAL NOTICE */}

        {collection.requires_approval && (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">

            <p className="font-semibold text-amber-900">
              Approval is enabled
            </p>

            <p className="mt-2 text-sm leading-6 text-amber-800">
              People joining this
              Collection remain
              pending until an
              organizer approves
              them.
            </p>

          </section>
        )}

        {/* PARTICIPANTS */}

        <section className="mt-8">

          <div className="mb-4 flex items-center justify-between">

            <h2 className="text-xl font-semibold">
              All participants
            </h2>

            <span className="text-sm text-neutral-500">
              {
                allParticipants.length
              }{" "}
              total
            </span>

          </div>

          {allParticipants.length ===
          0 ? (
            <div className="rounded-3xl border border-dashed bg-white p-10 text-center">

              <h3 className="font-semibold">
                No participants yet
              </h3>

              <p className="mt-2 text-sm text-neutral-500">
                Share the Threeple
                Code or add
                participants to
                begin.
              </p>

              <Link
                href={`/dashboard/collections/${collection.id}/invite`}
                className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-semibold text-white"
              >
                Invite People
              </Link>

            </div>
          ) : (
            <div className="space-y-4">

              {allParticipants.map(
                (participant) => (
                  <article
                    key={
                      participant.id
                    }
                    className="rounded-2xl border bg-white p-5 md:p-6"
                  >

                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                      {/* PERSON */}

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-2">

                          <h3 className="text-lg font-semibold">
                            {
                              participant.full_name
                            }
                          </h3>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${participationStyle(
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

                        <div className="mt-2 space-y-1 text-sm text-neutral-500">

                          {participant.email && (
                            <p>
                              {
                                participant.email
                              }
                            </p>
                          )}

                          {participant.phone && (
                            <p>
                              {
                                participant.phone
                              }
                            </p>
                          )}

                        </div>

                        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-neutral-500">

                          <span>
                            Joined via:{" "}
                            <strong className="font-medium text-neutral-700">
                              {friendlyText(
                                participant.join_method
                              )}
                            </strong>
                          </span>

                          <span>
                            Expected:{" "}
                            <strong className="font-medium text-neutral-700">
                              {formatMoney(
                                participant.expected_amount !==
                                  null
                                  ? Number(
                                      participant.expected_amount
                                    )
                                  : null,
                                collection.currency
                              )}
                            </strong>
                          </span>

                          <span>
                            Payment:{" "}
                            <strong className="font-medium text-neutral-700">
                              {friendlyText(
                                participant.payment_status
                              )}
                            </strong>
                          </span>

                        </div>

                      </div>

                      {/* ACTIONS */}

                      <div className="flex flex-wrap gap-2">

                        {participant.is_active &&
                          participant.participation_status ===
                            "approval_pending" && (
                            <>
                              <form
                                action={
                                  approveParticipant
                                }
                              >
                                <input
                                  type="hidden"
                                  name="collection_id"
                                  value={
                                    collection.id
                                  }
                                />

                                <input
                                  type="hidden"
                                  name="participant_id"
                                  value={
                                    participant.id
                                  }
                                />

                                <button
                                  type="submit"
                                  className="inline-flex h-10 items-center justify-center rounded-lg bg-black px-4 text-sm font-semibold text-white hover:bg-neutral-800"
                                >
                                  Approve
                                </button>
                              </form>

                              <form
                                action={
                                  declineParticipant
                                }
                              >
                                <input
                                  type="hidden"
                                  name="collection_id"
                                  value={
                                    collection.id
                                  }
                                />

                                <input
                                  type="hidden"
                                  name="participant_id"
                                  value={
                                    participant.id
                                  }
                                />

                                <button
                                  type="submit"
                                  className="inline-flex h-10 items-center justify-center rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-700 hover:bg-red-50"
                                >
                                  Decline
                                </button>
                              </form>
                            </>
                          )}

                        {participant.is_active &&
                          participant.participation_status !==
                            "approval_pending" &&
                          participant.participation_status !==
                            "declined" && (
                            <form
                              action={
                                deactivateParticipant
                              }
                            >
                              <input
                                type="hidden"
                                name="collection_id"
                                value={
                                  collection.id
                                }
                              />

                              <input
                                type="hidden"
                                name="participant_id"
                                value={
                                  participant.id
                                }
                              />

                              <button
                                type="submit"
                                className="inline-flex h-10 items-center justify-center rounded-lg border border-neutral-300 px-4 text-sm font-medium hover:bg-neutral-50"
                              >
                                Deactivate
                              </button>
                            </form>
                          )}

                        {participant.is_active &&
                          participant.participation_status ===
                            "declined" && (
                            <form
                              action={
                                reactivateParticipant
                              }
                            >
                              <input
                                type="hidden"
                                name="collection_id"
                                value={
                                  collection.id
                                }
                              />

                              <input
                                type="hidden"
                                name="participant_id"
                                value={
                                  participant.id
                                }
                              />

                              <button
                                type="submit"
                                className="inline-flex h-10 items-center justify-center rounded-lg border border-neutral-300 px-4 text-sm font-semibold hover:bg-neutral-50"
                              >
                                Approve Instead
                              </button>
                            </form>
                          )}

                        {!participant.is_active && (
                          <form
                            action={
                              reactivateParticipant
                            }
                          >
                            <input
                              type="hidden"
                              name="collection_id"
                              value={
                                collection.id
                              }
                            />

                            <input
                              type="hidden"
                              name="participant_id"
                              value={
                                participant.id
                              }
                            />

                            <button
                              type="submit"
                              className="inline-flex h-10 items-center justify-center rounded-lg bg-black px-4 text-sm font-semibold text-white hover:bg-neutral-800"
                            >
                              Reactivate
                            </button>
                          </form>
                        )}

                      </div>

                    </div>

                  </article>
                )
              )}

            </div>
          )}

        </section>

        {/* DATA SAFETY */}

        <section className="mt-8 rounded-2xl bg-neutral-100 p-5">

          <p className="text-sm font-medium">
            Participant records are
            preserved.
          </p>

          <p className="mt-2 text-sm leading-6 text-neutral-500">
            Deactivating someone
            does not delete their
            Collection history.
            This protects future
            contribution,
            obligation and audit
            records.
          </p>

        </section>

      </div>

    </main>
  );
}