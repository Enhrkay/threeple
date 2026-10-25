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

export default async function EffectiveFieldLedgerPage() {
  const supabase = await createClient();

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect(
      `/auth/login?next=${encodeURIComponent("/collector/ledger")}`
    );
  }

  const organizationIds =
    await getCollectorOrganizationIds(userId);

  if (organizationIds.length === 0) {
    return (
      <ThreepleAppShell
        title="Effective Ledger"
        subtitle="Field contributions"
        status={
          <ThreepleBadge tone="neutral">
            No access
          </ThreepleBadge>
        }
      >
        <ThreepleEmptyState
          title="No collector access"
          description="You do not currently have access to field collection data."
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

  const { data: ledgerRows, error: ledgerError } =
    collectionIds.length > 0
      ? await supabaseAdmin
          .from("field_contribution_effective_ledger")
          .select(`
            root_event_id,
            original_receipt_reference,
            collection_id,
            participant_id,
            collector_user_id,
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
            adjusted_by_user_id,
            adjusted_at,
            local_recorded_at,
            server_synced_at,
            original_note,
            original_created_at
          `)
          .in("collection_id", collectionIds)
          .order("original_created_at", {
            ascending: false,
          })
          .limit(500)
      : { data: [], error: null };

  const participantIds = Array.from(
    new Set(
      (ledgerRows ?? []).map((row) => row.participant_id)
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
    (participants ?? []).map((row) => [row.id, row])
  );

  const rows = ledgerRows ?? [];

  const effectiveTotal = rows.reduce(
    (total, row) =>
      total + Number(row.effective_amount ?? 0),
    0
  );

  const correctedCount =
    rows.filter((row) => row.is_corrected).length;

  const voidedCount =
    rows.filter((row) => row.is_voided).length;

  const syncedCount =
    rows.filter(
      (row) =>
        row.effective_status === "synced" ||
        row.effective_status === "corrected"
    ).length;

  return (
    <ThreepleAppShell
      title="Effective Ledger"
      subtitle="Authoritative manual contribution totals"
      status={
        <ThreepleBadge tone="primary">
          Audit-safe
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
              href="/collector/history"
              className="tp-btn tp-btn-secondary"
            >
              Audit History
            </Link>
          </div>
        </div>

        <ThreepleAlert tone="info" className="mt-5">
          This is the financial view of manual field receipts. Original and adjustment events remain immutable in the audit history, but each original receipt contributes only one effective amount to totals.
        </ThreepleAlert>

        {ledgerError && (
          <ThreepleAlert tone="danger" className="mt-5">
            The effective ledger could not be read. Confirm the Effective Manual Ledger SQL migration has been run.
          </ThreepleAlert>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ThreepleStat
            label="Effective collected"
            value={money(
              effectiveTotal,
              collections?.[0]?.currency ?? "NGN"
            )}
            helper="Corrections replace originals; voids contribute zero."
            tone="success"
          />

          <ThreepleStat
            label="Effective receipts"
            value={rows.length}
            helper="One financial row per original field receipt."
            tone="primary"
          />

          <ThreepleStat
            label="Corrected"
            value={correctedCount}
            helper="Receipts whose latest adjustment is a correction."
            tone="warning"
          />

          <ThreepleStat
            label="Voided"
            value={voidedCount}
            helper={`${syncedCount} receipt(s) currently synced/corrected.`}
            tone="warning"
          />
        </section>

        <section className="mt-8">
          <p className="tp-kicker">
            Effective receipts
          </p>

          <h1 className="tp-heading mt-2 text-2xl">
            One financial amount per original receipt.
          </h1>

          {rows.length === 0 ? (
            <ThreepleEmptyState
              className="mt-6"
              title="No field receipts yet"
              description="Manual contribution receipts will appear here after they reach the Threeple server."
            />
          ) : (
            <div className="mt-6 space-y-3">
              {rows.map((row) => {
                const collection =
                  collectionMap.get(row.collection_id);

                const participant =
                  participantMap.get(row.participant_id);

                return (
                  <article
                    key={row.root_event_id}
                    className="tp-card p-5 sm:p-6"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
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
                            Original:{" "}
                            {money(
                              row.original_amount,
                              row.currency ??
                                collection?.currency ??
                                "NGN"
                            )}
                          </p>
                        )}

                        <p className="mt-3 text-sm text-[var(--tp-muted)]">
                          {methodLabel(row.effective_payment_method)}
                          {" Â· "}
                          {participant?.phone ?? "No phone number"}
                        </p>

                        {row.correction_reason && (
                          <p className="mt-3 text-sm text-[var(--tp-ink-soft)]">
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
      </div>
    </ThreepleAppShell>
  );
}

