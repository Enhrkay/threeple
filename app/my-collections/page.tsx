import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

import {
  ThreepleAppShell,
} from "@/components/threeple/app-shell";

import {
  ThreepleBadge,
  ThreepleEmptyState,
  ThreepleLinkButton,
  ThreepleProgress,
  ThreepleStat,
} from "@/components/threeple/design-system";

export const instant = false;

function friendlyText(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "—";
  }

  return value
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
}

function money(
  value:
    | number
    | string
    | null
    | undefined,
  currency = "NGN"
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  try {
    return new Intl.NumberFormat(
      "en-NG",
      {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }
    ).format(number);
  } catch {
    return `${currency} ${number.toLocaleString()}`;
  }
}

function dateLabel(
  value:
    | string
    | null
    | undefined
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

  return date.toLocaleDateString(
    "en-NG",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function statusTone(
  status:
    | string
    | null
    | undefined
):
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger" {
  switch (status) {
    case "paid":
    case "approved":
    case "active":
      return "success";

    case "pending":
    case "awaiting_approval":
    case "unpaid":
      return "warning";

    case "rejected":
    case "cancelled":
      return "danger";

    case "inactive":
    case "closed":
      return "neutral";

    default:
      return "primary";
  }
}

export default async function MyCollectionsPage() {
  const supabase =
    await createClient();

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
    redirect(
      "/auth/login?next=/my-collections"
    );
  }

  const {
    data: participants,
    error:
      participantError,
  } = await supabaseAdmin
    .from("participants")
    .select(`
      id,
      collection_id,
      full_name,
      expected_amount,
      payment_status,
      participation_status,
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
    console.error(
      "MY_COLLECTIONS_PARTICIPANT_LOOKUP_FAILED",
      participantError
    );
  }

  const participantRows =
    participants ?? [];

  const collectionIds =
    Array.from(
      new Set(
        participantRows.map(
          (participant) =>
            participant.collection_id
        )
      )
    );

  let collections: Array<{
    id: string;
    organization_id: string;
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
    deadline: string | null;
    status: string;
    archived_at: string | null;
  }> = [];

  if (
    collectionIds.length >
    0
  ) {
    const {
      data,
      error,
    } = await supabaseAdmin
      .from("collections")
      .select(`
        id,
        organization_id,
        title,
        description,
        collection_type,
        collection_mode,
        currency,
        target_amount,
        default_amount,
        deadline,
        status,
        archived_at
      `)
      .in(
        "id",
        collectionIds
      );

    if (error) {
      console.error(
        "MY_COLLECTIONS_COLLECTION_LOOKUP_FAILED",
        error
      );
    }

    collections =
      data ?? [];
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

  const raisedByCollection =
    new Map<string, number>();

  if (
    collectionIds.length >
    0
  ) {
    const {
      data: financialRows,
      error: financialError,
    } = await supabaseAdmin
      .from(
        "collection_financial_summary"
      )
      .select(`
        collection_id,
        effective_gross_amount
      `)
      .in(
        "collection_id",
        collectionIds
      );

    if (financialError) {
      console.error(
        "MY_COLLECTIONS_FINANCIAL_SUMMARY_FAILED",
        financialError
      );
    }

    for (
      const row
      of financialRows ?? []
    ) {
      raisedByCollection.set(
        row.collection_id,
        Number(
          row.effective_gross_amount ??
          0
        )
      );
    }
  }

  const items =
    participantRows
      .map(
        (participant) => {
          const collection =
            collectionMap.get(
              participant.collection_id
            );

          if (!collection) {
            return null;
          }

          return {
            participant,
            collection,
          };
        }
      )
      .filter(
        (
          item
        ): item is NonNullable<
          typeof item
        > =>
          Boolean(item)
      );

  const activeCount =
    items.filter(
      ({ participant, collection }) =>
        participant.is_active &&
        collection.status ===
          "active" &&
        !collection.archived_at
    ).length;

  const paidCount =
    items.filter(
      ({ participant }) =>
        participant.payment_status ===
        "paid"
    ).length;

  const ajoCount =
    items.filter(
      ({ collection }) =>
        collection.collection_mode ===
        "rotating_pool"
    ).length;

  const archivedCount =
    items.filter(
      ({ collection }) =>
        Boolean(
          collection.archived_at
        )
    ).length;

  return (
    <ThreepleAppShell
      title="My Collections"
      subtitle="Everything you have joined"
      actions={
        <ThreepleLinkButton
          href="/join"
          className="hidden sm:inline-flex"
        >
          Join another
        </ThreepleLinkButton>
      }
    >
      <section className="overflow-hidden rounded-[2rem] border border-[var(--tp-primary-border)] bg-[var(--tp-surface)] p-6 shadow-[var(--tp-shadow-sm)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="tp-kicker">
              Participant workspace
            </p>

            <h1 className="tp-heading mt-2 text-3xl sm:text-4xl">
              The collections you are part of.
            </h1>

            <p className="tp-body mt-3 max-w-2xl text-sm sm:text-base">
              Open any collection to see your contribution, group progress, transparency details and Ajo position where applicable.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <ThreepleLinkButton
              href="/join"
            >
              Join with a code
            </ThreepleLinkButton>

            <ThreepleLinkButton
              href="/dashboard"
              variant="secondary"
            >
              Organizer home
            </ThreepleLinkButton>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ThreepleStat
          label="Active"
          value={
            activeCount
          }
          helper="Collections currently running."
          tone="success"
        />

        <ThreepleStat
          label="Paid"
          value={
            paidCount
          }
          helper="Participant records currently marked paid."
          tone="primary"
        />

        <ThreepleStat
          label="Ajo"
          value={
            ajoCount
          }
          helper="Rotational contribution groups you joined."
          tone="warning"
        />

        <ThreepleStat
          label="Archived"
          value={
            archivedCount
          }
          helper="Historical collections that remain available."
        />
      </section>

      {items.length ===
      0 ? (
        <ThreepleEmptyState
          className="mt-8"
          title="You have not joined a collection yet"
          description="Use a Threeple Code from an organizer to join a contribution, shared goal or Ajo group."
          action={
            <ThreepleLinkButton href="/join">
              Join a collection
            </ThreepleLinkButton>
          }
        />
      ) : (
        <section className="mt-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="tp-kicker">
                Your participation
              </p>

              <h2 className="tp-heading mt-2 text-2xl">
                Pick up where you left off.
              </h2>
            </div>

            <p className="text-sm text-[var(--tp-muted)]">
              {items.length}
              {" "}
              collection
              {items.length === 1
                ? ""
                : "s"}
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map(
              ({
                participant,
                collection,
              }) => {
                const isAjo =
                  collection.collection_mode ===
                  "rotating_pool";

                const isGoal =
                  collection.collection_mode ===
                    "target" ||
                  collection.collection_mode ===
                    "flexible";

                const target =
                  collection.target_amount !==
                  null
                    ? Number(
                        collection.target_amount
                      )
                    : 0;

                const raised =
                  raisedByCollection.get(
                    collection.id
                  ) ?? 0;

                const progress =
                  target > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (
                            raised /
                            target
                          ) *
                            100
                        )
                      )
                    : 0;

                const expectedAmount =
                  participant.expected_amount !==
                  null
                    ? Number(
                        participant.expected_amount
                      )
                    : collection.default_amount !==
                        null
                      ? Number(
                          collection.default_amount
                        )
                      : null;

                const archived =
                  Boolean(
                    collection.archived_at
                  );

                return (
                  <article
                    key={
                      participant.id
                    }
                    className="tp-card overflow-hidden"
                  >
                    <div
                      className={[
                        "h-2",
                        archived
                          ? "bg-[var(--tp-muted)]"
                          : isAjo
                            ? "bg-[var(--tp-warning)]"
                            : isGoal
                              ? "bg-[var(--tp-primary)]"
                              : "bg-[var(--tp-success)]",
                      ].join(" ")}
                    />

                    <div className="p-5 sm:p-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                          <ThreepleBadge
                            tone={
                              participant.is_active
                                ? statusTone(
                                    participant.participation_status
                                  )
                                : "neutral"
                            }
                          >
                            {participant.is_active
                              ? friendlyText(
                                  participant.participation_status
                                )
                              : "Inactive"}
                          </ThreepleBadge>

                          <ThreepleBadge
                            tone={
                              statusTone(
                                participant.payment_status
                              )
                            }
                          >
                            {friendlyText(
                              participant.payment_status
                            )}
                          </ThreepleBadge>
                        </div>

                        <span className="text-xs font-black text-[var(--tp-muted)]">
                          {isAjo
                            ? "Ajo"
                            : isGoal
                              ? "Goal"
                              : "Fixed"}
                        </span>
                      </div>

                      <h3 className="tp-heading mt-5 text-xl">
                        {collection.title}
                      </h3>

                      <p className="tp-muted mt-2 text-sm">
                        {friendlyText(
                          collection.collection_type
                        )}
                        {" · "}
                        {dateLabel(
                          collection.deadline
                        )}
                      </p>

                      {collection.description && (
                        <p className="tp-body mt-3 line-clamp-2 text-sm">
                          {collection.description}
                        </p>
                      )}

                      {isGoal &&
                      target > 0 ? (
                        <div className="mt-6">
                          <ThreepleProgress
                            value={
                              progress
                            }
                            label="Group progress"
                            helper={`${progress}%`}
                          />

                          <div className="mt-3 flex items-center justify-between gap-4 text-xs">
                            <span className="text-[var(--tp-muted)]">
                              {money(
                                raised,
                                collection.currency
                              )}{" "}
                              raised
                            </span>

                            <span className="font-bold text-[var(--tp-ink-soft)]">
                              {money(
                                target,
                                collection.currency
                              )}{" "}
                              goal
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-6 rounded-2xl bg-[var(--tp-bg-soft)] p-4">
                          <p className="tp-kicker">
                            {isAjo
                              ? "Your cycle contribution"
                              : "Your expected contribution"}
                          </p>

                          <p className="tp-heading mt-2 text-lg">
                            {money(
                              expectedAmount,
                              collection.currency
                            )}
                          </p>
                        </div>
                      )}

                      {archived && (
                        <div className="tp-alert tp-alert-info mt-5 text-sm">
                          This collection is archived. Your participation history is still available.
                        </div>
                      )}

                      <div className="mt-6 flex items-center justify-between gap-4 border-t border-[var(--tp-border)] pt-4">
                        <div>
                          <p className="text-xs text-[var(--tp-muted)]">
                            My status
                          </p>

                          <p className="mt-1 text-sm font-black text-[var(--tp-ink)]">
                            {friendlyText(
                              participant.payment_status
                            )}
                          </p>
                        </div>

                        <Link
                          href={`/my-collections/${participant.id}`}
                          className="tp-btn tp-btn-primary"
                        >
                          Open workspace
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        </section>
      )}
    </ThreepleAppShell>
  );
}
