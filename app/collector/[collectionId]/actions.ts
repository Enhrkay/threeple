"use server";

import { hasCollectorOrganizationAccess } from "@/lib/collector/access";
import {
  redirect,
} from "next/navigation";

import {
  revalidatePath,
} from "next/cache";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

function field(
  formData: FormData,
  key: string
) {
  return String(
    formData.get(key) ?? ""
  ).trim();
}

function collectorReturn(
  collectionId: string,
  participantId: string,
  result: string
): never {
  redirect(
    `/collector/${collectionId}/record/${participantId}?result=${encodeURIComponent(
      result
    )}`
  );
}

async function getCollectorAccess(
  collectionId: string
) {
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
      `/auth/login?next=${encodeURIComponent(
        `/collector/${collectionId}`
      )}`
    );
  }

  const {
    data: collection,
  } = await supabaseAdmin
    .from("collections")
    .select(`
      id,
      title,
      organization_id,
      currency,
      status,
      archived_at
    `)
    .eq(
      "id",
      collectionId
    )
    .maybeSingle();

  if (
    !collection ||
    collection.status !==
      "active" ||
    collection.archived_at
  ) {
    throw new Error(
      "Collection is not available for field collection."
    );
  }

  const {
    data: organization,
  } = await supabaseAdmin
    .from("organizations")
    .select(`
      id,
      owner_id
    `)
    .eq(
      "id",
      collection.organization_id
    )
    .maybeSingle();

  if (!organization) {
    throw new Error(
      "Organization not found."
    );
  }

  let allowed =
    organization.owner_id ===
    userId;

  if (!allowed) {

    allowed =

      await hasCollectorOrganizationAccess(

        userId,

        organization.id

      );

  }


  if (!allowed) {
    const {
      data: membership,
    } = await supabaseAdmin
      .from(
        "organization_members"
      )
      .select("role")
      .eq(
        "organization_id",
        organization.id
      )
      .eq(
        "user_id",
        userId
      )
      .in(
        "role",
        [
          "admin",
          "treasurer",
        ]
      )
      .maybeSingle();

    allowed =
      Boolean(
        membership
      );
  }

  if (!allowed) {

    allowed =

      await hasCollectorOrganizationAccess(

        userId,

        organization.id

      );

  }


  if (!allowed) {
    throw new Error(
      "You do not have collector access to this collection."
    );
  }

  return {
    userId,
    collection,
  };
}

export async function recordFieldContribution(
  formData: FormData
) {
  const collectionId =
    field(
      formData,
      "collection_id"
    );

  const participantId =
    field(
      formData,
      "participant_id"
    );

  const rawAmount =
    field(
      formData,
      "amount"
    );

  const paymentMethod =
    field(
      formData,
      "payment_method"
    );

  const note =
    field(
      formData,
      "note"
    );

  const deviceEventId =
    field(
      formData,
      "device_event_id"
    );

  const localRecordedAt =
    field(
      formData,
      "local_recorded_at"
    );

  if (
    !collectionId ||
    !participantId
  ) {
    throw new Error(
      "Collection and participant are required."
    );
  }

  const amount =
    Number(
      rawAmount
    );

  if (
    !Number.isFinite(
      amount
    ) ||
    amount <= 0
  ) {
    collectorReturn(
      collectionId,
      participantId,
      "invalid_amount"
    );
  }

  const allowedMethods =
    [
      "cash",
      "bank_transfer_manual",
      "pos_manual",
      "other_manual",
    ];

  if (
    !allowedMethods.includes(
      paymentMethod
    )
  ) {
    collectorReturn(
      collectionId,
      participantId,
      "invalid_method"
    );
  }

  const {
    userId,
    collection,
  } =
    await getCollectorAccess(
      collectionId
    );

  const {
    data: participant,
  } = await supabaseAdmin
    .from("participants")
    .select(`
      id,
      collection_id,
      full_name,
      is_active
    `)
    .eq(
      "id",
      participantId
    )
    .eq(
      "collection_id",
      collectionId
    )
    .eq(
      "is_active",
      true
    )
    .maybeSingle();

  if (!participant) {
    collectorReturn(
      collectionId,
      participantId,
      "participant_unavailable"
    );
  }

  const normalizedDeviceEventId =
    /^[0-9a-fA-F-]{36}$/.test(
      deviceEventId
    )
      ? deviceEventId
      : crypto.randomUUID();

  const parsedLocalTime =
    localRecordedAt
      ? new Date(
          localRecordedAt
        )
      : new Date();

  const safeLocalTime =
    Number.isNaN(
      parsedLocalTime.getTime()
    )
      ? new Date()
      : parsedLocalTime;

  const {
    data:
      receiptReference,
    error:
      receiptError,
  } =
    await supabaseAdmin.rpc(
      "make_field_receipt_reference"
    );

  if (
    receiptError ||
    !receiptReference
  ) {
    console.error(
      "FIELD_RECEIPT_REFERENCE_FAILED",
      receiptError
    );

    collectorReturn(
      collectionId,
      participantId,
      "record_failed"
    );
  }

  const now =
    new Date().toISOString();

  const {
    data: event,
    error,
  } = await supabaseAdmin
    .from(
      "field_contribution_events"
    )
    .insert({
      device_event_id:
        normalizedDeviceEventId,
      receipt_reference:
        receiptReference,
      collection_id:
        collectionId,
      participant_id:
        participantId,
      collector_user_id:
        userId,
      amount:
        Math.round(
          amount * 100
        ) / 100,
      currency:
        collection.currency,
      payment_method:
        paymentMethod,
      lifecycle_status:
        "synced",
      local_recorded_at:
        safeLocalTime.toISOString(),
      server_synced_at:
        now,
      note:
        note || null,
    })
    .select(`
      id
    `)
    .single();

  if (
    error ||
    !event
  ) {
    console.error(
      "FIELD_CONTRIBUTION_RECORD_FAILED",
      {
        collectionId,
        participantId,
        errorCode:
          error?.code,
      }
    );

    collectorReturn(
      collectionId,
      participantId,
      "record_failed"
    );
  }

  // Intentionally do NOT update:
  // - payments
  // - participants.payment_status
  // Manual field records are not verified electronic payments.

  revalidatePath(
    `/collector/${collectionId}`
  );

  revalidatePath(
    `/collector/${collectionId}/receipts/${event.id}`
  );

  redirect(
    `/collector/${collectionId}/receipts/${event.id}`
  );
}



