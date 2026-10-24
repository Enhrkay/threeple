"use server";

import {
  randomUUID,
} from "crypto";

import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

import {
  initializePaystackTransaction,
  PaystackApiError,
} from "@/lib/paystack/server";

// =========================================================
// RESULT TYPE
// =========================================================

type StartPaymentResult =
  | {
      success: true;
      authorizationUrl: string;
      paymentReference: string;
    }
  | {
      success: false;
      error: string;
    };

// =========================================================
// HELPERS
// =========================================================

function cleanEmail(
  value: string
) {
  return value
    .trim()
    .toLowerCase();
}

function validEmail(
  email: string
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

function parseAmount(
  value:
    | string
    | number
    | null
    | undefined
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const amount =
    Number(value);

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return null;
  }

  return Math.round(
    amount * 100
  ) / 100;
}

function generatePaymentReference() {
  const unique =
    randomUUID()
      .replaceAll("-", "")
      .slice(0, 16)
      .toUpperCase();

  return `3PL-${Date.now()}-${unique}`;
}

// =========================================================
// START PAYMENT
// =========================================================

export async function startPayment(
  token: string,
  input?: {
    amount?: string | number;
    email?: string;
  }
): Promise<StartPaymentResult> {
  const cleanToken =
    token.trim();

  if (!cleanToken) {
    return {
      success: false,
      error:
        "Payment link is invalid.",
    };
  }

  // =======================================================
  // 1. LOAD PARTICIPANT
  // =======================================================

  const {
    data: participant,
    error: participantError,
  } = await supabaseAdmin
    .from("participants")
    .select(`
      id,
      collection_id,
      user_id,
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
      cleanToken
    )
    .maybeSingle();

  if (
    participantError ||
    !participant ||
    !participant.is_active
  ) {
    return {
      success: false,
      error:
        "This payment link is invalid or no longer active.",
    };
  }

  // =======================================================
  // 2. PARTICIPATION STATUS
  // =======================================================

  if (
    [
      "declined",
      "cancelled",
      "approval_pending",
    ].includes(
      participant.participation_status
    )
  ) {
    return {
      success: false,
      error:
        "This participant is not currently eligible to make a payment.",
    };
  }

  // =======================================================
  // 3. LOAD COLLECTION
  // =======================================================

  const {
    data: collection,
    error: collectionError,
  } = await supabaseAdmin
    .from("collections")
    .select(`
      id,
      title,
      collection_mode,
      currency,
      default_amount,
      allow_partial_payments,
      allow_custom_amount,
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
    return {
      success: false,
      error:
        "The Collection could not be found.",
    };
  }

  if (
    collection.status !==
    "active"
  ) {
    return {
      success: false,
      error:
        "This Collection is not currently accepting payments.",
    };
  }

  // =======================================================
  // 4. V1 CURRENCY
  //
  // We deliberately support NGN first.
  // Multi-currency comes after the NGN flow is complete.
  // =======================================================

  const currency =
    String(
      collection.currency ||
        "NGN"
    ).toUpperCase();

  if (currency !== "NGN") {
    return {
      success: false,
      error:
        "Threeple Payment Gateway currently supports NGN Collections only.",
    };
  }

  // =======================================================
  // 5. RECURRING / ROTATING HAVE THEIR OWN ENGINE
  // =======================================================

  if (
    collection.collection_mode ===
      "recurring_dues" ||
    collection.collection_mode ===
      "rotating_pool"
  ) {
    return {
      success: false,
      error:
        "This Collection uses cycle-based payments. Its payment flow will be handled through the recurring contribution engine.",
    };
  }

  // =======================================================
  // 6. EMAIL
  //
  // Paystack requires customer email.
  //
  // If Threeple already has the participant's email,
  // we use that server-side value.
  //
  // Otherwise the payment page may supply an email.
  // =======================================================

  const payerEmail =
    participant.email
      ? cleanEmail(
          participant.email
        )
      : cleanEmail(
          input?.email ?? ""
        );

  if (
    !payerEmail ||
    !validEmail(
      payerEmail
    )
  ) {
    return {
      success: false,
      error:
        "A valid email address is required to continue to payment.",
    };
  }

  // =======================================================
  // 7. VERIFIED PAYMENT TOTAL
  // =======================================================

  const {
    data: paymentRows,
    error: paymentsError,
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

  if (paymentsError) {
    return {
      success: false,
      error:
        "Threeple could not calculate the current payment balance.",
    };
  }

  let verifiedPaid = 0;

  for (
    const payment
    of paymentRows ?? []
  ) {
    if (
      !payment.verified_at
    ) {
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
      verifiedPaid += amount;
    }

    if (
      payment.status ===
      "partially_refunded"
    ) {
      verifiedPaid +=
        Math.max(
          0,
          amount - refunded
        );
    }
  }

  verifiedPaid =
    Math.round(
      verifiedPaid * 100
    ) / 100;

  // =======================================================
  // 8. CALCULATE EXPECTED AMOUNT
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

  const requestedAmount =
    parseAmount(
      input?.amount
    );

  let payableAmount = 0;

  // =======================================================
  // 9A. KNOWN OBLIGATION
  // =======================================================

  if (
    expectedAmount !== null &&
    expectedAmount > 0
  ) {
    const remaining =
      Math.max(
        0,
        expectedAmount -
          verifiedPaid
      );

    if (remaining <= 0) {
      return {
        success: false,
        error:
          "This contribution has already been fully paid.",
      };
    }

    // -----------------------------------------------------
    // PARTIAL PAYMENT
    // -----------------------------------------------------

    if (
      collection
        .allow_partial_payments &&
      requestedAmount !== null
    ) {
      if (
        requestedAmount >
        remaining
      ) {
        return {
          success: false,
          error:
            `You cannot pay more than the remaining balance of ₦${remaining.toLocaleString(
              "en-NG"
            )}.`,
        };
      }

      payableAmount =
        requestedAmount;
    } else {
      // ---------------------------------------------------
      // FULL REMAINING BALANCE
      // ---------------------------------------------------

      payableAmount =
        remaining;
    }
  }

  // =======================================================
  // 9B. CUSTOM CONTRIBUTION
  //
  // Used where no participant-specific expected amount
  // exists for target/flexible Collections.
  // =======================================================

  else if (
    collection.collection_mode ===
      "target" ||
    collection.collection_mode ===
      "flexible"
  ) {
    if (
      !collection
        .allow_custom_amount
    ) {
      return {
        success: false,
        error:
          "A payment amount has not been configured for this participant.",
      };
    }

    if (
      requestedAmount ===
      null
    ) {
      return {
        success: false,
        error:
          "Enter the amount you would like to contribute.",
      };
    }

    payableAmount =
      requestedAmount;
  } else {
    return {
      success: false,
      error:
        "A payable amount could not be determined for this participant.",
    };
  }

  // =======================================================
  // 10. FINAL AMOUNT CHECK
  // =======================================================

  payableAmount =
    Math.round(
      payableAmount * 100
    ) / 100;

  if (
    !Number.isFinite(
      payableAmount
    ) ||
    payableAmount <= 0
  ) {
    return {
      success: false,
      error:
        "The payment amount is invalid.",
    };
  }

  // =======================================================
  // 11. LOAD ACTIVE BENEFICIARY
  // =======================================================

  const {
    data: beneficiary,
    error: beneficiaryError,
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

  if (
    beneficiaryError ||
    !beneficiary
      ?.settlement_profile_id
  ) {
    return {
      success: false,
      error:
        "The Collection organiser has not completed settlement setup.",
    };
  }

  // =======================================================
  // 12. LOAD PAYSTACK SUBACCOUNT
  // =======================================================

  const {
    data: settlement,
    error: settlementError,
  } = await supabaseAdmin
    .from(
      "settlement_profiles"
    )
    .select(`
      id,
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

  if (
    settlementError ||
    !settlement ||
    !settlement.is_active ||
    settlement.provider !==
      "paystack" ||
    !settlement
      .provider_recipient_reference ||
    !settlement
      .provider_recipient_reference
      .startsWith(
        "ACCT_"
      ) ||
    ![
      "provider_connected",
      "provider_verified",
    ].includes(
      settlement
        .verification_status
    )
  ) {
    return {
      success: false,
      error:
        "This Collection is not yet ready to accept payments.",
    };
  }

  // =======================================================
  // 13. GENERATE THREEPLE PAYMENT REFERENCE
  // =======================================================

  const paymentReference =
    generatePaymentReference();

  // =======================================================
  // 14. CREATE LEDGER RECORD BEFORE PAYSTACK
  //
  // IMPORTANT:
  // No browser can invent a successful payment.
  // =======================================================

  const {
    data: payment,
    error: paymentCreateError,
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

      provider_reference:
        paymentReference,

      amount:
        payableAmount,

      currency,

      status:
        "initiated",

      payment_method:
        null,

      initiated_by:
        participant.user_id ??
        null,

      paid_at:
        null,

      verified_at:
        null,

      metadata: {
        source:
          "threeple_payment_gateway",

        collection_mode:
          collection.collection_mode,

        settlement_profile_id:
          settlement.id,
      },
    })
    .select(`
      id,
      provider_reference
    `)
    .single();

  if (
    paymentCreateError ||
    !payment
  ) {
    console.error(
      "PAYMENT_LEDGER_CREATE_FAILED",
      {
        collectionId:
          collection.id,

        participantId:
          participant.id,
      }
    );

    return {
      success: false,
      error:
        "Threeple could not create the payment attempt.",
    };
  }

  // =======================================================
  // 15. APPLICATION URL
  // =======================================================

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
            "threeple_payment_gateway",

          failure_stage:
            "application_configuration",
        },
      })
      .eq(
        "id",
        payment.id
      );

    console.error(
      "APP_URL_MISSING"
    );

    return {
      success: false,
      error:
        "Threeple payment configuration is incomplete.",
    };
  }

  // =======================================================
  // 16. CALLBACK URL
  //
  // Paystack will return the browser here after checkout.
  //
  // IMPORTANT:
  // This callback WILL NOT be trusted as proof of payment.
  // Webhook/verification will handle that later.
  // =======================================================

  const callbackUrl =
    `${appUrl}/pay/${encodeURIComponent(
      cleanToken
    )}`;

  // =======================================================
  // 17. CONVERT NAIRA TO KOBO
  // =======================================================

  const amountInSubunit =
    Math.round(
      payableAmount * 100
    );

  // =======================================================
  // 18. INITIALIZE PAYSTACK
  // =======================================================

  try {
    const transaction =
      await initializePaystackTransaction(
        {
          email:
            payerEmail,

          amountInSubunit,

          currency,

          reference:
            paymentReference,

          callbackUrl,

          subaccountCode:
            settlement
              .provider_recipient_reference,

          // ------------------------------------------------
          // THREEPLE FEE
          //
          // Intentionally omitted for now.
          //
          // We will configure the commercial fee
          // explicitly rather than silently taking money.
          // ------------------------------------------------

          metadata: {
            threeple_payment_id:
              payment.id,

            threeple_collection_id:
              collection.id,

            threeple_participant_id:
              participant.id,

            collection_title:
              collection.title,
          },
        }
      );

    // =====================================================
    // 19. MARK PAYMENT PENDING
    // =====================================================

    const {
      error:
        pendingUpdateError,
    } = await supabaseAdmin
      .from("payments")
      .update({
        status:
          "pending",

        metadata: {
          source:
            "threeple_payment_gateway",

          collection_mode:
            collection.collection_mode,

          settlement_profile_id:
            settlement.id,

          paystack_access_code:
            transaction.access_code,

          checkout_created:
            true,
        },
      })
      .eq(
        "id",
        payment.id
      );

    if (
      pendingUpdateError
    ) {
      // Paystack checkout already exists.
      //
      // We therefore DO NOT initialize another transaction.
      // The webhook can still reconcile using the unique
      // provider_reference.
      console.error(
        "PAYMENT_PENDING_UPDATE_FAILED",
        {
          paymentId:
            payment.id,

          reference:
            paymentReference,
        }
      );
    }

    // =====================================================
    // 20. RETURN CHECKOUT URL
    // =====================================================

    return {
      success: true,

      authorizationUrl:
        transaction
          .authorization_url,

      paymentReference:
        transaction.reference,
    };
  } catch (error) {
    // =====================================================
    // PAYSTACK INITIALIZATION FAILED
    // =====================================================

    console.error(
      "PAYSTACK_PAYMENT_INITIALIZATION_FAILED",
      {
        paymentId:
          payment.id,

        reference:
          paymentReference,

        statusCode:
          error instanceof
          PaystackApiError
            ? error.statusCode
            : null,

        providerCode:
          error instanceof
          PaystackApiError
            ? error.providerCode
            : null,
      }
    );

    await supabaseAdmin
      .from("payments")
      .update({
        status:
          "failed",

        metadata: {
          source:
            "threeple_payment_gateway",

          failure_stage:
            "paystack_initialization",
        },
      })
      .eq(
        "id",
        payment.id
      );

    if (
      error instanceof
        PaystackApiError &&
      error.statusCode === 429
    ) {
      return {
        success: false,

        error:
          "The payment service is temporarily busy. Please try again shortly.",
      };
    }

    if (
      error instanceof
        PaystackApiError &&
      (
        error.statusCode ===
          401 ||
        error.statusCode ===
          403
      )
    ) {
      return {
        success: false,

        error:
          "Payment checkout is temporarily unavailable.",
      };
    }

    return {
      success: false,

      error:
        "Threeple could not start the payment checkout. No successful payment has been recorded.",
    };
  }
}