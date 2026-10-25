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
  ThreepleStat,
} from "@/components/threeple/design-system";

export const instant = false;

function formatMoney(
  value:
    | string
    | number
    | null,
  currency: string
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "â€”";
  }

  return new Intl.NumberFormat(
    "en-NG",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }
  ).format(
    Number(value)
  );
}

function dateKey(
  value:
    | string
    | null
) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "Africa/Lagos",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(
    new Date(value)
  );
}

function prettyMode(
  value:
    | string
    | null
) {
  if (!value) {
    return "Contribution";
  }

  return value
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

export default async function CollectorTodayPage() {
  const supabase =
    await createClient();

  const {
    data: claimsData,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    redirect(
      `/auth/login?next=${encodeURIComponent(
        "/collector/today"
      )}`
    );
  }

  const {
    data: ownedOrganizations,
  } =
    await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq(
        "owner_id",
        userId
      );

  const {
    data: memberships,
  } =
    await supabaseAdmin
      .from(
        "organization_members"
      )
      .select(`
        organization_id,
        role
      `)
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
      );

  const organizationIds =
    Array.from(
      new Set([
        ...(
          ownedOrganizations ??
          []
        ).map(
          (row) =>
            row.id
        ),
        ...(
          memberships ??
          []
        ).map(
          (row) =>
            row.organization_id
        ),
      ])
    );

  if (
    organizationIds.length ===
    0
  ) {
    return (
      <ThreepleAppShell
        title="Todayâ€™s Route"
        subtitle="Field collection"
        status={
          <ThreepleBadge tone="neutral">
            No route
          </ThreepleBadge>
        }
      >
        <ThreepleEmptyState
          title="No manageable collections"
          description="You do not currently own or manage an organization with field collections."
        />
      </ThreepleAppShell>
    );
  }

  const {
    data: collections,
  } =
    await supabaseAdmin
      .from("collections")
      .select(`
        id,
        title,
        organization_id,
        collection_mode,
        currency,
        default_amount,
        deadline,
        lifecycle_status
      `)
      .in(
        "organization_id",
        organizationIds
      )
      .neq(
        "lifecycle_status",
        "soft_deleted"
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

  const activeCollections =
    (
      collections ??
      []
    ).filter(
      (collection) =>
        collection.lifecycle_status !==
          "archived" &&
        collection.lifecycle_status !==
          "historical_locked"
    );

  const collectionIds =
    activeCollections.map(
      (collection) =>
        collection.id
    );

  const {
    data: participants,
  } =
    collectionIds.length >
    0
      ? await supabaseAdmin
          .from(
            "participants"
          )
          .select(`
            id,
            collection_id,
            full_name,
            phone,
            expected_amount,
            payment_status,
            participation_status,
            is_active
          `)
          .in(
            "collection_id",
            collectionIds
          )
          .eq(
            "is_active",
            true
          )
          .order(
            "full_name",
            {
              ascending: true,
            }
          )
      : {
          data: [],
        };

  const collectionMap =
    new Map(
      activeCollections.map(
        (collection) => [
          collection.id,
          collection,
        ]
      )
    );

  const outstanding =
    (
      participants ??
      []
    ).filter(
      (participant) =>
        participant.payment_status !==
          "paid" &&
        participant.payment_status !==
          "verified" &&
        participant.participation_status !==
          "cancelled"
    );

  const today =
    dateKey(
      new Date().toISOString()
    );

  const dueToday =
    outstanding.filter(
      (participant) => {
        const collection =
          collectionMap.get(
            participant.collection_id
          );

        return (
          collection &&
          dateKey(
            collection.deadline
          ) ===
            today
        );
      }
    );

  const overdue =
    outstanding.filter(
      (participant) => {
        const collection =
          collectionMap.get(
            participant.collection_id
          );

        const deadline =
          dateKey(
            collection?.deadline ??
              null
          );

        return Boolean(
          deadline &&
            today &&
            deadline <
              today
        );
      }
    );

  const noDate =
    outstanding.filter(
      (participant) => {
        const collection =
          collectionMap.get(
            participant.collection_id
          );

        return !collection?.deadline;
      }
    );

  const totalExpected =
    outstanding.reduce(
      (
        total,
        participant
      ) =>
        total +
        Number(
          participant.expected_amount ??
            collectionMap.get(
              participant.collection_id
            )?.default_amount ??
            0
        ),
      0
    );

  const grouped =
    activeCollections
      .map(
        (collection) => ({
          collection,
          participants:
            outstanding.filter(
              (participant) =>
                participant.collection_id ===
                collection.id
            ),
        })
      )
      .filter(
        (group) =>
          group.participants
            .length > 0
      )
      .sort(
        (
          left,
          right
        ) => {
          const leftDate =
            dateKey(
              left.collection
                .deadline
            );

          const rightDate =
            dateKey(
              right.collection
                .deadline
            );

          if (
            leftDate ===
            today &&
            rightDate !==
              today
          ) {
            return -1;
          }

          if (
            rightDate ===
            today &&
            leftDate !==
              today
          ) {
            return 1;
          }

          if (
            leftDate &&
            rightDate
          ) {
            return leftDate.localeCompare(
              rightDate
            );
          }

          if (leftDate) {
            return -1;
          }

          if (rightDate) {
            return 1;
          }

          return left.collection.title.localeCompare(
            right.collection.title
          );
        }
      );

  return (
    <ThreepleAppShell
      title="Todayâ€™s Route"
      subtitle="Field collection"
      status={
        <ThreepleBadge tone="primary">
          Collector Mode
        </ThreepleBadge>
      }
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/collector"
            className="text-sm font-black text-[var(--tp-primary)]"
          >
            Back to Collector Mode
          </Link>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/collector/offline-queue"
              className="tp-btn tp-btn-secondary"
            >
              Offline Queue
            </Link>

            <Link
              href="/collector/history"
              className="tp-btn tp-btn-secondary"
            >
              Receipt History
            </Link>
          </div>
        </div>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ThreepleStat
            label="Outstanding members"
            value={
              outstanding.length
            }
            helper="Active members without a verified/paid status."
            tone="primary"
          />

          <ThreepleStat
            label="Due today"
            value={
              dueToday.length
            }
            helper="Members whose collection deadline is today."
            tone="warning"
          />

          <ThreepleStat
            label="Overdue"
            value={
              overdue.length
            }
            helper="Outstanding members past the collection deadline."
            tone="warning"
          />

          <ThreepleStat
            label="Expected outstanding"
            value={formatMoney(
              totalExpected,
              activeCollections[0]?.currency ??
                "NGN"
            )}
            helper={`${noDate.length} member(s) are in collections without a deadline.`}
          />
        </section>

        <section className="mt-8">
          <p className="tp-kicker">
            Route priorities
          </p>

          <h1 className="tp-heading mt-2 text-2xl">
            Members needing attention.
          </h1>

          <p className="tp-body mt-2 max-w-3xl text-sm">
            This route is based on the current participant ledger and collection deadlines. Ajo cycle-specific due dates will be handled separately from this general collection route.
          </p>

          {grouped.length ===
          0 ? (
            <ThreepleEmptyState
              className="mt-6"
              title="Nothing outstanding"
              description="There are no active outstanding participants across the collections you manage."
            />
          ) : (
            <div className="mt-6 space-y-6">
              {grouped.map(
                ({
                  collection,
                  participants:
                    collectionParticipants,
                }) => {
                  const deadlineKey =
                    dateKey(
                      collection.deadline
                    );

                  const isDueToday =
                    deadlineKey ===
                    today;

                  const isOverdue =
                    Boolean(
                      deadlineKey &&
                        today &&
                        deadlineKey <
                          today
                    );

                  return (
                    <section
                      key={
                        collection.id
                      }
                      className="tp-card overflow-hidden"
                    >
                      <div className="border-b border-[var(--tp-border)] p-5 sm:p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-lg font-black">
                                {
                                  collection.title
                                }
                              </h2>

                              {isDueToday && (
                                <ThreepleBadge tone="warning">
                                  Due today
                                </ThreepleBadge>
                              )}

                              {isOverdue && (
                                <ThreepleBadge tone="warning">
                                  Overdue
                                </ThreepleBadge>
                              )}

                              {!collection.deadline && (
                                <ThreepleBadge tone="neutral">
                                  No deadline
                                </ThreepleBadge>
                              )}
                            </div>

                            <p className="mt-2 text-sm text-[var(--tp-muted)]">
                              {prettyMode(
                                collection.collection_mode
                              )}
                              {" Â· "}
                              {
                                collectionParticipants.length
                              }{" "}
                              outstanding
                            </p>
                          </div>

                          <Link
                            href={`/collector/${collection.id}`}
                            className="text-sm font-black text-[var(--tp-primary)]"
                          >
                            Open collection
                          </Link>
                        </div>
                      </div>

                      <div className="divide-y divide-[var(--tp-border)]">
                        {collectionParticipants.map(
                          (
                            participant
                          ) => {
                            const expected =
                              participant.expected_amount ??
                              collection.default_amount;

                            return (
                              <article
                                key={
                                  participant.id
                                }
                                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                              >
                                <div className="min-w-0">
                                  <p className="font-black">
                                    {
                                      participant.full_name
                                    }
                                  </p>

                                  <p className="mt-1 text-sm text-[var(--tp-muted)]">
                                    {participant.phone ??
                                      "No phone number"}
                                  </p>

                                  <p className="mt-2 text-sm font-bold text-[var(--tp-ink-soft)]">
                                    Expected:{" "}
                                    {formatMoney(
                                      expected,
                                      collection.currency ??
                                        "NGN"
                                    )}
                                  </p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <Link
                                    href={`/collector/${collection.id}/record/${participant.id}`}
                                    className="tp-btn tp-btn-primary"
                                  >
                                    Record
                                  </Link>

                                  <Link
                                    href={`/collector/${collection.id}/offline-record/${participant.id}`}
                                    className="tp-btn tp-btn-secondary"
                                  >
                                    Record offline
                                  </Link>
                                </div>
                              </article>
                            );
                          }
                        )}
                      </div>
                    </section>
                  );
                }
              )}
            </div>
          )}
        </section>
      </div>
    </ThreepleAppShell>
  );
}


