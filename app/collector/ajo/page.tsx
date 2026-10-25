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

function money(
  amount: number | string | null,
  currency: string
) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount ?? 0));
}

function dateLabel(value: string | null) {
  if (!value) return "No date";

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeZone: "Africa/Lagos",
  }).format(new Date(`${value}T00:00:00`));
}

export default async function CollectorAjoPage() {
  const supabase = await createClient();

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect(
      `/auth/login?next=${encodeURIComponent("/collector/ajo")}`
    );
  }
  const organizationIds =
    await getCollectorOrganizationIds(userId);
const { data: collections } =
    organizationIds.length > 0
      ? await supabaseAdmin
          .from("collections")
          .select(`
            id,
            title,
            currency,
            collection_mode,
            organization_id
          `)
          .in("organization_id", organizationIds)
          .eq("collection_mode", "rotating_pool")
      : { data: [] };

  const collectionIds =
    (collections ?? []).map((collection) => collection.id);

  const {
    data: obligations,
    error: obligationsError,
  } =
    collectionIds.length > 0
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
          .in("collection_id", collectionIds)
          .eq("is_outstanding", true)
          .order("due_on", { ascending: true })
      : { data: [], error: null };

  const participantIds = Array.from(
    new Set(
      (obligations ?? []).flatMap((item) =>
        [item.participant_id, item.recipient_participant_id].filter(Boolean)
      )
    )
  );

  const { data: participants } =
    participantIds.length > 0
      ? await supabaseAdmin
          .from("participants")
          .select(`
            id,
            full_name,
            phone
          `)
          .in("id", participantIds)
      : { data: [] };

  const participantMap = new Map(
    (participants ?? []).map((participant) => [
      participant.id,
      participant,
    ])
  );

  const collectionMap = new Map(
    (collections ?? []).map((collection) => [
      collection.id,
      collection,
    ])
  );

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const rows = obligations ?? [];

  const dueToday = rows.filter(
    (row) => row.due_on === today
  );

  const overdue = rows.filter(
    (row) =>
      Boolean(row.due_on && row.due_on < today)
  );

  const totalOutstanding = rows.reduce(
    (total, row) =>
      total + Number(row.outstanding_amount ?? 0),
    0
  );

  return (
    <ThreepleAppShell
      title="Ajo Field Route"
      subtitle="Rotational collection obligations"
      status={
        <ThreepleBadge tone="primary">
          Ajo
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

          <Link
            href="/collector/today"
            className="tp-btn tp-btn-secondary"
          >
            Todayâ€™s Route
          </Link>
        </div>

        <ThreepleAlert
          tone="warning"
          className="mt-5"
        >
          This screen tracks Ajo contribution obligations and cycle recipients.
          It does not mean Threeple automatically pays the cycle recipient.
        </ThreepleAlert>

        {obligationsError && (
          <ThreepleAlert
            tone="danger"
            className="mt-5"
          >
            The Ajo collector adapter could not be read. Confirm the Collector
            Ajo SQL migration has been run.
          </ThreepleAlert>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ThreepleStat
            label="Outstanding obligations"
            value={rows.length}
            helper="Member-cycle obligations still requiring collection."
            tone="primary"
          />

          <ThreepleStat
            label="Due today"
            value={dueToday.length}
            helper="Ajo obligations due today."
            tone="warning"
          />

          <ThreepleStat
            label="Overdue"
            value={overdue.length}
            helper="Ajo obligations past their due date."
            tone="warning"
          />

          <ThreepleStat
            label="Outstanding value"
            value={money(
              totalOutstanding,
              collections?.[0]?.currency ?? "NGN"
            )}
            helper="Across the Ajo obligations shown."
            tone="success"
          />
        </section>

        <section className="mt-8">
          <p className="tp-kicker">
            Current obligations
          </p>

          <h1 className="tp-heading mt-2 text-2xl">
            Collect by cycle, not by guesswork.
          </h1>

          {rows.length === 0 ? (
            <ThreepleEmptyState
              className="mt-6"
              title="No outstanding Ajo obligations"
              description="There are no outstanding rotational obligations in the Ajo collections you manage."
            />
          ) : (
            <div className="mt-6 space-y-3">
              {rows.map((row) => {
                const participant =
                  participantMap.get(row.participant_id);

                const recipient =
                  row.recipient_participant_id
                    ? participantMap.get(row.recipient_participant_id)
                    : null;

                const collection =
                  collectionMap.get(row.collection_id);

                const isOverdue =
                  Boolean(row.due_on && row.due_on < today);

                const isToday =
                  row.due_on === today;

                return (
                  <article
                    key={row.obligation_id}
                    className="tp-card p-5 sm:p-6"
                  >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black">
                            {participant?.full_name ?? "Participant"}
                          </p>

                          {isOverdue && (
                            <ThreepleBadge tone="danger">
                              Overdue
                            </ThreepleBadge>
                          )}

                          {isToday && (
                            <ThreepleBadge tone="warning">
                              Due today
                            </ThreepleBadge>
                          )}

                          {!isOverdue && !isToday && (
                            <ThreepleBadge tone="neutral">
                              Upcoming
                            </ThreepleBadge>
                          )}
                        </div>

                        <p className="mt-1 text-sm text-[var(--tp-muted)]">
                          {collection?.title ?? "Ajo collection"}
                          {" Â· "}
                          Cycle {row.cycle_number ?? "â€”"}
                        </p>

                        <p className="mt-2 text-sm text-[var(--tp-muted)]">
                          {participant?.phone ?? "No phone number"}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                          <span>
                            Due: <strong>{dateLabel(row.due_on)}</strong>
                          </span>

                          <span>
                            Outstanding:{" "}
                            <strong>
                              {money(
                                row.outstanding_amount,
                                collection?.currency ?? "NGN"
                              )}
                            </strong>
                          </span>
                        </div>

                        {recipient && (
                          <p className="mt-3 text-sm">
                            Cycle recipient:{" "}
                            <strong>{recipient.full_name}</strong>
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/collector/${row.collection_id}/record/${row.participant_id}`}
                          className="tp-btn tp-btn-primary"
                        >
                          Record
                        </Link>

                        <Link
                          href={`/collector/${row.collection_id}/offline-record/${row.participant_id}`}
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
          )}
        </section>
      </div>
    </ThreepleAppShell>
  );
}



