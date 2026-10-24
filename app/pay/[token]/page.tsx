import {
  notFound,
} from "next/navigation";

import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

import CheckoutForm from "./checkout-form";

export const instant = false;

type PageProps = {
  params: Promise<{
    token: string;
  }>;
};

function formatMoney(
  amount: number,
  currency: string
) {
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

function friendlyStatus(
  status: string
) {
  switch (status) {
    case "paid":
      return "Paid";

    case "partial":
      return "Partially paid";

    case "pending":
      return "Payment pending";

    case "overdue":
      return "Overdue";

    case "exempted":
      return "Exempted";

    case "not_required":
      return "No payment required";

    default:
      return "Payment due";
  }
}

export default async function PayPage({
  params,
}: PageProps) {
  const { token } =
    await params;

  // =======================================================
  // PARTICIPANT
  // =======================================================

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
      is_active
    `)
    .eq(
      "payment_access_token",
      token
    )
    .maybeSingle();

  if (
    participantError ||
    !participant ||
    !participant.is_active
  ) {
    notFound();
  }

  // =======================================================
  // COLLECTION
  // =======================================================

  const {
    data: collection,
    error: collectionError,
  } = await supabaseAdmin
    .from("collections")
    .select(`
      id,
      title,
      description,
      collection_type,
      collection_mode,
      currency,
      default_amount,
      allow_partial_payments,
      allow_custom_amount,
      deadline,
      status
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

  const currency =
    collection.currency ||
    "NGN";

  const collectionActive =
    collection.status ===
    "active";

  // =======================================================
  // VERIFIED PAYMENTS
  // =======================================================

  const {
    data: paymentRows,
  } = await supabaseAdmin
    .from("payments")
    .select(`
      amount,
      refunded_amount,
      status,
      verified_at
    `)
    .eq(
      "participant_id",
      participant.id
    )
    .eq(
      "collection_id",
      collection.id
    );

  let amountPaid = 0;

  for (
    const payment
    of paymentRows ?? []
  ) {
    if (!payment.verified_at) {
      continue;
    }

    const amount =
      Number(
        payment.amount ?? 0
      );

    const refunded =
      Number(
        payment.refunded_amount ??
          0
      );

    if (
      payment.status ===
      "success"
    ) {
      amountPaid += amount;
    }

    if (
      payment.status ===
      "partially_refunded"
    ) {
      amountPaid +=
        Math.max(
          0,
          amount - refunded
        );
    }
  }

  amountPaid =
    Math.round(
      amountPaid * 100
    ) / 100;

  // =======================================================
  // EXPECTED AMOUNT
  // =======================================================

  let expectedAmount:
    | number
    | null =
    participant.expected_amount !==
      null
      ? Number(
          participant.expected_amount
        )
      : null;

  if (
    expectedAmount === null &&
    (
      collection.collection_mode ===
        "fixed_per_person" ||
      collection.collection_mode ===
        "event_fee"
    )
  ) {
    expectedAmount =
      collection.default_amount !==
        null
        ? Number(
            collection.default_amount
          )
        : null;
  }

  // =======================================================
  // CYCLE BASED COLLECTIONS
  // =======================================================

  const cycleBased =
    collection.collection_mode ===
      "recurring_dues" ||
    collection.collection_mode ===
      "rotating_pool";

  let recurringAmountDue = 0;

  if (cycleBased) {
    const {
      data: obligations,
    } = await supabaseAdmin
      .from(
        "participant_obligations"
      )
      .select(`
        amount_due,
        amount_paid,
        status
      `)
      .eq(
        "participant_id",
        participant.id
      )
      .in(
        "status",
        [
          "unpaid",
          "pending",
          "partial",
          "overdue",
        ]
      );

    for (
      const obligation
      of obligations ?? []
    ) {
      recurringAmountDue +=
        Math.max(
          0,
          Number(
            obligation.amount_due ??
              0
          ) -
            Number(
              obligation.amount_paid ??
                0
            )
        );
    }

    expectedAmount =
      recurringAmountDue;
  }

  // =======================================================
  // BALANCE
  // =======================================================

  const remainingAmount =
    expectedAmount !== null
      ? Math.max(
          0,
          expectedAmount -
            amountPaid
        )
      : null;

  const fullyPaid =
    expectedAmount !== null &&
    expectedAmount > 0 &&
    remainingAmount === 0;

  // =======================================================
  // PARTICIPATION STATUS
  // =======================================================

  const participantApproved =
    ![
      "declined",
      "cancelled",
      "approval_pending",
    ].includes(
      participant.participation_status
    );

  // =======================================================
  // SETTLEMENT DESTINATION
  // =======================================================

  const {
    data: beneficiary,
  } = await supabaseAdmin
    .from(
      "collection_beneficiaries"
    )
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

  let settlementReady =
    false;

  if (
    beneficiary
      ?.settlement_profile_id
  ) {
    const {
      data: settlement,
    } = await supabaseAdmin
      .from(
        "settlement_profiles"
      )
      .select(`
        provider,
        provider_recipient_reference,
        verification_status,
        is_active
      `)
      .eq(
        "id",
        beneficiary
          .settlement_profile_id
      )
      .maybeSingle();

    settlementReady =
      Boolean(
        settlement
          ?.is_active &&
        settlement
          ?.provider ===
          "paystack" &&
        settlement
          ?.provider_recipient_reference &&
        [
          "provider_connected",
          "provider_verified",
        ].includes(
          settlement
            ?.verification_status ??
            ""
        )
      );
  }

  // =======================================================
  // STANDARD PAYMENT AVAILABILITY
  // =======================================================

  const paymentAvailable =
    collectionActive &&
    participantApproved &&
    settlementReady &&
    !fullyPaid &&
    !cycleBased;

  const requiresAmountChoice =
    expectedAmount === null &&
    (
      collection.collection_mode ===
        "target" ||
      collection.collection_mode ===
        "flexible"
    );

  const hasEmail =
    Boolean(
      participant.email
        ?.trim()
    );

  // =======================================================
  // UI
  // =======================================================

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">

      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5 sm:px-6">

          <div>
            <div className="text-2xl font-bold tracking-tight">
              Threeple
            </div>

            <p className="text-xs text-neutral-500">
              Collect. Coordinate.
              Track.
            </p>
          </div>

          <div className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-600">
            Secure Payment
          </div>

        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-6 sm:py-12">

        {/* COLLECTION */}

        <section className="text-center">

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Threeple Collection
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {collection.title}
          </h1>

          {collection.description && (
            <p className="mx-auto mt-4 max-w-xl leading-7 text-neutral-600">
              {
                collection.description
              }
            </p>
          )}

        </section>

        {/* PAYMENT CARD */}

        <section className="mt-8 rounded-3xl border bg-white p-6 shadow-sm sm:p-8">

          <div className="flex items-start justify-between gap-5">

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Paying as
              </p>

              <h2 className="mt-2 text-xl font-semibold">
                {
                  participant.full_name
                }
              </h2>
            </div>

            <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium">
              {friendlyStatus(
                participant.payment_status
              )}
            </span>

          </div>

          {/* SUMMARY */}

          <div className="mt-7 grid gap-4 sm:grid-cols-3">

            <div className="rounded-2xl bg-neutral-50 p-4">
              <p className="text-xs text-neutral-500">
                Amount expected
              </p>

              <p className="mt-2 text-lg font-semibold">
                {expectedAmount !==
                null
                  ? formatMoney(
                      expectedAmount,
                      currency
                    )
                  : "Choose amount"}
              </p>
            </div>

            <div className="rounded-2xl bg-neutral-50 p-4">
              <p className="text-xs text-neutral-500">
                Verified paid
              </p>

              <p className="mt-2 text-lg font-semibold">
                {formatMoney(
                  amountPaid,
                  currency
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-neutral-50 p-4">
              <p className="text-xs text-neutral-500">
                Remaining
              </p>

              <p className="mt-2 text-lg font-semibold">
                {remainingAmount !==
                null
                  ? formatMoney(
                      remainingAmount,
                      currency
                    )
                  : "—"}
              </p>
            </div>

          </div>

          {/* FULLY PAID */}

          {fullyPaid && (
            <div className="mt-7 rounded-2xl border border-green-200 bg-green-50 p-5">

              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 font-bold text-green-700">
                ✓
              </div>

              <h3 className="mt-4 font-semibold text-green-900">
                Payment complete
              </h3>

              <p className="mt-2 text-sm leading-6 text-green-800">
                Your required
                contribution has
                been verified as
                paid.
              </p>

            </div>
          )}

          {/* INACTIVE */}

          {!collectionActive && (
            <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="font-semibold text-amber-900">
                Payments are
                currently closed
              </h3>
            </div>
          )}

          {/* PARTICIPANT BLOCK */}

          {collectionActive &&
            !participantApproved && (
              <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5">

                <h3 className="font-semibold text-amber-900">
                  Payment access
                  pending
                </h3>

                <p className="mt-2 text-sm text-amber-800">
                  Your participation
                  must be approved
                  before payment can
                  continue.
                </p>

              </div>
            )}

          {/* CYCLE PAYMENT */}

          {collectionActive &&
            participantApproved &&
            cycleBased &&
            !fullyPaid && (
              <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5">

                <h3 className="font-semibold text-amber-900">
                  Cycle payment
                </h3>

                <p className="mt-2 text-sm leading-6 text-amber-800">
                  This Collection
                  uses recurring or
                  rotating payments.
                  Threeple will
                  process this
                  through the
                  participant's
                  specific cycle
                  obligation rather
                  than the standard
                  checkout.
                </p>

              </div>
            )}

          {/* SETTLEMENT NOT READY */}

          {collectionActive &&
            participantApproved &&
            !cycleBased &&
            !settlementReady &&
            !fullyPaid && (
              <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5">

                <h3 className="font-semibold text-amber-900">
                  Payment setup is
                  being completed
                </h3>

                <p className="mt-2 text-sm leading-6 text-amber-800">
                  The Collection
                  organiser has not
                  yet completed the
                  verified settlement
                  setup.
                </p>

              </div>
            )}

          {/* CHECKOUT */}

          {paymentAvailable && (
            <div className="mt-7 border-t pt-7">

              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Secure checkout
                </p>

                <h3 className="mt-2 text-xl font-semibold">
                  Make your payment
                </h3>

                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  Review the amount
                  and continue to
                  Paystack's secure
                  checkout.
                </p>
              </div>

              <CheckoutForm
                token={token}
                currency={
                  currency
                }
                remainingAmount={
                  remainingAmount
                }
                allowPartialPayments={
                  collection
                    .allow_partial_payments
                }
                requiresAmountChoice={
                  requiresAmountChoice
                }
                hasEmail={
                  hasEmail
                }
              />

            </div>
          )}

        </section>

        {/* SECURITY FOOTER */}

        <section className="mt-6 text-center">
          <p className="text-xs leading-5 text-neutral-500">
            Threeple does not ask
            you to send money to a
            personal Threeple bank
            account. Checkout is
            initialized securely
            from Threeple's server
            and completed through
            the connected payment
            provider.
          </p>
        </section>

      </div>
    </main>
  );
}
