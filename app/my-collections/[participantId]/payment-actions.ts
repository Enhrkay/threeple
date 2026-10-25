"use server";

import {
  randomUUID,
} from "crypto";

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
  initializePaystackTransaction,
} from "@/lib/paystack/server";

function participantUrl(
  participantId: string,
  result?: string
) {
  const base =
    `/my-collections/${encodeURIComponent(
      participantId
    )}`;

  if (!result) {
    return base;
  }

  return `${base}?payment=${encodeURIComponent(
    result
  )}`;
}

function backWithError(
  participantId: string,
  code: string
): never {
  redirect(
    participantUrl(
      participantId,
      code
    )
  );
}

export async function startParticipantPayment(
  formData: FormData
) {
  const participantId =
    String(
      formData.get(
        "participant_id"
      ) ?? ""
    ).trim();

  if (!participantId) {
    redirect(
      "/my-collections"
    );
  }

  const additionalAmountInput =
    String(
      formData.get(
        "additional_amount"
      ) ?? ""
    ).trim();

  const wantsAdditionalContribution =
    additionalAmountInput.length > 0;

  const requestedAdditionalAmount =
    wantsAdditionalContribution
      ? Number(
          additionalAmountInput
        )
      : null;

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
    redirect(
      "/auth/login"
    );
  }

  const {
    data: participant,
    error: participantError,
  } = await supabase
    .from("participants")
    .select(`
      id,
      user_id,
      collection_id,
      email,
      expected_amount,
      payment_status,
      participation_status,
      is_active
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
    backWithError(
      participantId,
      "not_allowed"
    );
  }

  if (
    !participant.is_active ||
    participant.participation_status ===
      "declined" ||
    participant.participation_status ===
      "cancelled"
  ) {
    backWithError(
      participantId,
      "participation_inactive"
    );
  }
if (!participant.email) {
    backWithError(
      participantId,
      "email_required"
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
      collection_mode,
      currency,
      default_amount,
      target_amount,
      requires_approval,
      status,
      archived_at
    `)
    .eq(
      "id",
      participant.collection_id
    )
    .maybeSingle();

  if (
    collectionError ||
    !collection ||
    collection.status !==
      "active" ||
    collection.archived_at
  ) {
    backWithError(
      participantId,
      "collection_unavailable"
    );
  }

  if (
    collection.requires_approval &&
    participant.participation_status !==
      "approved"
  ) {
    backWithError(
      participantId,
      "approval_required"
    );
  }

  const {
    data: beneficiary,
    error: beneficiaryError,
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

  if (
    beneficiaryError ||
    !beneficiary?.settlement_profile_id
  ) {
    backWithError(
      participantId,
      "settlement_not_ready"
    );
  }

  const {
    data: settlementProfile,
    error: settlementProfileError,
  } = await supabaseAdmin
    .from("settlement_profiles")
    .select(`
      id,
      provider,
      currency,
      provider_recipient_reference,
      verification_status,
      is_active
    `)
    .eq(
      "id",
      beneficiary.settlement_profile_id
    )
    .maybeSingle();

  if (
    settlementProfileError ||
    !settlementProfile ||
    !settlementProfile.is_active ||
    settlementProfile.provider !== "paystack" ||
    !settlementProfile.provider_recipient_reference ||
    !settlementProfile.provider_recipient_reference.startsWith(
      "ACCT_"
    ) ||
    ![
      "provider_connected",
      "provider_verified",
    ].includes(
      settlementProfile.verification_status
    )
  ) {
    backWithError(
      participantId,
      "settlement_not_ready"
    );
  }

  let rotationCycleId:
    | string
    | null =
      null;

  let rotationObligationId:
    | string
    | null =
      null;

  let rotationOutstandingAmount:
    | number
    | null =
      null;

  let recurringObligationId:
    | string
    | null =
      null;

  let recurringOutstandingAmount:
    | number
    | null =
      null;

  if (
    collection.collection_mode ===
      "rotating_pool"
  ) {
    const {
      data: rotationCycles,
      error: rotationCyclesError,
    } = await supabaseAdmin
      .from("rotation_cycles")
      .select(`
        id,
        cycle_number,
        status,
        scheduled_date
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

    if (
      rotationCyclesError ||
      !rotationCycles?.length
    ) {
      backWithError(
        participantId,
        "rotation_not_ready"
      );
    }

    const cycleIds =
      rotationCycles.map(
        (cycle) =>
          cycle.id
      );

    const {
      data: obligations,
      error: obligationsError,
    } = await supabaseAdmin
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

    if (
      obligationsError ||
      !obligations?.length
    ) {
      backWithError(
        participantId,
        "rotation_cycle_paid"
      );
    }

    const obligationByCycle =
      new Map(
        obligations.map(
          (obligation) => [
            obligation.cycle_id,
            obligation,
          ]
        )
      );

    const nextCycle =
      rotationCycles.find(
        (cycle) =>
          obligationByCycle.has(
            cycle.id
          )
      );

    if (!nextCycle) {
      backWithError(
        participantId,
        "rotation_cycle_paid"
      );
    }

    const nextObligation =
      obligationByCycle.get(
        nextCycle.id
      );

    if (!nextObligation) {
      backWithError(
        participantId,
        "rotation_cycle_paid"
      );
    }

    const outstanding =
      Math.max(
        0,
        Number(
          nextObligation.amount_due
        ) -
        Number(
          nextObligation.amount_paid ??
            0
        )
      );

    if (
      !Number.isFinite(
        outstanding
      ) ||
      outstanding <= 0
    ) {
      backWithError(
        participantId,
        "rotation_cycle_paid"
      );
    }

    rotationCycleId =
      nextCycle.id;

    rotationObligationId =
      nextObligation.id;

    rotationOutstandingAmount =
      Math.round(
        outstanding * 100
      ) / 100;
  }

  if (
    collection.collection_mode ===
      "recurring_dues"
  ) {
    const today =
      new Date()
        .toISOString()
        .slice(0, 10);

    const {
      data: recurringCycles,
      error: recurringCyclesError,
    } = await supabaseAdmin
      .from("recurring_cycles")
      .select(`
        id,
        cycle_number,
        due_on,
        status
      `)
      .eq(
        "collection_id",
        collection.id
      )
      .in(
        "status",
        [
          "collecting",
          "closed",
        ]
      )
      .lte(
        "due_on",
        today
      )
      .order(
        "due_on",
        {
          ascending: true,
        }
      )
      .order(
        "cycle_number",
        {
          ascending: true,
        }
      );

    if (
      recurringCyclesError ||
      !recurringCycles?.length
    ) {
      console.error(
        "MEMBER_RECURRING_CYCLES_LOAD_FAILED",
        {
          collectionId:
            collection.id,
          participantId:
            participant.id,
          error:
            recurringCyclesError,
        }
      );

      backWithError(
        participantId,
        "recurring_not_due"
      );
    }

    const cycleOrder =
      new Map(
        recurringCycles.map(
          (cycle, index) => [
            cycle.id,
            index,
          ]
        )
      );

    const cycleIds =
      recurringCycles.map(
        (cycle) =>
          cycle.id
      );

    const {
      data: recurringObligations,
      error: recurringObligationsError,
    } = await supabaseAdmin
      .from(
        "recurring_cycle_obligations"
      )
      .select(`
        id,
        cycle_id,
        expected_amount,
        paid_amount,
        status
      `)
      .eq(
        "collection_id",
        collection.id
      )
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
          "partially_paid",
        ]
      );

    if (recurringObligationsError) {
      console.error(
        "MEMBER_RECURRING_OBLIGATIONS_LOAD_FAILED",
        {
          collectionId:
            collection.id,
          participantId:
            participant.id,
          error:
            recurringObligationsError,
        }
      );

      backWithError(
        participantId,
        "recurring_not_ready"
      );
    }

    const outstandingObligations =
      (recurringObligations ?? [])
        .map(
          (obligation) => ({
            ...obligation,

            outstanding:
              Math.max(
                0,
                Number(
                  obligation.expected_amount ??
                    0
                ) -
                  Number(
                    obligation.paid_amount ??
                      0
                  )
              ),
          })
        )
        .filter(
          (obligation) =>
            obligation.outstanding >
            0
        )
        .sort(
          (a, b) =>
            (
              cycleOrder.get(
                a.cycle_id
              ) ??
              Number.MAX_SAFE_INTEGER
            ) -
            (
              cycleOrder.get(
                b.cycle_id
              ) ??
              Number.MAX_SAFE_INTEGER
            )
        );

    const recurringObligation =
      outstandingObligations[0];

    if (!recurringObligation) {
      backWithError(
        participantId,
        "recurring_paid"
      );
    }

    recurringObligationId =
      recurringObligation.id;

    recurringOutstandingAmount =
      Math.round(
        recurringObligation.outstanding *
          100
      ) / 100;
  }
  let standardOutstandingAmount:
    | number
    | null =
      null;

  let standardVerifiedPaid = 0;

  if (
    collection.collection_mode !==
      "rotating_pool" &&
    collection.collection_mode !==
      "recurring_dues"
  ) {
    const expectedStandardAmount =
      participant.expected_amount !==
        null
        ? Number(
            participant.expected_amount
          )
        : collection.default_amount !==
            null
          ? Number(
              collection.default_amount
            )
          : 0;

    if (
      Number.isFinite(
        expectedStandardAmount
      ) &&
      expectedStandardAmount > 0
    ) {
      const {
        data: verifiedPayments,
        error: verifiedPaymentsError,
      } = await supabaseAdmin
        .from("payments")
        .select(`
          amount,
          refunded_amount,
          status,
          verified_at
        `)
        .eq(
          "collection_id",
          collection.id
        )
        .eq(
          "participant_id",
          participant.id
        )
        .not(
          "verified_at",
          "is",
          null
        )
        .in(
          "status",
          [
            "success",
            "partially_refunded",
          ]
        );

      if (verifiedPaymentsError) {
        console.error(
          "MEMBER_VERIFIED_PAYMENTS_LOAD_FAILED",
          {
            collectionId:
              collection.id,
            participantId:
              participant.id,
            error:
              verifiedPaymentsError,
          }
        );

        backWithError(
          participantId,
          "balance_unavailable"
        );
      }

      let verifiedPaid = 0;

      for (
        const payment
        of verifiedPayments ?? []
      ) {
        const paymentAmount =
          Number(
            payment.amount ?? 0
          );

        const refundedAmount =
          Number(
            payment.refunded_amount ??
              0
          );

        if (
          payment.status ===
          "success"
        ) {
          verifiedPaid +=
            paymentAmount;
        }

        if (
          payment.status ===
          "partially_refunded"
        ) {
          verifiedPaid +=
            Math.max(
              0,
              paymentAmount -
                refundedAmount
            );
        }
      }

      verifiedPaid =
        Math.round(
          verifiedPaid * 100
        ) / 100;

      standardVerifiedPaid =
        verifiedPaid;

      standardOutstandingAmount =
        Math.round(
          Math.max(
            0,
            expectedStandardAmount -
              verifiedPaid
          ) * 100
        ) / 100;
    }
  }

  let targetAdditionalAmount:
    | number
    | null =
      null;

  if (wantsAdditionalContribution) {
    if (
      collection.collection_mode !==
        "target"
    ) {
      backWithError(
        participantId,
        "additional_not_allowed"
      );
    }

    if (
      requestedAdditionalAmount ===
        null ||
      !Number.isFinite(
        requestedAdditionalAmount
      ) ||
      requestedAdditionalAmount <= 0
    ) {
      backWithError(
        participantId,
        "additional_amount_invalid"
      );
    }

    const expectedStandardAmount =
      participant.expected_amount !==
        null
        ? Number(
            participant.expected_amount
          )
        : collection.default_amount !==
            null
          ? Number(
              collection.default_amount
            )
          : 0;

    if (
      !Number.isFinite(
        expectedStandardAmount
      ) ||
      expectedStandardAmount <= 0 ||
      standardVerifiedPaid + 0.001 <
        expectedStandardAmount
    ) {
      backWithError(
        participantId,
        "original_balance_due"
      );
    }

    const targetAmount =
      collection.target_amount !==
        null
        ? Number(
            collection.target_amount
          )
        : 0;

    if (
      !Number.isFinite(
        targetAmount
      ) ||
      targetAmount <= 0
    ) {
      backWithError(
        participantId,
        "target_unavailable"
      );
    }

    const {
      data: financialSummary,
      error: financialSummaryError,
    } = await supabaseAdmin
      .from(
        "collection_financial_summary"
      )
      .select(`
        effective_gross_amount
      `)
      .eq(
        "collection_id",
        collection.id
      )
      .maybeSingle();

    if (financialSummaryError) {
      console.error(
        "TARGET_ADDITIONAL_FINANCIAL_SUMMARY_FAILED",
        {
          participantId,
          collectionId:
            collection.id,
          error:
            financialSummaryError,
        }
      );

      backWithError(
        participantId,
        "balance_unavailable"
      );
    }

    const collectionRaised =
      Number(
        financialSummary
          ?.effective_gross_amount ??
          0
      );

    const targetRemaining =
      Math.round(
        Math.max(
          0,
          targetAmount -
            collectionRaised
        ) *
          100
      ) / 100;

    if (targetRemaining <= 0) {
      backWithError(
        participantId,
        "target_reached"
      );
    }

    const roundedAdditionalAmount =
      Math.round(
        requestedAdditionalAmount *
          100
      ) / 100;

    if (
      roundedAdditionalAmount <= 0 ||
      roundedAdditionalAmount >
        targetRemaining + 0.001
    ) {
      backWithError(
        participantId,
        "additional_exceeds_target"
      );
    }

    targetAdditionalAmount =
      roundedAdditionalAmount;
  }

  const amount =
    targetAdditionalAmount !== null
      ? targetAdditionalAmount
      : collection.collection_mode ===
            "rotating_pool" &&
          rotationOutstandingAmount !==
            null
        ? rotationOutstandingAmount
        : collection.collection_mode ===
              "recurring_dues" &&
            recurringOutstandingAmount !==
              null
          ? recurringOutstandingAmount
          : standardOutstandingAmount ??
            0;

  if (
    !Number.isFinite(
      amount
    ) ||
    amount <= 0
  ) {
    backWithError(
      participantId,
      "amount_unavailable"
    );
  }

  const {
    data: platformSettings,
  } = await supabaseAdmin
    .from("platform_settings")
    .select(`
      platform_fee_percentage,
      monetization_enabled
    `)
    .eq(
      "id",
      "global"
    )
    .maybeSingle();

  const feePercentage =
    platformSettings?.monetization_enabled
      ? Number(
          platformSettings
            .platform_fee_percentage ??
            0
        )
      : 0;

  const platformFee =
    Math.round(
      (
        amount *
        feePercentage /
        100
      ) *
      100
    ) /
    100;

  if (
    platformFee >= amount
  ) {
    backWithError(
      participantId,
      "fee_invalid"
    );
  }

  const reference =
    `THR-${randomUUID()
      .replaceAll("-", "")
      .slice(0, 24)
      .toUpperCase()}`;

  const {
    data: paymentAttempt,
    error: paymentAttemptError,
  } = await supabaseAdmin
    .from("payments")
    .insert({
      collection_id:
        collection.id,

      participant_id:
        participant.id,

      obligation_id:
        null,

      provider:
        "paystack",

      payment_provider:
        "paystack",

      provider_reference:
        reference,

      amount,

      currency:
        collection.currency,

      status:
        "initiated",

      initiated_by:
        userId,

      paid_at:
        null,

      verified_at:
        null,

      platform_fee_percentage:
        feePercentage,

      platform_fee_amount:
        platformFee,

      rotation_cycle_id:
        rotationCycleId,

      rotation_obligation_id:
        rotationObligationId,

      recurring_obligation_id:
        recurringObligationId,

      metadata: {
        source:
          "authenticated_member_payment",

        collection_mode:
          collection.collection_mode,

        settlement_profile_id:
          settlementProfile.id,

        recurring_obligation_id:
          recurringObligationId,
      },
    })
    .select(`
      id,
      provider_reference
    `)
    .single();

  if (
    paymentAttemptError ||
    !paymentAttempt
  ) {
    console.error(
      "MEMBER_PAYMENT_ATTEMPT_CREATE_FAILED",
      {
        participantId,
        collectionId:
          collection.id,
        reference,
        error:
          paymentAttemptError,
      }
    );

    backWithError(
      participantId,
      "initialization_failed"
    );
  }

  const appUrl =
    process.env.APP_URL
      ?.trim()
      .replace(
        /\/+$/,
        ""
      );

  if (!appUrl) {
    await supabaseAdmin
      .from("payments")
      .update({
        status:
          "failed",

        metadata: {
          source:
            "authenticated_member_payment",

          failure_stage:
            "application_configuration",
        },
      })
      .eq(
        "id",
        paymentAttempt.id
      );

    console.error(
      "APP_URL_MISSING",
      {
        paymentId:
          paymentAttempt.id,
        participantId,
      }
    );

    backWithError(
      participantId,
      "initialization_failed"
    );
  }

  const callbackUrl =
    `${appUrl}/api/payments/paystack/return?participant_id=${encodeURIComponent(
      participantId
    )}`;
  try {
    const checkout =
      await initializePaystackTransaction({
        email:
          participant.email,

        amountInSubunit:
          Math.round(
            amount * 100
          ),

        currency:
          collection.currency,

        reference,

        callbackUrl,

        subaccountCode:
          settlementProfile
            .provider_recipient_reference,

        transactionChargeInSubunit:
          Math.round(
            platformFee * 100
          ),

        bearer:
          "subaccount",

        metadata: {
          threeple_payment_id:
            paymentAttempt.id,

          participant_id:
            participant.id,

          collection_id:
            collection.id,

          organization_id:
            collection.organization_id,

          rotation_cycle_id:
            rotationCycleId,

          rotation_obligation_id:
            rotationObligationId,

          recurring_obligation_id:
            recurringObligationId,

          platform_fee_amount:
            platformFee,

          platform_fee_percentage:
            feePercentage,
        },
      });

    const {
      error: pendingUpdateError,
    } = await supabaseAdmin
      .from("payments")
      .update({
        status:
          "pending",

        metadata: {
          source:
            "authenticated_member_payment",

          collection_mode:
            collection.collection_mode,

          settlement_profile_id:
            settlementProfile.id,

          rotation_cycle_id:
            rotationCycleId,

          rotation_obligation_id:
            rotationObligationId,

          recurring_obligation_id:
            recurringObligationId,

          checkout_created:
            true,
        },
      })
      .eq(
        "id",
        paymentAttempt.id
      );

    if (pendingUpdateError) {
      console.error(
        "MEMBER_PAYMENT_PENDING_UPDATE_FAILED",
        {
          paymentId:
            paymentAttempt.id,

          reference,

          error:
            pendingUpdateError,
        }
      );
    }

    redirect(
      checkout.authorization_url
    );
  } catch (error) {
    if (
      typeof error ===
        "object" &&
      error !== null &&
      "digest" in error
    ) {
      throw error;
    }


    await supabaseAdmin
      .from("payments")
      .update({
        status:
          "failed",

        metadata: {
          source:
            "authenticated_member_payment",

          failure_stage:
            "paystack_initialization",

          rotation_cycle_id:
            rotationCycleId,

          rotation_obligation_id:
            rotationObligationId,

          recurring_obligation_id:
            recurringObligationId,
        },
      })
      .eq(
        "id",
        paymentAttempt.id
      );

    console.error(
      "PARTICIPANT_PAYMENT_INITIALIZATION_FAILED",
      {
        participantId,
        collectionId:
          collection.id,
        organizationId:
          collection.organization_id,
        rotationCycleId:
          rotationCycleId,
        rotationObligationId:
          rotationObligationId,
        reference,
        error,
      }
    );

    backWithError(
      participantId,
      "initialization_failed"
    );
  }
}
