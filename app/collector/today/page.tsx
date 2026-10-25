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

function lagosDateKey(
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
      : {
          data: [],
        };

  const participantMap =
    new Map(
      (
        participants ??
        []
      ).map(
        (participant) => [
          participant.id,
          participant,
        ]
      )
    );

  const collectionMap =
    new Map(
      activeCollections.map(
        (collection) => [
          collection.id,
          collection,
        ]
      )
    );

  const recurringCollectionIds =
    activeCollections
      .filter(
        (collection) =>
          collection.collection_mode ===
          "recurring_dues"
      )
      .map(
        (collection) =>
          collection.id
      );

  const {
    data: recurringDueItems,
  } =
    recurringCollectionIds.length >
    0
      ? await supabaseAdmin
          .from(
            "recurring_due_items"
          )
          .select(`
            obligation_id,
            collection_id,
            participant_id,
            expected_amount,
            obligation_status,
            paid_amount,
            cycle_id,
            cycle_number,
            starts_on,
            due_on,
            ends_on,
            cycle_status
          `)
          .in(
            "collection_id",
            recurringCollectionIds
          )
          .order(
            "due_on",
            {
              ascending: true,
            }
          )
      : {
          data: [],
        };

  const today =
    lagosDateKey(
      new Date().toISOString()
    );

  const recurringItems =
    (
      recurringDueItems ??
      []
    )
      .map(
        (item) => ({
          ...item,
          participant:
            participantMap.get(
              item.participant_id
            ),
          collection:
            collectionMap.get(
              item.collection_id
            ),
        })
      )
      .filter(
        (item) =>
          item.participant &&
          item.collection
      );

  const recurringDueToday =
    recurringItems.filter(
      (item) =>
        lagosDateKey(
          item.due_on
        ) ===
        today
    );

  const recurringOverdue =
    recurringItems.filter(
      (item) => {
        const due =
          lagosDateKey(
            item.due_on
          );

        return Boolean(
          due &&
            today &&
            due < today
        );
      }
    );

  const recurringUpcoming =
    recurringItems.filter(
      (item) => {
        const due =
          lagosDateKey(
            item.due_on
          );

        return Boolean(
          due &&
            today &&
            due > today
        );
      }
    );

  const standardOutstanding =
    (
      participants ??
      []
    ).filter(
      (participant) => {
        const collection =
          collectionMap.get(
            participant.collection_id
          );

        if (
          !collection ||
          collection.collection_mode ===
            "recurring_dues"
        ) {
          return false;
        }

        return (
          participant.payment_status !==
            "paid" &&
          participant.payment_status !==
            "verified" &&
          participant.participation_status !==
            "cancelled"
        );
      }
    );

  const standardDueToday =
    standardOutstanding.filter(
      (participant) => {
        const collection =
          collectionMap.get(
            participant.collection_id
          );

        return (
          collection &&
          lagosDateKey(
            collection.deadline
          ) ===
            today
        );
      }
    );

  const standardOverdue =
    standardOutstanding.filter(
      (participant) => {
        const collection =
          collectionMap.get(
            participant.collection_id
          );

        const deadline =
          lagosDateKey(
            collection?.deadline ??
              null
          );

        return Boolean(
          deadline &&
            today &&
            deadline < today
        );
      }
    );

  const combinedDueToday =
    recurringDueToday.length +
    standardDueToday.length;

  const combinedOverdue =
    recurringOverdue.length +
    standardOverdue.length;

  const outstandingCount =
    standardOutstanding.length +
    recurringItems.length;

  const expectedOutstanding =
    standardOutstanding.reduce(
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
    ) +
    recurringItems.reduce(
      (
        total,
        item
      ) =>
        total +
        Math.max(
          0,
          Number(
            item.expected_amount ??
              0
          ) -
            Number(
              item.paid_amount ??
                0
            )
        ),
      0
    );

  const groupedStandard =
    activeCollections
      .filter(
        (collection) =>
          collection.collection_mode !==
          "recurring_dues"
      )
      .map(
        (collection) => ({
          collection,
          participants:
            standardOutstanding.filter(
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
            label="Outstanding items"
            value={
              outstandingCount
            }
            helper="Standard members plus recurring cycle obligations."
            tone="primary"
          />

          <ThreepleStat
            label="Due today"
            value={
              combinedDueToday
            }
            helper="Collection deadlines and recurring cycle dues."
            tone="warning"
          />

          <ThreepleStat
            label="Overdue"
            value={
              combinedOverdue
            }
            helper="Outstanding items past their due date."
            tone="warning"
          />

          <ThreepleStat
            label="Expected outstanding"
            value={formatMoney(
              expectedOutstanding,
              activeCollections[0]?.currency ??
                "NGN"
            )}
            helper={`${recurringUpcoming.length} recurring obligation(s) are upcoming.`}
            tone="success"
          />
        </section>

        {(recurringDueToday.length >
          0 ||
          recurringOverdue.length >
            0) && (
          <section className="mt-8">
            <p className="tp-kicker">
              Recurring dues
            </p>

            <h1 className="tp-heading mt-2 text-2xl">
              Cycle obligations needing attention.
            </h1>

            <div className="mt-6 space-y-3">
              {[
                ...recurringOverdue,
                ...recurringDueToday,
              ].map(
                (item) => {
                  const participant =
                    item.participant!;

                  const collection =
                    item.collection!;

                  const dueKey =
                    lagosDateKey(
                      item.due_on
                    );

                  const isOverdue =
                    Boolean(
                      dueKey &&
                        today &&
                        dueKey <
                          today
                    );

                  return (
                    <article
                      key={
                        item.obligation_id
                      }
                      className="tp-card p-5 sm:p-6"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-black">
                              {
                                participant.full_name
                              }
                            </p>

                            <ThreepleBadge
                              tone={
                                isOverdue
                                  ? "danger"
                                  : "warning"
                              }
                            >
                              {isOverdue
                                ? "Overdue"
                                : "Due today"}
                            </ThreepleBadge>
                          </div>

                          <p className="mt-1 text-sm text-[var(--tp-muted)]">
                            {
                              collection.title
                            }
                            {" Â· "}
                            Cycle{" "}
                            {
                              item.cycle_number
                            }
                          </p>

                          <p className="mt-2 text-sm font-bold text-[var(--tp-ink-soft)]">
                            Due:{" "}
                            {
                              item.due_on
                            }
                            {" Â· "}
                            Outstanding:{" "}
                            {formatMoney(
                              Math.max(
                                0,
                                Number(
                                  item.expected_amount ??
                                    0
                                ) -
                                  Number(
                                    item.paid_amount ??
                                      0
                                  )
                              ),
                              collection.currency ??
                                "NGN"
                            )}
                          </p>

                          <p className="mt-1 text-sm text-[var(--tp-muted)]">
                            {participant.phone ??
                              "No phone number"}
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
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          </section>
        )}

        <section className="mt-8">
          <p className="tp-kicker">
            Other collections
          </p>

          <h1 className="tp-heading mt-2 text-2xl">
            Standard collection route.
          </h1>

          {groupedStandard.length ===
          0 ? (
            <ThreepleEmptyState
              className="mt-6"
              title="No standard collection items"
              description="No non-recurring outstanding participants currently need attention."
            />
          ) : (
            <div className="mt-6 space-y-6">
              {groupedStandard.map(
                ({
                  collection,
                  participants:
                    collectionParticipants,
                }) => {
                  const deadlineKey =
                    lagosDateKey(
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
                                <ThreepleBadge tone="danger">
                                  Overdue
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
                          ) => (
                            <article
                              key={
                                participant.id
                              }
                              className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                            >
                              <div>
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
                                    participant.expected_amount ??
                                      collection.default_amount,
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
                          )
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

