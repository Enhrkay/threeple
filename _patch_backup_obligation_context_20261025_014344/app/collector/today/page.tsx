import { getCollectorOrganizationIds } from "@/lib/collector/access";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { ThreepleAppShell } from "@/components/threeple/app-shell";
import {
  ThreepleAlert,
  ThreepleBadge,
  ThreepleEmptyState,
  ThreepleStat,
} from "@/components/threeple/design-system";

export const instant = false;

function formatMoney(
  value: string | number | null,
  currency: string
) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function dateKey(value: string | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(`${value}T00:00:00`));
}

function prettyMode(value: string | null) {
  if (!value) return "Contribution";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function CollectorTodayPage() {
  const supabase = await createClient();

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect(
      `/auth/login?next=${encodeURIComponent("/collector/today")}`
    );
  }
  const organizationIds =
    await getCollectorOrganizationIds(userId);
if (organizationIds.length === 0) {
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

  const { data: collections } =
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
      .in("organization_id", organizationIds)
      .neq("lifecycle_status", "soft_deleted")
      .order("created_at", { ascending: false });

  const activeCollections =
    (collections ?? []).filter(
      (collection) =>
        collection.lifecycle_status !== "archived" &&
        collection.lifecycle_status !== "historical_locked"
    );

  const collectionIds =
    activeCollections.map((collection) => collection.id);

  const { data: participants } =
    collectionIds.length > 0
      ? await supabaseAdmin
          .from("participants")
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
          .in("collection_id", collectionIds)
          .eq("is_active", true)
      : { data: [] };

  const participantMap = new Map(
    (participants ?? []).map((participant) => [
      participant.id,
      participant,
    ])
  );

  const collectionMap = new Map(
    activeCollections.map((collection) => [
      collection.id,
      collection,
    ])
  );

  const recurringCollectionIds =
    activeCollections
      .filter(
        (collection) =>
          collection.collection_mode === "recurring_dues"
      )
      .map((collection) => collection.id);

  const ajoCollectionIds =
    activeCollections
      .filter(
        (collection) =>
          collection.collection_mode === "rotating_pool"
      )
      .map((collection) => collection.id);

  const { data: recurringItems } =
    recurringCollectionIds.length > 0
      ? await supabaseAdmin
          .from("recurring_due_items")
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
          .in("collection_id", recurringCollectionIds)
          .order("due_on", { ascending: true })
      : { data: [] };

  const {
    data: ajoItems,
    error: ajoError,
  } =
    ajoCollectionIds.length > 0
      ? await supabaseAdmin
          .from("collector_ajo_due_items")
          .select(`
            obligation_id,
            cycle_id,
            collection_id,
            participant_id,
            recipient_participant_id,
            expected_amount,
            paid_amount,
            outstanding_amount,
            obligation_status,
            cycle_status,
            due_on,
            starts_on,
            ends_on,
            is_outstanding,
            cycle_number
          `)
          .in("collection_id", ajoCollectionIds)
          .eq("is_outstanding", true)
          .order("due_on", { ascending: true })
      : { data: [], error: null };

  const today = todayKey();

  const recurringRows =
    (recurringItems ?? [])
      .map((item) => ({
        ...item,
        participant: participantMap.get(item.participant_id),
        collection: collectionMap.get(item.collection_id),
      }))
      .filter((item) => item.participant && item.collection);

  const ajoRows =
    (ajoItems ?? [])
      .map((item) => ({
        ...item,
        participant: participantMap.get(item.participant_id),
        recipient:
          item.recipient_participant_id
            ? participantMap.get(item.recipient_participant_id)
            : null,
        collection: collectionMap.get(item.collection_id),
      }))
      .filter((item) => item.participant && item.collection);

  const standardOutstanding =
    (participants ?? []).filter((participant) => {
      const collection =
        collectionMap.get(participant.collection_id);

      if (
        !collection ||
        collection.collection_mode === "recurring_dues" ||
        collection.collection_mode === "rotating_pool"
      ) {
        return false;
      }

      return (
        participant.payment_status !== "paid" &&
        participant.payment_status !== "verified" &&
        participant.participation_status !== "cancelled"
      );
    });

  const recurringDueToday =
    recurringRows.filter(
      (item) => dateKey(item.due_on) === today
    );

  const recurringOverdue =
    recurringRows.filter((item) => {
      const due = dateKey(item.due_on);
      return Boolean(due && due < today);
    });

  const ajoDueToday =
    ajoRows.filter(
      (item) => dateKey(item.due_on) === today
    );

  const ajoOverdue =
    ajoRows.filter((item) => {
      const due = dateKey(item.due_on);
      return Boolean(due && due < today);
    });

  const standardDueToday =
    standardOutstanding.filter((participant) => {
      const collection =
        collectionMap.get(participant.collection_id);

      return dateKey(collection?.deadline ?? null) === today;
    });

  const standardOverdue =
    standardOutstanding.filter((participant) => {
      const collection =
        collectionMap.get(participant.collection_id);

      const deadline =
        dateKey(collection?.deadline ?? null);

      return Boolean(deadline && deadline < today);
    });

  const outstandingCount =
    standardOutstanding.length +
    recurringRows.length +
    ajoRows.length;

  const dueTodayCount =
    standardDueToday.length +
    recurringDueToday.length +
    ajoDueToday.length;

  const overdueCount =
    standardOverdue.length +
    recurringOverdue.length +
    ajoOverdue.length;

  const expectedOutstanding =
    standardOutstanding.reduce(
      (total, participant) =>
        total +
        Number(
          participant.expected_amount ??
            collectionMap.get(participant.collection_id)
              ?.default_amount ??
            0
        ),
      0
    ) +
    recurringRows.reduce(
      (total, item) =>
        total +
        Math.max(
          0,
          Number(item.expected_amount ?? 0) -
            Number(item.paid_amount ?? 0)
        ),
      0
    ) +
    ajoRows.reduce(
      (total, item) =>
        total +
        Number(item.outstanding_amount ?? 0),
      0
    );

  const priorityItems = [
    ...ajoOverdue.map((item) => ({
      kind: "ajo" as const,
      overdue: true,
      item,
    })),
    ...recurringOverdue.map((item) => ({
      kind: "recurring" as const,
      overdue: true,
      item,
    })),
    ...ajoDueToday.map((item) => ({
      kind: "ajo" as const,
      overdue: false,
      item,
    })),
    ...recurringDueToday.map((item) => ({
      kind: "recurring" as const,
      overdue: false,
      item,
    })),
  ];

  const groupedStandard =
    activeCollections
      .filter(
        (collection) =>
          collection.collection_mode !== "recurring_dues" &&
          collection.collection_mode !== "rotating_pool"
      )
      .map((collection) => ({
        collection,
        participants: standardOutstanding.filter(
          (participant) =>
            participant.collection_id === collection.id
        ),
      }))
      .filter((group) => group.participants.length > 0);

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
              href="/collector/ajo"
              className="tp-btn tp-btn-secondary"
            >
              Ajo Route
            </Link>

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

        {ajoError && (
          <ThreepleAlert tone="danger" className="mt-5">
            Ajo obligations could not be loaded. Confirm the Collector Ajo adapter SQL migration has been run.
          </ThreepleAlert>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ThreepleStat
            label="Outstanding items"
            value={outstandingCount}
            helper="Standard, recurring, and Ajo obligations."
            tone="primary"
          />

          <ThreepleStat
            label="Due today"
            value={dueTodayCount}
            helper="All contribution types due today."
            tone="warning"
          />

          <ThreepleStat
            label="Overdue"
            value={overdueCount}
            helper="All outstanding items past due."
            tone="warning"
          />

          <ThreepleStat
            label="Expected outstanding"
            value={formatMoney(
              expectedOutstanding,
              activeCollections[0]?.currency ?? "NGN"
            )}
            helper="Combined outstanding contribution value."
            tone="success"
          />
        </section>

        {priorityItems.length > 0 && (
          <section className="mt-8">
            <p className="tp-kicker">
              Priority route
            </p>

            <h1 className="tp-heading mt-2 text-2xl">
              Due and overdue cycle obligations.
            </h1>

            <p className="tp-body mt-2 max-w-3xl text-sm">
              Recurring dues and Ajo obligations are driven by their actual generated cycles rather than the collection-level deadline.
            </p>

            <div className="mt-6 space-y-3">
              {priorityItems.map(({ kind, overdue, item }) => {
                const participant = item.participant!;
                const collection = item.collection!;

                const outstanding =
                  kind === "ajo"
                    ? Number(item.outstanding_amount ?? 0)
                    : Math.max(
                        0,
                        Number(item.expected_amount ?? 0) -
                          Number(item.paid_amount ?? 0)
                      );

                return (
                  <article
                    key={`${kind}-${item.obligation_id}`}
                    className="tp-card p-5 sm:p-6"
                  >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black">
                            {participant.full_name}
                          </p>

                          <ThreepleBadge
                            tone={overdue ? "danger" : "warning"}
                          >
                            {overdue ? "Overdue" : "Due today"}
                          </ThreepleBadge>

                          <ThreepleBadge
                            tone={kind === "ajo" ? "primary" : "neutral"}
                          >
                            {kind === "ajo" ? "Ajo" : "Recurring"}
                          </ThreepleBadge>
                        </div>

                        <p className="mt-1 text-sm text-[var(--tp-muted)]">
                          {collection.title}
                          {" Â· "}
                          Cycle {item.cycle_number ?? "â€”"}
                        </p>

                        <p className="mt-2 text-sm text-[var(--tp-muted)]">
                          {participant.phone ?? "No phone number"}
                        </p>

                        <p className="mt-3 text-sm font-bold text-[var(--tp-ink-soft)]">
                          Due {item.due_on ?? "â€”"}
                          {" Â· "}
                          Outstanding{" "}
                          {formatMoney(
                            outstanding,
                            collection.currency ?? "NGN"
                          )}
                        </p>

                        {kind === "ajo" &&
                          "recipient" in item &&
                          item.recipient && (
                            <p className="mt-2 text-sm text-[var(--tp-ink-soft)]">
                              Cycle recipient:{" "}
                              <strong>{item.recipient.full_name}</strong>
                            </p>
                          )}
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
              })}
            </div>
          </section>
        )}

        <section className="mt-8">
          <p className="tp-kicker">
            Standard collections
          </p>

          <h1 className="tp-heading mt-2 text-2xl">
            Outstanding members outside cycle schedules.
          </h1>

          {groupedStandard.length === 0 ? (
            <ThreepleEmptyState
              className="mt-6"
              title="No standard collection items"
              description="No non-recurring, non-Ajo outstanding participants currently need attention."
            />
          ) : (
            <div className="mt-6 space-y-6">
              {groupedStandard.map(({ collection, participants: groupParticipants }) => {
                const deadline = dateKey(collection.deadline);
                const isToday = deadline === today;
                const isOverdue = Boolean(deadline && deadline < today);

                return (
                  <section
                    key={collection.id}
                    className="tp-card overflow-hidden"
                  >
                    <div className="border-b border-[var(--tp-border)] p-5 sm:p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-black">
                              {collection.title}
                            </h2>

                            {isToday && (
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
                            {prettyMode(collection.collection_mode)}
                            {" Â· "}
                            {groupParticipants.length} outstanding
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
                      {groupParticipants.map((participant) => (
                        <article
                          key={participant.id}
                          className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                        >
                          <div>
                            <p className="font-black">
                              {participant.full_name}
                            </p>

                            <p className="mt-1 text-sm text-[var(--tp-muted)]">
                              {participant.phone ?? "No phone number"}
                            </p>

                            <p className="mt-2 text-sm font-bold text-[var(--tp-ink-soft)]">
                              Expected:{" "}
                              {formatMoney(
                                participant.expected_amount ??
                                  collection.default_amount,
                                collection.currency ?? "NGN"
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
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </section>

        <ThreepleAlert
          tone="warning"
          className="mt-8"
        >
          Ajo recipient visibility is informational. Threeple still does not hold pooled funds or imply that a cycle recipient has been automatically paid.
        </ThreepleAlert>
      </div>
    </ThreepleAppShell>
  );
}



