import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCollectorOrganizationIds } from "@/lib/collector/access";

import { ThreepleAppShell } from "@/components/threeple/app-shell";
import {
  ThreepleAlert,
  ThreepleBadge,
  ThreepleEmptyState,
  ThreepleStat,
} from "@/components/threeple/design-system";

export const instant = false;

function money(
  value: string | number | null,
  currency: string
) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function lagosDateKey(value: string | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function dateTimeLabel(value: string | null) {
  if (!value) return "â€”";

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
}

function methodLabel(value: string | null) {
  switch (value) {
    case "cash":
      return "Cash";
    case "bank_transfer_manual":
      return "Manual bank transfer";
    case "pos_manual":
      return "Manual POS";
    case "other_manual":
      return "Other manual";
    default:
      return value
        ? value.replaceAll("_", " ")
        : "Manual";
  }
}

function statusTone(
  status: string | null,
  adjustmentType: string | null
):
  | "primary"
  | "success"
  | "neutral"
  | "warning"
  | "danger" {
  if (adjustmentType === "void" || status === "voided") {
    return "danger";
  }

  if (adjustmentType === "correction" || status === "corrected") {
    return "warning";
  }

  if (status === "synced") {
    return "success";
  }

  if (
    status === "recorded_offline" ||
    status === "pending_sync"
  ) {
    return "warning";
  }

  return "neutral";
}

export default async function CollectorHistoryPage() {
  const supabase = await createClient();

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect(
      `/auth/login?next=${encodeURIComponent("/collector/history")}`
    );
  }

  const organizationIds =
    await getCollectorOrganizationIds(userId);

  if (organizationIds.length === 0) {
    return (
      <ThreepleAppShell
        title="Collector History"
        subtitle="Manual field receipts"
        status={
          <ThreepleBadge tone="neutral">
            No access
          </ThreepleBadge>
        }
      >
        <ThreepleEmptyState
          title="No collector access"
          description="You do not currently have access to field collection history."
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
        currency,
        organization_id
      `)
      .in("organization_id", organizationIds);

  const collectionIds =
    (collections ?? []).map((row) => row.id);

  const collectionMap = new Map(
    (collections ?? []).map((row) => [row.id, row])
  );

  const {
    data: effectiveRows,
    error: effectiveError,
  } =
    collectionIds.length > 0
      ? await supabaseAdmin
          .from("field_contribution_effective_ledger")
          .select(`
            root_event_id,
            collection_id,
            participant_id,
            collector_user_id,
            original_receipt_reference,
            original_amount,
            effective_amount,
            currency,
            effective_payment_method,
            effective_status,
            is_voided,
            is_corrected,
            adjustment_event_id,
            adjustment_receipt_reference,
            adjustment_type,
            correction_reason,
            adjusted_at,
            local_recorded_at,
            server_synced_at,
            original_created_at
          `)
          .in("collection_id", collectionIds)
          .order("original_created_at", {
            ascending: false,
          })
          .limit(500)
      : { data: [], error: null };

  const {
    data: auditEvents,
    error: auditError,
  } =
    collectionIds.length > 0
      ? await supabaseAdmin
          .from("field_contribution_events")
          .select(`
            id,
            receipt_reference,
            collection_id,
            participant_id,
            collector_user_id,
            amount,
            currency,
            payment_method,
            lifecycle_status,
            local_recorded_at,
            server_synced_at,
            note,
            correction_of_event_id,
            correction_reason,
            adjustment_type,
            adjusted_at,
            created_at
          `)
          .in("collection_id", collectionIds)
          .order("created_at", {
            ascending: false,
          })
          .limit(500)
      : { data: [], error: null };

  const participantIds = Array.from(
    new Set([
      ...(effectiveRows ?? []).map(
        (row) => row.participant_id
      ),
      ...(auditEvents ?? []).map(
        (row) => row.participant_id
      ),
    ])
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
    (participants ?? []).map((row) => [row.id, row])
  );

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const todayEffective =
    (effectiveRows ?? []).filter(
      (row) =>
        lagosDateKey(
          row.local_recorded_at ??
            row.original_created_at
        ) === today
    );

  const todayTotal =
    todayEffective.reduce(
      (total, row) =>
        total + Number(row.effective_amount ?? 0),
      0
    );

  const todayCash =
    todayEffective
      .filter(
        (row) =>
          row.effective_payment_method === "cash"
      )
      .reduce(
        (total, row) =>
          total + Number(row.effective_amount ?? 0),
        0
      );

  const todayEffectiveReceipts =
    todayEffective.filter(
      (row) =>
        !row.is_voided &&
        Number(row.effective_amount ?? 0) > 0
    ).length;

  const todayAdjustments =
    (auditEvents ?? []).filter(
      (row) =>
        row.adjustment_type &&
        lagosDateKey(row.created_at) === today
    ).length;

  return (
    <ThreepleAppShell
      title="Collector History"
      subtitle="Financial totals + immutable audit trail"
      status={
        <ThreepleBadge tone="primary">
          Audit
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
              href="/collector/today"
              className="tp-btn tp-btn-secondary"
            >
              Todayâ€™s Route
            </Link>

            <Link
              href="/collector/ledger"
              className="tp-btn tp-btn-secondary"
            >
              Effective Ledger
            </Link>
          </div>
        </div>

        <ThreepleAlert tone="info" className="mt-5">
          Financial totals below use the effective ledger. Corrections replace the original amount, voids contribute zero, and adjustment receipts remain visible separately in the audit trail.
        </ThreepleAlert>

        {(effectiveError || auditError) && (
          <ThreepleAlert tone="danger" className="mt-5">
            Collector history could not be loaded completely. Confirm the Effective Manual Ledger SQL migration has been run.
          </ThreepleAlert>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ThreepleStat
            label="Collected today"
            value={money(
              todayTotal,
              collections?.[0]?.currency ?? "NGN"
            )}
            helper="Effective manual contribution value."
            tone="success"
          />

          <ThreepleStat
            label="Cash today"
            value={money(
              todayCash,
              collections?.[0]?.currency ?? "NGN"
            )}
            helper="Effective cash receipts only."
            tone="primary"
          />

          <ThreepleStat
            label="Effective receipts"
            value={todayEffectiveReceipts}
            helper="Non-voided original receipts effective today."
            tone="primary"
          />

          <ThreepleStat
            label="Adjustments today"
            value={todayAdjustments}
            helper="Correction and void audit events."
            tone="warning"
          />
        </section>

        <section className="mt-8">
          <p className="tp-kicker">
            Effective financial history
          </p>

          <h1 className="tp-heading mt-2 text-2xl">
            One amount per original receipt.
          </h1>

          {(effectiveRows ?? []).length === 0 ? (
            <ThreepleEmptyState
              className="mt-6"
              title="No effective receipts"
              description="Field receipts will appear here once they have reached the Threeple server."
            />
          ) : (
            <div className="mt-6 space-y-3">
              {(effectiveRows ?? []).map((row) => {
                const participant =
                  participantMap.get(row.participant_id);

                const collection =
                  collectionMap.get(row.collection_id);

                return (
                  <article
                    key={row.root_event_id}
                    className="tp-card p-5 sm:p-6"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black">
                            {participant?.full_name ?? "Participant"}
                          </p>

                          {row.is_voided ? (
                            <ThreepleBadge tone="danger">
                              Voided
                            </ThreepleBadge>
                          ) : row.is_corrected ? (
                            <ThreepleBadge tone="warning">
                              Corrected
                            </ThreepleBadge>
                          ) : (
                            <ThreepleBadge tone="success">
                              Effective
                            </ThreepleBadge>
                          )}
                        </div>

                        <p className="mt-1 text-sm text-[var(--tp-muted)]">
                          {collection?.title ?? "Collection"}
                          {" Â· "}
                          {row.original_receipt_reference}
                        </p>

                        <p className="mt-3 text-lg font-black">
                          {money(
                            row.effective_amount,
                            row.currency ??
                              collection?.currency ??
                              "NGN"
                          )}
                        </p>

                        {row.is_corrected && (
                          <p className="mt-1 text-sm text-[var(--tp-muted)]">
                            Original amount:{" "}
                            {money(
                              row.original_amount,
                              row.currency ??
                                collection?.currency ??
                                "NGN"
                            )}
                          </p>
                        )}

                        <p className="mt-2 text-sm text-[var(--tp-muted)]">
                          {methodLabel(row.effective_payment_method)}
                          {" Â· "}
                          {dateTimeLabel(
                            row.local_recorded_at ??
                              row.original_created_at
                          )}
                        </p>

                        {row.correction_reason && (
                          <p className="mt-2 text-sm text-[var(--tp-ink-soft)]">
                            Adjustment reason: {row.correction_reason}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/collector/${row.collection_id}/receipts/${row.root_event_id}`}
                          className="tp-btn tp-btn-secondary"
                        >
                          Original receipt
                        </Link>

                        {row.adjustment_event_id && (
                          <Link
                            href={`/collector/${row.collection_id}/receipts/${row.adjustment_event_id}`}
                            className="tp-btn tp-btn-secondary"
                          >
                            Adjustment receipt
                          </Link>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-10">
          <p className="tp-kicker">
            Immutable audit events
          </p>

          <h2 className="tp-heading mt-2 text-2xl">
            Every recorded event remains visible.
          </h2>

          <p className="tp-body mt-2 max-w-3xl text-sm">
            This section intentionally shows originals, corrections and voids as separate events. Do not use these raw amounts for financial totals.
          </p>

          {(auditEvents ?? []).length === 0 ? (
            <ThreepleEmptyState
              className="mt-6"
              title="No audit events"
              description="No field contribution events have been recorded yet."
            />
          ) : (
            <div className="mt-6 space-y-3">
              {(auditEvents ?? []).map((event) => {
                const participant =
                  participantMap.get(event.participant_id);

                const collection =
                  collectionMap.get(event.collection_id);

                return (
                  <article
                    key={event.id}
                    className="tp-card p-5 sm:p-6"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black">
                            {participant?.full_name ?? "Participant"}
                          </p>

                          <ThreepleBadge
                            tone={statusTone(
                              event.lifecycle_status,
                              event.adjustment_type
                            )}
                          >
                            {event.adjustment_type
                              ? event.adjustment_type
                              : event.lifecycle_status}
                          </ThreepleBadge>
                        </div>

                        <p className="mt-1 text-sm text-[var(--tp-muted)]">
                          {collection?.title ?? "Collection"}
                          {" Â· "}
                          {event.receipt_reference}
                        </p>

                        <p className="mt-2 text-sm font-bold">
                          Raw event amount:{" "}
                          {money(
                            event.amount,
                            event.currency ??
                              collection?.currency ??
                              "NGN"
                          )}
                        </p>

                        <p className="mt-1 text-sm text-[var(--tp-muted)]">
                          {methodLabel(event.payment_method)}
                          {" Â· "}
                          {dateTimeLabel(event.created_at)}
                        </p>

                        {event.correction_of_event_id && (
                          <p className="mt-2 text-xs text-[var(--tp-muted)]">
                            Adjustment of receipt event:{" "}
                            {event.correction_of_event_id}
                          </p>
                        )}
                      </div>

                      <Link
                        href={`/collector/${event.collection_id}/receipts/${event.id}`}
                        className="tp-btn tp-btn-secondary"
                      >
                        View receipt
                      </Link>
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

