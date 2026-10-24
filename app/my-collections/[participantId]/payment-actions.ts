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
  initializePaystackSplitPayment,
} from "@/lib/payments/paystack";

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
    data: organization,
    error: organizationError,
  } = await supabaseAdmin
    .from("organizations")
    .select(`
      id,
      settlement_provider,
      settlement_subaccount_code,
      settlement_currency,
      settlement_status
    `)
    .eq(
      "id",
      collection.organization_id
    )
    .maybeSingle();

  if (
    organizationError ||
    !organization ||
    organization.settlement_provider !==
      "paystack" ||
    organization.settlement_status !==
      "active" ||
    !organization.settlement_subaccount_code
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
  const amount =
    collection.collection_mode ===
      "rotating_pool" &&
    rotationOutstandingAmount !==
      null
      ? rotationOutstandingAmount
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
          : 0;

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

  const appUrl =
    (
      process.env
        .NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000"
    ).replace(
      /\/$/,
      ""
    );

  const callbackUrl =
    `${appUrl}${participantUrl(
      participantId,
      "returned"
    )}`;

  try {
    const checkout =
      await initializePaystackSplitPayment({
        email:
          participant.email,
        amountMajor:
          amount,
        currency:
          collection.currency,
        subaccountCode:
          organization
            .settlement_subaccount_code,
        platformFeeMajor:
          platformFee,
        platformFeePercentage:
          feePercentage,
        reference,
        callbackUrl,
        participantId:
          participant.id,
        collectionId:
          collection.id,
        organizationId:
          organization.id,
        rotationCycleId:
          rotationCycleId,
        rotationObligationId:
          rotationObligationId,
      });

    redirect(
      checkout.authorizationUrl
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

    console.error(
      "PARTICIPANT_PAYMENT_INITIALIZATION_FAILED",
      {
        participantId,
        collectionId:
          collection.id,
        organizationId:
          organization.id,
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


