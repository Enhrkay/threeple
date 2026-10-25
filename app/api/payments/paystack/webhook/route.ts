import {
  createHmac,
  timingSafeEqual,
} from "crypto";

import {
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

type PaystackWebhookEvent = {
  event?: string;
  data?: {
    reference?: string;
    amount?: number;
    currency?: string;
    status?: string;
    fees?: number | null;
    metadata?:
      | {
          participant_id?: string;
          collection_id?: string;
          organization_id?: string;
          rotation_cycle_id?: string | null;
          rotation_obligation_id?: string | null;
          recurring_obligation_id?: string | null;
          gross_amount?: number;
          platform_fee_amount?: number;
          platform_fee_percentage?: number;
        }
      | string
      | null;
  };
};

type PaystackVerifyResponse = {
  status: boolean;
  message: string;
  data?: {
    reference?: string;
    amount?: number;
    currency?: string;
    status?: string;
    fees?: number | null;
    metadata?:
      | {
          participant_id?: string;
          collection_id?: string;
          organization_id?: string;
          rotation_cycle_id?: string | null;
          rotation_obligation_id?: string | null;
          recurring_obligation_id?: string | null;
          gross_amount?: number;
          platform_fee_amount?: number;
          platform_fee_percentage?: number;
        }
      | string
      | null;
  };
};

function getSecretKey() {
  const secret =
    process.env.PAYSTACK_SECRET_KEY;

  if (!secret) {
    throw new Error(
      "PAYSTACK_SECRET_KEY is not configured."
    );
  }

  return secret;
}

function secureSignatureMatch(
  rawBody: string,
  receivedSignature: string,
  secret: string
) {
  const expectedSignature =
    createHmac(
      "sha512",
      secret
    )
      .update(rawBody)
      .digest("hex");

  const expected =
    Buffer.from(
      expectedSignature,
      "utf8"
    );

  const received =
    Buffer.from(
      receivedSignature,
      "utf8"
    );

  if (
    expected.length !==
    received.length
  ) {
    return false;
  }

  return timingSafeEqual(
    expected,
    received
  );
}

function metadataObject(
  value:
    | {
        participant_id?: string;
        collection_id?: string;
        organization_id?: string;
          rotation_cycle_id?: string | null;
          rotation_obligation_id?: string | null;
          recurring_obligation_id?: string | null;
        gross_amount?: number;
        platform_fee_amount?: number;
        platform_fee_percentage?: number;
      }
    | string
    | null
    | undefined
) {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  return value;
}

async function verifyTransaction(
  reference: string,
  secret: string
) {
  const response =
    await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(
        reference
      )}`,
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${secret}`,
        },
        cache: "no-store",
      }
    );

  const result =
    await response.json() as
      PaystackVerifyResponse;

  if (
    !response.ok ||
    !result.status ||
    !result.data
  ) {
    throw new Error(
      result.message ||
      "Paystack transaction verification failed."
    );
  }

  return result.data;
}

export async function POST(
  request: Request
) {
  const secret =
    getSecretKey();

  const rawBody =
    await request.text();

  const signature =
    request.headers.get(
      "x-paystack-signature"
    ) ?? "";

  if (
    !signature ||
    !secureSignatureMatch(
      rawBody,
      signature,
      secret
    )
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Invalid webhook signature.",
      },
      {
        status: 401,
      }
    );
  }

  let event:
    PaystackWebhookEvent;

  try {
    event =
      JSON.parse(
        rawBody
      ) as
        PaystackWebhookEvent;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Invalid webhook payload.",
      },
      {
        status: 400,
      }
    );
  }

  // We only finalize successful transaction events here.
  if (
    event.event !==
      "charge.success"
  ) {
    return NextResponse.json(
      {
        ok: true,
        ignored: true,
      }
    );
  }

  const reference =
    String(
      event.data?.reference ??
      ""
    ).trim();

  if (!reference) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Missing transaction reference.",
      },
      {
        status: 400,
      }
    );
  }

  try {
    // Signature validation proves the webhook came from Paystack.
    // Verification independently confirms the current transaction state.
    const transaction =
      await verifyTransaction(
        reference,
        secret
      );

    if (
      transaction.status !==
        "success" ||
      transaction.reference !==
        reference
    ) {
      return NextResponse.json(
        {
          ok: true,
          ignored: true,
        }
      );
    }

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
        status,
        provider,
        payment_provider,
        provider_reference,
        recurring_obligation_id
      `)
      .eq(
        "provider_reference",
        reference
      )
      .maybeSingle();

    if (paymentAttemptError) {
      throw new Error(
        "Threeple could not load the payment attempt."
      );
    }

    if (
      paymentAttempt &&
      paymentAttempt.provider !== "paystack" &&
      paymentAttempt.payment_provider !== "paystack"
    ) {
      throw new Error(
        "Payment provider does not match the Threeple payment attempt."
      );
    }

    const metadata =
      metadataObject(
        transaction.metadata
      );

    const rotationCycleId =
      typeof metadata?.rotation_cycle_id ===
        "string" &&
      metadata.rotation_cycle_id
        ? metadata.rotation_cycle_id
        : null;

    const rotationObligationId =
      typeof metadata?.rotation_obligation_id ===
        "string" &&
      metadata.rotation_obligation_id
        ? metadata.rotation_obligation_id
        : null;

    const recurringObligationId =
      typeof metadata?.recurring_obligation_id ===
        "string" &&
      metadata.recurring_obligation_id
        ? metadata.recurring_obligation_id
        : null;

    if (
      paymentAttempt &&
      paymentAttempt.recurring_obligation_id !==
        recurringObligationId
    ) {
      throw new Error(
        "Recurring obligation metadata does not match the Threeple payment attempt."
      );
    }
    const frozenPlatformFeeAmount =
      metadata?.platform_fee_amount !== undefined
        ? Number(metadata.platform_fee_amount)
        : null;

    const frozenPlatformFeePercentage =
      metadata?.platform_fee_percentage !== undefined
        ? Number(metadata.platform_fee_percentage)
        : null;

    const participantId =
      String(
        metadata?.participant_id ??
        ""
      ).trim();

    const collectionId =
      String(
        metadata?.collection_id ??
        ""
      ).trim();

    const organizationId =
      String(
        metadata?.organization_id ??
        ""
      ).trim();

    if (
      !participantId ||
      !collectionId ||
      !organizationId
    ) {
      throw new Error(
        "Threeple payment metadata is incomplete."
      );
    }

    const {
      data: participant,
      error: participantError,
    } = await supabaseAdmin
      .from("participants")
      .select(`
        id,
        collection_id,
        expected_amount
      `)
      .eq(
        "id",
        participantId
      )
      .maybeSingle();

    if (
      participantError ||
      !participant ||
      participant.collection_id !==
        collectionId
    ) {
      throw new Error(
        "Participant payment relationship is invalid."
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
        currency,
        default_amount
      `)
      .eq(
        "id",
        collectionId
      )
      .maybeSingle();

    if (
      collectionError ||
      !collection ||
      collection.organization_id !==
        organizationId
    ) {
      throw new Error(
        "Collection payment relationship is invalid."
      );
    }

    const expectedAmountMajor =
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

    const paidAmountMajor =
      Number(
        transaction.amount ??
        0
      ) / 100;

    const processorFeeMajor =
      Number(
        transaction.fees ??
        0
      ) / 100;

    const transactionCurrency =
      String(
        transaction.currency ??
        ""
      ).toUpperCase();

    const amountToVerify =
      paymentAttempt
        ? Number(
            paymentAttempt.amount
          )
        : expectedAmountMajor;

    if (
      !Number.isFinite(
        amountToVerify
      ) ||
      amountToVerify <= 0 ||
      Math.abs(
        paidAmountMajor -
        amountToVerify
      ) > 0.001
    ) {
      throw new Error(
        "Verified Paystack amount does not match the Threeple payment attempt."
      );
    }

    if (
      transactionCurrency !==
      String(
        collection.currency
      ).toUpperCase()
    ) {
      throw new Error(
        "Verified Paystack currency does not match the Collection currency."
      );
    }

    const {
      data: paymentId,
      error: recordError,
    } = await supabaseAdmin.rpc(
      "record_verified_paystack_payment",
      {
        p_participant_id:
          participantId,
        p_collection_id:
          collectionId,
        p_amount:
          paidAmountMajor,
        p_currency:
          transactionCurrency,
        p_reference:
          reference,
        p_processor_fee_amount:
          processorFeeMajor,
        p_platform_fee_amount:
          frozenPlatformFeeAmount,
        p_platform_fee_percentage:
          frozenPlatformFeePercentage,
        p_rotation_cycle_id:
          rotationCycleId,
        p_rotation_obligation_id:
          rotationObligationId,
        p_recurring_obligation_id:
          recurringObligationId,
      }
    );

    if (recordError) {
      throw recordError;
    }

    return NextResponse.json(
      {
        ok: true,
        paymentId:
          paymentId ??
          null,
      }
    );
  } catch (error) {
    console.error(
      "PAYSTACK_WEBHOOK_PROCESSING_FAILED",
      {
        reference,
        error,
      }
    );

    // Non-2xx tells Paystack the event was not safely processed
    // so it can retry delivery.
    return NextResponse.json(
      {
        ok: false,
      },
      {
        status: 500,
      }
    );
  }
}
