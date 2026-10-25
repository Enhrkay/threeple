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
  ThreepleAlert,
  ThreepleBadge,
} from "@/components/threeple/design-system";

import {
  adjustFieldReceipt,
} from "./actions";

export const instant = false;

type PageProps = {
  params: Promise<{
    eventId: string;
  }>;

  searchParams?: Promise<{
    error?: string;
  }>;
};

function message(
  code?: string
) {
  switch (code) {
    case "reason_required":
      return "Enter a reason of at least 5 characters.";
    case "amount_required":
      return "Enter a valid corrected amount.";
    case "already_voided":
      return "This receipt has already been voided.";
    case "adjustment_not_allowed":
      return "An adjustment receipt cannot be adjusted again from this screen.";
    case "not_owner":
      return "Only the collector who created this receipt can adjust it.";
    case "not_allowed":
      return "You no longer have permission to manage this collection.";
    case "not_found":
      return "The field receipt could not be found.";
    case "save_failed":
      return "Threeple could not save this adjustment.";
    case "invalid_action":
      return "Choose correction or void.";
    default:
      return null;
  }
}

function money(
  value:
    | number
    | string,
  currency: string
) {
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

export default async function AdjustReceiptPage({
  params,
  searchParams,
}: PageProps) {
  const {
    eventId,
  } =
    await params;

  const query =
    await searchParams;

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
        `/collector/receipts/${eventId}/adjust`
      )}`
    );
  }

  const {
    data: event,
  } =
    await supabaseAdmin
      .from(
        "field_contribution_events"
      )
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
        correction_of_event_id
      `)
      .eq(
        "id",
        eventId
      )
      .maybeSingle();

  if (!event) {
    redirect(
      "/collector/history"
    );
  }

  const {
    data: participant,
  } =
    await supabaseAdmin
      .from(
        "participants"
      )
      .select(`
        full_name
      `)
      .eq(
        "id",
        event.participant_id
      )
      .maybeSingle();

  const {
    data: collection,
  } =
    await supabaseAdmin
      .from("collections")
      .select(`
        title
      `)
      .eq(
        "id",
        event.collection_id
      )
      .maybeSingle();

  const errorMessage =
    message(
      query?.error
    );

  const locked =
    Boolean(
      event.correction_of_event_id
    ) ||
    event.lifecycle_status ===
      "voided" ||
    event.collector_user_id !==
      userId;

  return (
    <ThreepleAppShell
      title="Adjust Receipt"
      subtitle="Immutable audit trail"
      status={
        <ThreepleBadge tone="warning">
          Manual ledger
        </ThreepleBadge>
      }
    >
      <div className="mx-auto max-w-3xl">
        <Link
          href="/collector/history"
          className="text-sm font-black text-[var(--tp-primary)]"
        >
          Back to Receipt History
        </Link>

        <ThreepleAlert
          tone="warning"
          className="mt-5"
        >
          Threeple never edits the original field receipt. A correction or void creates a new linked audit event instead.
        </ThreepleAlert>

        {errorMessage && (
          <ThreepleAlert
            tone="danger"
            className="mt-5"
          >
            {errorMessage}
          </ThreepleAlert>
        )}

        <section className="tp-card mt-5 p-6 sm:p-8">
          <p className="tp-kicker">
            Original receipt
          </p>

          <h1 className="tp-heading mt-2 text-2xl">
            {participant?.full_name ??
              "Participant"}
          </h1>

          <p className="mt-1 text-sm text-[var(--tp-muted)]">
            {collection?.title ??
              "Collection"}
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-[var(--tp-muted)]">
                Receipt
              </p>
              <p className="mt-1 font-mono text-sm font-black">
                {event.receipt_reference}
              </p>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-wider text-[var(--tp-muted)]">
                Recorded amount
              </p>
              <p className="mt-1 text-lg font-black">
                {money(
                  event.amount,
                  event.currency
                )}
              </p>
            </div>
          </div>
        </section>

        {locked ? (
          <ThreepleAlert
            tone="danger"
            className="mt-5"
          >
            This receipt cannot be adjusted from this account or state.
          </ThreepleAlert>
        ) : (
          <form
            action={
              adjustFieldReceipt
            }
            className="tp-card mt-5 space-y-5 p-6 sm:p-8"
          >
            <input
              type="hidden"
              name="event_id"
              value={event.id}
            />

            <div>
              <label
                htmlFor="action"
                className="text-sm font-black"
              >
                Adjustment type
              </label>

              <select
                id="action"
                name="action"
                required
                defaultValue="correction"
                className="tp-input mt-2 w-full"
              >
                <option value="correction">
                  Correction
                </option>
                <option value="void">
                  Void receipt
                </option>
              </select>

              <p className="mt-2 text-xs leading-5 text-[var(--tp-muted)]">
                For a void, corrected amount and method are ignored.
              </p>
            </div>

            <div>
              <label
                htmlFor="corrected_amount"
                className="text-sm font-black"
              >
                Corrected amount
              </label>

              <input
                id="corrected_amount"
                name="corrected_amount"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={
                  Number(
                    event.amount
                  )
                }
                className="tp-input mt-2 w-full"
              />
            </div>

            <div>
              <label
                htmlFor="corrected_method"
                className="text-sm font-black"
              >
                Corrected method
              </label>

              <select
                id="corrected_method"
                name="corrected_method"
                defaultValue={
                  event.payment_method
                }
                className="tp-input mt-2 w-full"
              >
                <option value="cash">
                  Cash
                </option>
                <option value="bank_transfer_manual">
                  Bank transfer
                </option>
                <option value="pos_manual">
                  POS
                </option>
                <option value="other_manual">
                  Other manual
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="reason"
                className="text-sm font-black"
              >
                Reason
              </label>

              <textarea
                id="reason"
                name="reason"
                required
                minLength={5}
                rows={3}
                className="tp-input mt-2 w-full"
                placeholder="Why is this receipt being corrected or voided?"
              />
            </div>

            <div>
              <label
                htmlFor="note"
                className="text-sm font-black"
              >
                Internal note
              </label>

              <textarea
                id="note"
                name="note"
                rows={3}
                className="tp-input mt-2 w-full"
                placeholder="Optional additional context"
              />
            </div>

            <button
              type="submit"
              className="tp-btn tp-btn-primary w-full sm:w-auto"
            >
              Save adjustment
            </button>
          </form>
        )}
      </div>
    </ThreepleAppShell>
  );
}

