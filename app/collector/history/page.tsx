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

function money(
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

function friendlyMethod(
  value: string
) {
  return value
    .replaceAll(
      "_manual",
      ""
    )
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
}

function formatDateTime(
  value: string
) {
  return new Intl.DateTimeFormat(
    "en-NG",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone:
        "Africa/Lagos",
    }
  ).format(
    new Date(value)
  );
}

export default async function CollectorHistoryPage() {
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
        "/collector/history"
      )}`
    );
  }

  const {
    data: events,
    error,
  } = await supabaseAdmin
    .from(
      "field_contribution_events"
    )
    .select(`
      id,
      receipt_reference,
      collection_id,
      participant_id,
      amount,
      currency,
      payment_method,
      lifecycle_status,
      local_recorded_at,
      server_synced_at,
      note,
      correction_of_event_id,
      created_at
    `)
    .eq(
      "collector_user_id",
      userId
    )
    .order(
      "local_recorded_at",
      {
        ascending: false,
      }
    )
    .limit(200);

  if (error) {
    console.error(
      "COLLECTOR_HISTORY_FAILED",
      error
    );
  }

  const rows =
    events ?? [];

  const collectionIds =
    Array.from(
      new Set(
        rows.map(
          (row) =>
            row.collection_id
        )
      )
    );

  const participantIds =
    Array.from(
      new Set(
        rows.map(
          (row) =>
            row.participant_id
        )
      )
    );

  const collectionMap =
    new Map<
      string,
      string
    >();

  const participantMap =
    new Map<
      string,
      string
    >();

  if (
    collectionIds.length >
    0
  ) {
    const {
      data: collections,
    } =
      await supabaseAdmin
        .from(
          "collections"
        )
        .select(`
          id,
          title
        `)
        .in(
          "id",
          collectionIds
        );

    for (
      const collection
      of collections ?? []
    ) {
      collectionMap.set(
        collection.id,
        collection.title
      );
    }
  }

  if (
    participantIds.length >
    0
  ) {
    const {
      data: participants,
    } =
      await supabaseAdmin
        .from(
          "participants"
        )
        .select(`
          id,
          full_name
        `)
        .in(
          "id",
          participantIds
        );

    for (
      const participant
      of participants ?? []
    ) {
      participantMap.set(
        participant.id,
        participant.full_name
      );
    }
  }

  const todayFormatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Africa/Lagos",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    );

  const todayKey =
    todayFormatter.format(
      new Date()
    );

  const todayRows =
    rows.filter(
      (row) =>
        todayFormatter.format(
          new Date(
            row.local_recorded_at
          )
        ) ===
        todayKey
    );

  const totalToday =
    todayRows.reduce(
      (
        total,
        row
      ) =>
        total +
        Number(
          row.amount ?? 0
        ),
      0
    );

  const syncedCount =
    rows.filter(
      (row) =>
        row.lifecycle_status ===
        "synced"
    ).length;

  const cashToday =
    todayRows.reduce(
      (
        total,
        row
      ) =>
        row.payment_method ===
        "cash"
          ? total +
            Number(
              row.amount ?? 0
            )
          : total,
      0
    );

  const currency =
    rows[0]?.currency ??
    "NGN";

  return (
    <ThreepleAppShell
      title="Collector History"
      subtitle="Field receipts"
      status={
        <ThreepleBadge tone="primary">
          Manual ledger
        </ThreepleBadge>
      }
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Link
            href="/collector/ledger"
            className="tp-btn tp-btn-secondary"
          >
            Effective Ledger
          </Link>
<Link
            href="/collector"
            className="text-sm font-black text-[var(--tp-primary)]"
          >
            Back to Collector Mode
          </Link>

          <Link
            href="/collector/offline-queue"
            className="tp-btn tp-btn-secondary"
          >
            Offline Queue
          </Link>
        </div>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ThreepleStat
            label="Collected today"
            value={money(
              totalToday,
              currency
            )}
            helper="Manual field records created today."
            tone="primary"
          />

          <ThreepleStat
            label="Receipts today"
            value={
              todayRows.length
            }
            helper="Local field receipts recorded today."
            tone="success"
          />

          <ThreepleStat
            label="Cash today"
            value={money(
              cashToday,
              currency
            )}
            helper="Cash-labelled manual records today."
            tone="warning"
          />

          <ThreepleStat
            label="Synced receipts"
            value={
              syncedCount
            }
            helper={`Of ${rows.length} server-side field records shown.`}
          />
        </section>

        <section className="mt-8">
          <div>
            <p className="tp-kicker">
              Recent activity
            </p>

            <h1 className="tp-heading mt-2 text-2xl">
              Your field collection ledger.
            </h1>

            <p className="tp-body mt-2 max-w-3xl text-sm">
              These are manual field records created under your collector account. They remain separate from Paystack transactions and electronic payment verification.
            </p>
          </div>

          {rows.length ===
          0 ? (
            <ThreepleEmptyState
              className="mt-6"
              title="No field receipts yet"
              description="Once you record and sync manual contributions, they will appear here."
            />
          ) : (
            <div className="mt-6 space-y-3">
              {rows.map(
                (
                  row
                ) => (
                  <article
                    key={
                      row.id
                    }
                    className="tp-card p-5 sm:p-6"
                  >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black text-[var(--tp-ink)]">
                            {participantMap.get(
                              row.participant_id
                            ) ??
                              "Participant"}
                          </p>

                          <ThreepleBadge
                            tone={
                              row.lifecycle_status ===
                              "synced"
                                ? "success"
                                : "warning"
                            }
                          >
                            {row.lifecycle_status ===
                            "synced"
                              ? "Synced"
                              : "Pending"}
                          </ThreepleBadge>
                        </div>

                        <p className="mt-1 text-sm text-[var(--tp-muted)]">
                          {collectionMap.get(
                            row.collection_id
                          ) ??
                            "Collection"}
                        </p>

                        <p className="mt-3 font-mono text-xs font-black tracking-wider text-[var(--tp-primary)]">
                          {
                            row.receipt_reference
                          }
                        </p>

                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--tp-muted)]">
                          <span>
                            {friendlyMethod(
                              row.payment_method
                            )}
                          </span>

                          <span>
                            {formatDateTime(
                              row.local_recorded_at
                            )}
                          </span>
                        </div>

                        {row.note && (
                          <p className="mt-3 text-sm leading-6 text-[var(--tp-ink-soft)]">
                            {row.note}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-end justify-between gap-4 sm:flex-col sm:items-end">
                        <p className="text-xl font-black">
                          {money(
                            row.amount,
                            row.currency
                          )}
                        </p>

                        <div className="flex flex-col items-end gap-2">
                          <Link
                            href={`/collector/${row.collection_id}/receipts/${row.id}`}
                            className="text-sm font-black text-[var(--tp-primary)]"
                          >
                            View receipt
                          </Link>

                          {!row.correction_of_event_id &&
                            row.lifecycle_status !== "voided" && (
                              <Link
                                href={`/collector/receipts/${row.id}/adjust`}
                                className="text-sm font-black text-[var(--tp-warning)]"
                              >
                                Correct / Void
                              </Link>
                            )}
                        </div>
                      </div>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </ThreepleAppShell>
  );
}







