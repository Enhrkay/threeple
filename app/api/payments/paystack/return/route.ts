import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

import {
  verifyPaystackTransaction,
} from "@/lib/paystack/server";

function participantUrl(
  request: Request,
  participantId: string,
  payment: string
) {
  const url =
    new URL(
      `/my-collections/${encodeURIComponent(
        participantId
      )}`,
      request.url
    );

  url.searchParams.set(
    "payment",
    payment
  );

  return url;
}

export async function GET(
  request: Request
) {
  const requestUrl =
    new URL(request.url);

  const reference =
    (
      requestUrl.searchParams.get(
        "reference"
      ) ?? ""
    ).trim();

  const participantId =
    (
      requestUrl.searchParams.get(
        "participant_id"
      ) ?? ""
    ).trim();

  if (
    !reference ||
    !participantId
  ) {
    return NextResponse.redirect(
      new URL(
        "/my-collections?error=payment_return_invalid",
        request.url
      )
    );
  }

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
    const loginUrl =
      new URL(
        "/auth/login",
        request.url
      );

    loginUrl.searchParams.set(
      "next",
      requestUrl.pathname +
        requestUrl.search
    );

    return NextResponse.redirect(
      loginUrl
    );
  }

  const {
    data: participant,
    error: participantError,
  } = await supabaseAdmin
    .from("participants")
    .select(`
      id,
      user_id,
      collection_id
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
      "PAYSTACK_RETURN_PARTICIPANT_LOOKUP_FAILED",
      {
        participantId,
        userId,
        error:
          participantError,
      }
    );

    return NextResponse.redirect(
      participantUrl(
        request,
        participantId,
        "not_allowed"
      )
    );
  }

  try {
    const {
      data: paymentAttempt,
      error: paymentAttemptError,
    } = await supabaseAdmin
      .from("payments")
      .select(`
        id,
        participant_id,
        collection_id,
        amount,
        currency,
        provider,
        payment_provider,
        provider_reference,
        status,
        verified_at,
        platform_fee_amount,
        platform_fee_percentage,
        rotation_cycle_id,
        rotation_obligation_id,
        recurring_obligation_id
      `)
      .eq(
        "provider_reference",
        reference
      )
      .eq(
        "participant_id",
        participant.id
      )
      .eq(
        "collection_id",
        participant.collection_id
      )
      .maybeSingle();

    if (
      paymentAttemptError ||
      !paymentAttempt
    ) {
      throw new Error(
        "Threeple could not find the matching payment attempt."
      );
    }

    if (
      paymentAttempt.provider !== "paystack" &&
      paymentAttempt.payment_provider !== "paystack"
    ) {
      throw new Error(
        "Payment provider does not match the Threeple payment attempt."
      );
    }

    if (
      paymentAttempt.status === "success" &&
      paymentAttempt.verified_at
    ) {
      return NextResponse.redirect(
        participantUrl(
          request,
          participantId,
          "verified"
        )
      );
    }

    const transaction =
      await verifyPaystackTransaction(
        reference
      );

    const transactionReference =
      String(
        transaction.reference ?? ""
      ).trim();

    const transactionStatus =
      String(
        transaction.status ?? ""
      ).trim();

    const transactionCurrency =
      String(
        transaction.currency ?? ""
      )
        .trim()
        .toUpperCase();

    const paidAmountMajor =
      Number(
        transaction.amount ?? 0
      ) / 100;

    const expectedAmount =
      Number(
        paymentAttempt.amount
      );

    const expectedCurrency =
      String(
        paymentAttempt.currency ?? ""
      )
        .trim()
        .toUpperCase();

    if (
      transactionStatus !== "success" ||
      transactionReference !==
        reference
    ) {
      return NextResponse.redirect(
        participantUrl(
          request,
          participantId,
          "pending"
        )
      );
    }

    if (
      !Number.isFinite(
        expectedAmount
      ) ||
      expectedAmount <= 0 ||
      Math.abs(
        paidAmountMajor -
          expectedAmount
      ) > 0.001
    ) {
      throw new Error(
        "Verified Paystack amount does not match the Threeple payment attempt."
      );
    }

    if (
      transactionCurrency !==
        expectedCurrency
    ) {
      throw new Error(
        "Verified Paystack currency does not match the Threeple payment attempt."
      );
    }

    const processorFeeMajor =
      Number(
        transaction.fees ?? 0
      ) / 100;

    const {
      error: recordError,
    } = await supabaseAdmin.rpc(
      "record_verified_paystack_payment",
      {
        p_participant_id:
          paymentAttempt.participant_id,

        p_collection_id:
          paymentAttempt.collection_id,

        p_amount:
          paidAmountMajor,

        p_currency:
          transactionCurrency,

        p_reference:
          reference,

        p_processor_fee_amount:
          processorFeeMajor,

        p_platform_fee_amount:
          paymentAttempt
            .platform_fee_amount,

        p_platform_fee_percentage:
          paymentAttempt
            .platform_fee_percentage,

        p_rotation_cycle_id:
          paymentAttempt
            .rotation_cycle_id,

        p_rotation_obligation_id:
          paymentAttempt
            .rotation_obligation_id,

        p_recurring_obligation_id:
          paymentAttempt
            .recurring_obligation_id,
      }
    );

    if (recordError) {
      throw recordError;
    }

    return NextResponse.redirect(
      participantUrl(
        request,
        participantId,
        "verified"
      )
    );
  } catch (error) {
    console.error(
      "PAYSTACK_RETURN_RECONCILIATION_FAILED",
      {
        reference,
        participantId,
        error,
      }
    );

    return NextResponse.redirect(
      participantUrl(
        request,
        participantId,
        "verification_failed"
      )
    );
  }
}
