import ParticipantControls from "./participant-controls";
import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

import {
  startParticipantPayment,
} from "./payment-actions";

export const instant = false;

type TransparencyLedgerRow = {
  participant_number: number;
  display_name: string | null;
  payment_status: string;
  paid_amount: number | string | null;
  expected_amount: number | string | null;
  is_self: boolean;
  show_participant_names: boolean;
  show_payment_amounts: boolean;
};
type PageProps = {
  params: Promise<{
    participantId: string;
  }>;

  searchParams?: Promise<{
    payment?: string;
  }>;
};

function friendlyText(
  value: string | null | undefined
) {
  if (!value) {
    return "—";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
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
    return "Not set";
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
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function participationStyle(
  status: string,
  active: boolean
) {
  if (!active) {
    return "bg-neutral-200 text-[var(--tp-ink-soft)]";
  }

  switch (status) {
    case "approved":
      return "bg-green-100 text-green-700";
    case "approval_pending":
      return "bg-amber-100 text-amber-700";
    case "joined":
      return "bg-blue-100 text-blue-700";
    case "declined":
      return "bg-red-100 text-red-700";
    case "cancelled":
      return "bg-neutral-200 text-[var(--tp-ink-soft)]";
    default:
      return "bg-neutral-100 text-[var(--tp-ink-soft)]";
  }
}

function collectionStatusStyle(
  status: string
) {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-700";
    case "draft":
      return "bg-amber-100 text-amber-700";
    case "closed":
      return "bg-neutral-200 text-neutral-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-neutral-100 text-[var(--tp-ink-soft)]";
  }
}

function paymentMessage(
  code?: string
) {
  switch (code) {
    case "verified":
      return {
        type: "info",
        text:
          "Payment confirmed successfully. Your Threeple contribution record has been updated.",
      };

    case "pending":
      return {
        type: "info",
        text:
          "Paystack has not confirmed this payment as successful yet. Threeple will continue reconciling it.",
      };

    case "verification_failed":
      return {
        type: "error",
        text:
          "Threeple could not verify this payment automatically. Your payment record has been preserved for reconciliation.",
      };

    case "returned":
      return {
        type: "info",
        text:
          "You have returned from Paystack. Threeple is checking the payment status.",
      };
    case "already_paid":
      return {
        type: "info",
        text:
          "This contribution is already marked as paid.",
      };
    case "approval_required":
      return {
        type: "error",
        text:
          "The organizer must approve your participation before payment.",
      };
    case "settlement_not_ready":
      return {
        type: "error",
        text:
          "The organizer has not finished connecting a settlement account yet.",
      };
    case "collection_unavailable":
      return {
        type: "error",
        text:
          "This Collection is not currently accepting payments.",
      };
    case "participation_inactive":
      return {
        type: "error",
        text:
          "Your participation is not active, so payment cannot be started.",
      };
    case "email_required":
      return {
        type: "error",
        text:
          "A participant email address is required to start a Paystack payment.",
      };
    case "amount_unavailable":
    case "fee_invalid":
      return {
        type: "error",
        text:
          "Threeple could not determine a valid payment amount for this contribution.",
      };
    case "initialization_failed":
      return {
        type: "error",
        text:
          "Threeple could not start the Paystack checkout. Please try again.",
      };
    case "not_allowed":
      return {
        type: "error",
        text:
          "You do not have access to start payment for this participant record.",
      };
    default:
      return null;
  }
}

function paymentMessageStyle(
  type: string
) {
  if (
    type === "error"
  ) {
    return "border-[var(--tp-danger-border)] bg-[var(--tp-danger-soft)] text-red-700";
  }

  return "border-blue-200 bg-blue-50 text-blue-700";
}

export default async function ParticipantCollectionPage({
  params,
  searchParams,
}: PageProps) {
  const {
    participantId,
  } = await params;

  const query =
    await searchParams;

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
    redirect("/auth/login");
  }

  const {
    data: participant,
    error: participantError,
  } = await supabaseAdmin
    .from("participants")
    .select(`
      id,
      collection_id,
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
      "id",
      participantId
    )
    .eq(
      "user_id",
      userId
    )
    .maybeSingle();

  if (
    participantError ||
    !participant
  ) {
    console.error(
      "PARTICIPANT_WORKSPACE_LOOKUP_FAILED",
      {
        participantId,
        userId,
        errorCode:
          participantError?.code,
        errorMessage:
          participantError?.message,
      }
    );

    redirect(
      "/my-collections?error=participant_not_found"
    );
  }

  const {
    data: collection,
    error: collectionError,
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
      visibility,
      access_mode,
      requires_approval,
      status,
      archived_at,
      created_at
    `)
    .eq(
      "id",
      participant.collection_id
    )
    .maybeSingle();

  if (
    collectionError ||
    !collection
  ) {
    notFound();
  }

  const {
    data: organization,
  } = await supabaseAdmin
    .from("organizations")
    .select(`
      id,
      name,
      organization_type
    `)
    .eq(
      "id",
      collection.organization_id
    )
    .maybeSingle();

  const {
    data: beneficiary,
  } = await supabaseAdmin
    .from("collection_beneficiaries")
    .select(`
      settlement_profile_id
    `)
    .eq(
      "collection_id",
      collection.id
    )
    .eq(
      "beneficiary_role",
      "primary"
    )
    .eq(
      "is_active",
      true
    )
    .maybeSingle();

  let settlementReady = false;

  if (
    beneficiary?.settlement_profile_id
  ) {
    const {
      data: settlementProfile,
    } = await supabaseAdmin
      .from("settlement_profiles")
      .select(`
        provider,
        provider_recipient_reference,
        verification_status,
        is_active
      `)
      .eq(
        "id",
        beneficiary.settlement_profile_id
      )
      .maybeSingle();

    settlementReady =
      Boolean(
        settlementProfile?.is_active &&
        settlementProfile.provider ===
          "paystack" &&
        settlementProfile.provider_recipient_reference?.startsWith(
          "ACCT_"
        ) &&
        [
          "provider_connected",
          "provider_verified",
        ].includes(
          settlementProfile.verification_status
        )
      );
  }

  let currentRotationObligation:
    | {
        id: string;
        cycle_id: string;
        amount_due: number | string;
        amount_paid: number | string;
        status: string;
        cycle_number: number;
        scheduled_date: string;
        recipient_name: string | null;
      }
    | null =
      null;

  if (
    collection.collection_mode ===
      "rotating_pool"
  ) {
    const {
      data: rotationCycles,
    } = await supabase
      .from("rotation_cycle_summary")
      .select(`
        cycle_id,
        cycle_number,
        scheduled_date,
        recipient_name,
        status
      `)
      .eq(
        "collection_id",
        collection.id
      )
      .in(
        "status",
        [
          "scheduled",
          "open",
        ]
      )
      .order(
        "cycle_number",
        {
          ascending: true,
        }
      );

    if (rotationCycles?.length) {
      const cycleIds =
        rotationCycles.map(
          (cycle) =>
            cycle.cycle_id
        );

      const {
        data: obligations,
      } = await supabase
        .from(
          "rotation_cycle_obligations"
        )
        .select(`
          id,
          cycle_id,
          amount_due,
          amount_paid,
          status
        `)
        .eq(
          "participant_id",
          participant.id
        )
        .in(
          "cycle_id",
          cycleIds
        )
        .in(
          "status",
          [
            "pending",
            "partial",
          ]
        );

      const obligationByCycle =
        new Map(
          (obligations ?? []).map(
            (obligation) => [
              obligation.cycle_id,
              obligation,
            ]
          )
        );

      const cycle =
        rotationCycles.find(
          (candidate) =>
            obligationByCycle.has(
              candidate.cycle_id
            )
        );

      if (cycle) {
        const obligation =
          obligationByCycle.get(
            cycle.cycle_id
          );

        if (obligation) {
          currentRotationObligation = {
            ...obligation,
            cycle_number:
              cycle.cycle_number,
            scheduled_date:
              cycle.scheduled_date,
            recipient_name:
              cycle.recipient_name,
          };
        }
      }
    }
  }
  const expectedAmount =
    collection.collection_mode ===
      "rotating_pool"
      ? currentRotationObligation
        ? Math.max(
            0,
            Number(
              currentRotationObligation.amount_due
            ) -
              Number(
                currentRotationObligation.amount_paid ??
                  0
              )
          )
        : null
      : participant.expected_amount !==
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
  const {
    data: dashboardRows,
    error: dashboardError,
  } = await supabase.rpc(
    "get_participant_dashboard_summary",
    {
      p_participant_id: participant.id,
    }
  );

  if (dashboardError) {
    console.error(
      "PARTICIPANT_DASHBOARD_SUMMARY_ERROR:",
      dashboardError
    );
  }

  const dashboard =
    dashboardRows?.[0] ?? null;

  const paidAmount =
    dashboard?.paid_amount !== undefined
      ? Number(dashboard.paid_amount)
      : 0;

  const outstandingAmount =
    dashboard?.outstanding_amount !== undefined
      ? Number(dashboard.outstanding_amount)
      : expectedAmount ?? 0;

  const collectionRaised =
    dashboard?.collection_amount_raised !== undefined
      ? Number(dashboard.collection_amount_raised)
      : 0;

  const progressPercent =
    dashboard?.progress_percent !== null &&
    dashboard?.progress_percent !== undefined
      ? Number(dashboard.progress_percent)
      : null;


  const {
    data: ledgerRows,
    error: ledgerError,
  } = await supabase.rpc(
    "get_participant_transparency_ledger",
    {
      p_participant_id: participant.id,
    }
  );

  if (ledgerError) {
    console.error(
      "PARTICIPANT_LEDGER_ERROR:",
      ledgerError
    );
  }

  const ledger = (ledgerRows ?? []) as TransparencyLedgerRow[];

  const ledgerPrivacy =
    ledger[0] ?? null;

  const archived =
    Boolean(
      collection.archived_at
    );

  const requiresApproval =
    collection.requires_approval;

  const approvedForPayment =
    !requiresApproval ||
    participant.participation_status ===
      "approved";

  const paymentReady =
    collection.status ===
      "active" &&
    !archived &&
    participant.is_active &&
    approvedForPayment &&
    (collection.collection_mode === "rotating_pool" ||
      participant.payment_status !== "paid") &&
    expectedAmount !== null &&
    expectedAmount > 0 &&
    Boolean(
      participant.email
    ) &&
    settlementReady;

  const message =
    paymentMessage(
      query?.payment
    );

  return (
    <main className="min-h-screen bg-[var(--tp-bg)] text-[var(--tp-ink)]">
      <header className="border-b border-[var(--tp-border)] bg-[var(--tp-surface)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link
            href="/my-collections"
          >
            <div className="text-2xl font-black tracking-tight text-[var(--tp-primary)]">
              Threeple
            </div>

            <p className="text-sm text-[var(--tp-muted)]">
              Collect. Coordinate. Track.
            </p>
          </Link>

          <Link
            href="/my-collections"
            className="text-sm font-bold text-[var(--tp-ink-soft)] hover:text-[var(--tp-primary)]"
          >
            ← My Collections
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pb-10 sm:pt-8 lg:px-8 lg:py-10">
        {message && (
          <div
            className={`mb-6 rounded-2xl border p-4 text-sm ${paymentMessageStyle(
              message.type
            )}`}
          >
            {message.text}
          </div>
        )}

        {archived && (
          <section className="mb-6 rounded-[1.5rem] border border-[var(--tp-border)] bg-[var(--tp-bg-soft)] p-5">
            <p className="font-semibold">
              This Collection is archived
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--tp-ink-soft)]">
              The organizer has archived this Collection. Your historical participation record remains available.
            </p>
          </section>
        )}

        <section>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${collectionStatusStyle(
                collection.status
              )}`}
            >
              {friendlyText(
                collection.status
              )}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${participationStyle(
                participant.participation_status,
                participant.is_active
              )}`}
            >
              {participant.is_active
                ? friendlyText(
                    participant.participation_status
                  )
                : "Inactive"}
            </span>

            {archived && (
              <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold text-white">
                Archived
              </span>
            )}
          </div>

          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--tp-faint)]">
            My Collection
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-[-0.035em] text-[var(--tp-ink)] md:text-4xl">
            {collection.title}
          </h1>

          {collection.description && (
            <p className="mt-4 max-w-2xl leading-7 text-[var(--tp-ink-soft)]">
              {collection.description}
            </p>
          )}
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.5rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] p-5 shadow-[var(--tp-shadow-sm)]">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
              Your status
            </p>

            <p className="mt-3 text-lg font-black text-[var(--tp-ink)]">
              {participant.is_active
                ? friendlyText(
                    participant.participation_status
                  )
                : "Inactive"}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] p-5 shadow-[var(--tp-shadow-sm)]">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
              Expected
            </p>

            <p className="mt-3 text-lg font-black text-[var(--tp-ink)]">
              {formatMoney(
                expectedAmount,
                collection.currency
              )}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] p-5 shadow-[var(--tp-shadow-sm)]">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
              Contribution status
            </p>

            <p className="mt-3 text-lg font-black text-[var(--tp-ink)]">
              {friendlyText(
                participant.payment_status
              )}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] p-5 shadow-[var(--tp-shadow-sm)]">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
              Joined via
            </p>

            <p className="mt-3 text-lg font-black text-[var(--tp-ink)]">
              {friendlyText(
                participant.join_method
              )}
            </p>
          </div>
        </section>

        {participant.participation_status ===
          "approval_pending" &&
          participant.is_active && (
            <section className="mt-6 rounded-2xl border border-[var(--tp-warning-border)] bg-[var(--tp-warning-soft)] p-5">
              <h2 className="font-semibold text-[var(--tp-warning)]">
                Awaiting organizer approval
              </h2>

              <p className="mt-2 text-sm leading-6 text-[var(--tp-warning)]">
                The organizer must approve your participation before payment can be started.
              </p>
            </section>
          )}

        {participant.participation_status ===
          "declined" && (
            <section className="mt-6 rounded-2xl border border-[var(--tp-danger-border)] bg-[var(--tp-danger-soft)] p-5">
              <h2 className="font-semibold text-[var(--tp-danger)]">
                Participation declined
              </h2>

              <p className="mt-2 text-sm leading-6 text-[var(--tp-danger)]">
                The organizer has not approved your participation in this Collection.
              </p>
            </section>
          )}

        {!participant.is_active && (
          <section className="mt-6 rounded-[1.5rem] border border-[var(--tp-border)] bg-[var(--tp-bg-soft)] p-5">
            <h2 className="font-semibold">
              Participation inactive
            </h2>

            <p className="mt-2 text-sm leading-6 text-[var(--tp-ink-soft)]">
              Your participant record is preserved, but your participation is not currently active.
            </p>
          </section>
        )}

        <section className="mt-8 rounded-[2rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] p-5 shadow-[var(--tp-shadow-sm)] sm:p-6 md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
            Collection overview
          </p>

          <h2 className="mt-2 text-xl font-black tracking-tight text-[var(--tp-ink)]">
            About this collection
          </h2>

          <div className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2">
            <div>
              <p className="text-xs text-[var(--tp-faint)]">
                Collection Type
              </p>

              <p className="mt-1 text-sm font-medium">
                {friendlyText(
                  collection.collection_type
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-[var(--tp-faint)]">
                Collection Mode
              </p>

              <p className="mt-1 text-sm font-medium">
                {friendlyText(
                  collection.collection_mode
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-[var(--tp-faint)]">
                Organizer
              </p>

              <p className="mt-1 text-sm font-medium">
                {organization?.name ??
                  "Threeple Organizer"}
              </p>
            </div>

            <div>
              <p className="text-xs text-[var(--tp-faint)]">
                Workspace Type
              </p>

              <p className="mt-1 text-sm font-medium">
                {friendlyText(
                  organization?.organization_type
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-[var(--tp-faint)]">
                Deadline
              </p>

              <p className="mt-1 text-sm font-medium">
                {collection.deadline
                  ? new Date(
                      collection.deadline
                    ).toLocaleString(
                      "en-NG"
                    )
                  : "No deadline"}
              </p>
            </div>

            <div>
              <p className="text-xs text-[var(--tp-faint)]">
                Access Type
              </p>

              <p className="mt-1 text-sm font-medium">
                {friendlyText(
                  collection.access_mode
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] p-5 shadow-[var(--tp-shadow-sm)] sm:p-6 md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
            Your participation
          </p>

          <h2 className="mt-2 text-xl font-black tracking-tight text-[var(--tp-ink)]">
            Your place in this collection
          </h2>

          <div className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2">
            <div>
              <p className="text-xs text-[var(--tp-faint)]">
                Name
              </p>

              <p className="mt-1 text-sm font-medium">
                {participant.full_name}
              </p>
            </div>

            <div>
              <p className="text-xs text-[var(--tp-faint)]">
                Email
              </p>

              <p className="mt-1 text-sm font-medium">
                {participant.email ||
                  "Not provided"}
              </p>
            </div>

            <div>
              <p className="text-xs text-[var(--tp-faint)]">
                Phone
              </p>

              <p className="mt-1 text-sm font-medium">
                {participant.phone ||
                  "Not provided"}
              </p>
            </div>

            <div>
              <p className="text-xs text-[var(--tp-faint)]">
                Joined
              </p>

              <p className="mt-1 text-sm font-medium">
                {new Date(
                  participant.created_at
                ).toLocaleString(
                  "en-NG"
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] p-5 shadow-[var(--tp-shadow-sm)] sm:p-6 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
                Contributions
              </p>

              <h2 className="mt-2 text-xl font-black tracking-tight text-[var(--tp-ink)]">
                Your contribution
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--tp-muted)]">
                See what is expected from you and your current contribution status. Electronic payments are processed securely through Paystack; Threeple keeps the contribution record and transparency layer.
              </p>

              {collection.collection_mode ===
                "rotating_pool" &&
                currentRotationObligation && (
                <div className="mt-4 rounded-2xl bg-neutral-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
                    Current rotation cycle
                  </p>

                  <p className="mt-2 font-semibold">
                    Cycle {currentRotationObligation.cycle_number}
                    {" · "}
                    Recipient:{" "}
                    {currentRotationObligation.recipient_name ??
                      "Participant"}
                  </p>

                  <p className="mt-1 text-xs text-[var(--tp-muted)]">
                    Scheduled{" "}
                    {new Date(
                      currentRotationObligation.scheduled_date
                    ).toLocaleDateString(
                      "en-NG",
                      {
                        dateStyle: "medium",
                      }
                    )}
                  </p>
                </div>
              )}
              <p className="mt-4 text-3xl font-black tracking-tight text-[var(--tp-primary)]">
                {formatMoney(
                  expectedAmount,
                  collection.currency
                )}
              </p>
            </div>

            {collection.collection_mode !== "rotating_pool" &&
            participant.payment_status === "paid" ? (
              <span className="w-fit rounded-full bg-[var(--tp-success-soft)] px-4 py-2 text-sm font-black text-[var(--tp-success)]">
                Paid
              </span>
            ) : paymentReady ? (
              <form
                action={
                  startParticipantPayment
                }
              >
                <input
                  type="hidden"
                  name="participant_id"
                  value={
                    participant.id
                  }
                />

                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-black px-6 text-sm font-semibold text-white hover:bg-neutral-800"
                >
                  Pay with Paystack
                </button>
              </form>
            ) : (
              <span className="w-fit rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700">
                Payment unavailable
              </span>
            )}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-neutral-50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
                Required
              </p>
              <p className="mt-2 text-xl font-black tracking-tight text-[var(--tp-ink)]">
                {formatMoney(
                  expectedAmount,
                  collection.currency
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-neutral-50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
                Verified paid
              </p>
              <p className="mt-2 text-xl font-black tracking-tight text-[var(--tp-ink)]">
                {formatMoney(
                  paidAmount,
                  collection.currency
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-neutral-50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
                Outstanding
              </p>
              <p className="mt-2 text-xl font-black tracking-tight text-[var(--tp-ink)]">
                {formatMoney(
                  outstandingAmount,
                  collection.currency
                )}
              </p>
            </div>
          </div>

          {dashboard?.target_amount !== null &&
            dashboard?.target_amount !== undefined && (
              <div className="mt-6 rounded-2xl bg-neutral-50 p-5">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-[var(--tp-muted)]">
                    Collection progress
                  </span>
                  <span className="font-semibold">
                    {progressPercent !== null
                      ? `${progressPercent}%`
                      : "—"}
                  </span>
                </div>

                <div className="mt-3 h-3 overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full rounded-full bg-black"
                    style={{
                      width: `${Math.min(
                        progressPercent ?? 0,
                        100
                      )}%`,
                    }}
                  />
                </div>

                <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-[var(--tp-muted)]">
                  <span>
                    {formatMoney(
                      collectionRaised,
                      collection.currency
                    )} raised
                  </span>

                  <span>
                    {formatMoney(
                      Number(dashboard.target_amount),
                      collection.currency
                    )} target
                  </span>
                </div>
              </div>
            )}

          {dashboard && (
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border p-4">
                <p className="text-xs text-[var(--tp-faint)]">
                  Joined participants
                </p>
                <p className="mt-1 font-semibold">
                  {dashboard.joined_participants}
                </p>
              </div>

              <div className="rounded-2xl border p-4">
                <p className="text-xs text-[var(--tp-faint)]">
                  Planned participants
                </p>
                <p className="mt-1 font-semibold">
                  {dashboard.expected_participant_count ?? "—"}
                </p>
              </div>

              <div className="rounded-2xl border p-4">
                <p className="text-xs text-[var(--tp-faint)]">
                  Remaining slots
                </p>
                <p className="mt-1 font-semibold">
                  {dashboard.remaining_slots ?? "—"}
                </p>
              </div>
            </div>
          )}

          {!paymentReady &&
            (collection.collection_mode === "rotating_pool" ||
      participant.payment_status !== "paid") && (
              <div className="mt-5 rounded-[1.5rem] border border-[var(--tp-border)] bg-[var(--tp-bg-soft)] p-4 text-sm leading-6 text-[var(--tp-ink-soft)]">
                {!participant.email
                  ? "Add an email address to this participant record before payment can begin."
                  : !settlementReady
                    ? "The organizer must connect a settlement account before participant payments can begin."
                    : !approvedForPayment
                      ? "Organizer approval is required before payment."
                      : collection.status !==
                            "active" ||
                          archived
                        ? "This Collection is not currently accepting payments."
                        : "Payment is not currently available for this participation record."}
              </div>
            )}
        </section>

        <section className="mt-8 rounded-[2rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] p-5 shadow-[var(--tp-shadow-sm)] sm:p-6 md:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
                Transparency
              </p>
              <h2 className="mt-2 text-xl font-black tracking-tight text-[var(--tp-ink)]">
                Contribution ledger
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--tp-muted)]">
                See participation and contribution progress across this Collection. Names and amounts follow the organizer&apos;s privacy settings.
              </p>
            </div>

            <span className="w-fit rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-[var(--tp-ink-soft)]">
              {ledger.length} participant{ledger.length === 1 ? "" : "s"}
            </span>
          </div>

          {ledger.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-neutral-50 p-5 text-sm text-[var(--tp-muted)]">
              No participant activity is available yet.
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl border">
              <div className="grid grid-cols-[1fr_auto] gap-4 border-b bg-neutral-50 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)] sm:grid-cols-[1.5fr_1fr_1fr]">
                <span>Participant</span>
                <span>Status</span>
                <span className="hidden sm:block">Contribution</span>
              </div>

              <div className="divide-y">
                {ledger.map((entry) => {
                  const label =
                    entry.display_name ??
                    `Participant ${entry.participant_number}`;

                  const paid =
                    entry.paid_amount !== null &&
                    entry.paid_amount !== undefined
                      ? Number(entry.paid_amount)
                      : null;

                  return (
                    <div
                      key={String(entry.participant_number)}
                      className="grid grid-cols-[1fr_auto] gap-4 px-4 py-4 text-sm sm:grid-cols-[1.5fr_1fr_1fr]"
                    >
                      <div>
                        <p className="font-medium">
                          {label}
                          {entry.is_self ? " (You)" : ""}
                        </p>
                        {!entry.show_participant_names &&
                          !entry.is_self && (
                            <p className="mt-1 text-xs text-[var(--tp-faint)]">
                              Name hidden by organizer
                            </p>
                          )}
                      </div>

                      <div>
                        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">
                          {friendlyText(entry.payment_status)}
                        </span>
                      </div>

                      <div className="hidden sm:block">
                        {paid !== null ? (
                          <span className="font-medium">
                            {formatMoney(
                              paid,
                              collection.currency
                            )}
                          </span>
                        ) : (
                          <span className="text-[var(--tp-faint)]">
                            Hidden
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {ledgerPrivacy && (
            <div className="mt-4 text-xs leading-5 text-[var(--tp-faint)]">
              {!ledgerPrivacy.show_participant_names &&
                "Participant names are hidden. "}
              {!ledgerPrivacy.show_payment_amounts &&
                "Contribution amounts are hidden for other participants."}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
