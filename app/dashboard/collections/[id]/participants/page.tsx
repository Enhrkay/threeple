import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  ThreepleAppShell,
} from "@/components/threeple/app-shell";

import {
  ThreepleBadge,
  ThreepleEmptyState,
  ThreepleStat,
} from "@/components/threeple/design-system";

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

function participationTone(
  status: string,
  active: boolean
):
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "neutral" {
  if (!active) {
    return "neutral";
  }

  switch (status) {
    case "approved":
      return "success";

    case "approval_pending":
      return "warning";

    case "declined":
      return "danger";

    case "joined":
    case "invited":
      return "primary";

    default:
      return "neutral";
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
    <ThreepleAppShell
      title="Participants"
      subtitle={collection.title}
      actions={
        collection.status === "active" ? (
          <Link
            href={`/dashboard/collections/${collection.id}/invite`}
            className="tp-btn tp-btn-primary hidden sm:inline-flex"
          >
            Invite people
          </Link>
        ) : undefined
      }
    >
      <div className="mx-auto max-w-6xl">
        <section className="pb-7">
          <Link
            href={`/dashboard/collections/${collection.id}`}
            className="text-sm font-bold text-[var(--tp-primary)] transition hover:text-[var(--tp-primary-hover)]"
          >
            Back to collection
          </Link>

          <p className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-[var(--tp-primary)]">
            Participants
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[var(--tp-ink)] sm:text-4xl">
            Manage your people
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--tp-muted)]">
            Review who has joined, handle approvals and manage participant access.
          </p>
        </section>

        {message && (
          <div
            className={[
              "mb-6 rounded-2xl border px-4 py-3 text-sm",
              message.type === "success"
                ? "border-[var(--tp-success-border)] bg-[var(--tp-success-soft)] text-[var(--tp-success)]"
                : "border-[var(--tp-danger-border)] bg-[var(--tp-danger-soft)] text-[var(--tp-danger)]",
            ].join(" ")}
          >
            {message.text}
          </div>
        )}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ThreepleStat
            label="Active"
            value={activeCount}
            helper="Currently active participants."
          />

          <ThreepleStat
            label="Awaiting approval"
            value={pendingCount}
            helper="Needs organizer attention."
            tone={
              pendingCount > 0
                ? "primary"
                : "neutral"
            }
          />

          <ThreepleStat
            label="Approved"
            value={approvedCount}
            helper="Approved active participants."
            tone="success"
          />

          <ThreepleStat
            label="Inactive"
            value={inactiveCount}
            helper="History remains preserved."
          />
        </section>

        {collection.requires_approval &&
          pendingCount > 0 && (
            <section className="mt-6 rounded-[1.5rem] border border-[var(--tp-primary-border)] bg-[var(--tp-primary-soft)] p-5 sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-[var(--tp-ink)]">
                    {pendingCount}{" "}
                    {pendingCount === 1
                      ? "person is"
                      : "people are"}{" "}
                    waiting for approval
                  </p>

                  <p className="mt-1 text-sm leading-6 text-[var(--tp-muted)]">
                    Review the pending participant cards below before they begin contributing.
                  </p>
                </div>

                <ThreepleBadge tone="warning">
                  Action needed
                </ThreepleBadge>
              </div>
            </section>
          )}

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="tp-kicker">
                Directory
              </p>

              <h2 className="tp-heading mt-1 text-xl">
                All participants
              </h2>
            </div>

            <span className="text-sm text-[var(--tp-muted)]">
              {allParticipants.length} total
            </span>
          </div>

          {allParticipants.length === 0 ? (
            <ThreepleEmptyState
              title="No participants yet"
              description="Invite people to join this collection using the Threeple Code or invite link."
              action={
                <Link
                  href={`/dashboard/collections/${collection.id}/invite`}
                  className="tp-btn tp-btn-primary"
                >
                  Invite people
                </Link>
              }
            />
          ) : (
            <div className="overflow-hidden rounded-[1.75rem] border border-[var(--tp-border)] bg-[var(--tp-surface)]">
              {allParticipants.map(
                (
                  participant,
                  index
                ) => (
                  <article
                    key={participant.id}
                    className={[
                      "p-5 sm:p-6",
                      index !== 0
                        ? "border-t border-[var(--tp-border)]"
                        : "",
                    ].join(" ")}
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-bold text-[var(--tp-ink)] sm:text-lg">
                            {participant.full_name}
                          </h3>

                          <ThreepleBadge
                            tone={participationTone(
                              participant.participation_status,
                              participant.is_active
                            )}
                          >
                            {participant.is_active
                              ? friendlyText(
                                  participant.participation_status
                                )
                              : "Inactive"}
                          </ThreepleBadge>
                        </div>

                        {(participant.email ||
                          participant.phone) && (
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--tp-muted)]">
                            {participant.email && (
                              <span>
                                {participant.email}
                              </span>
                            )}

                            {participant.phone && (
                              <span>
                                {participant.phone}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--tp-muted)]">
                          <span>
                            Joined via{" "}
                            <strong className="font-bold text-[var(--tp-ink-soft)]">
                              {friendlyText(
                                participant.join_method
                              )}
                            </strong>
                          </span>

                          <span>
                            Expected{" "}
                            <strong className="font-bold text-[var(--tp-ink-soft)]">
                              {formatMoney(
                                participant.expected_amount !== null
                                  ? Number(
                                      participant.expected_amount
                                    )
                                  : null,
                                collection.currency
                              )}
                            </strong>
                          </span>

                          <span>
                            Payment{" "}
                            <strong className="font-bold text-[var(--tp-ink-soft)]">
                              {friendlyText(
                                participant.payment_status
                              )}
                            </strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        {participant.is_active &&
                          participant.participation_status ===
                            "approval_pending" && (
                            <>
                              <form action={approveParticipant}>
                                <input
                                  type="hidden"
                                  name="collection_id"
                                  value={collection.id}
                                />

                                <input
                                  type="hidden"
                                  name="participant_id"
                                  value={participant.id}
                                />

                                <button
                                  type="submit"
                                  className="tp-btn tp-btn-primary min-h-10"
                                >
                                  Approve
                                </button>
                              </form>

                              <form action={declineParticipant}>
                                <input
                                  type="hidden"
                                  name="collection_id"
                                  value={collection.id}
                                />

                                <input
                                  type="hidden"
                                  name="participant_id"
                                  value={participant.id}
                                />

                                <button
                                  type="submit"
                                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--tp-danger-border)] bg-white px-4 text-sm font-bold text-[var(--tp-danger)] transition hover:bg-[var(--tp-danger-soft)]"
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
                            <form action={deactivateParticipant}>
                              <input
                                type="hidden"
                                name="collection_id"
                                value={collection.id}
                              />

                              <input
                                type="hidden"
                                name="participant_id"
                                value={participant.id}
                              />

                              <button
                                type="submit"
                                className="tp-btn tp-btn-secondary min-h-10"
                              >
                                Deactivate
                              </button>
                            </form>
                          )}

                        {participant.is_active &&
                          participant.participation_status ===
                            "declined" && (
                            <form action={reactivateParticipant}>
                              <input
                                type="hidden"
                                name="collection_id"
                                value={collection.id}
                              />

                              <input
                                type="hidden"
                                name="participant_id"
                                value={participant.id}
                              />

                              <button
                                type="submit"
                                className="tp-btn tp-btn-secondary min-h-10"
                              >
                                Approve instead
                              </button>
                            </form>
                          )}

                        {!participant.is_active && (
                          <form action={reactivateParticipant}>
                            <input
                              type="hidden"
                              name="collection_id"
                              value={collection.id}
                            />

                            <input
                              type="hidden"
                              name="participant_id"
                              value={participant.id}
                            />

                            <button
                              type="submit"
                              className="tp-btn tp-btn-primary min-h-10"
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

        <section className="mt-8 border-t border-[var(--tp-border)] pt-6">
          <p className="text-sm font-bold text-[var(--tp-ink)]">
            Participant history is preserved
          </p>

          <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--tp-muted)]">
            Deactivating a participant does not delete their contribution, obligation or audit history.
          </p>
        </section>
      </div>
    </ThreepleAppShell>
  );
}