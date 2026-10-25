import { hasCollectorOrganizationAccess } from "@/lib/collector/access";
import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

function fail(
  eventId: string,
  code: string
): never {
  redirect(
    `/collector/receipts/${eventId}/adjust?error=${encodeURIComponent(
      code
    )}`
  );
}

async function requireCollectorAccess(
  userId: string,
  collectionId: string
) {
  const {
    data: collection,
    error: collectionError,
  } =
    await supabaseAdmin
      .from("collections")
      .select(`
        id,
        organization_id
      `)
      .eq("id", collectionId)
      .maybeSingle();

  if (
    collectionError ||
    !collection
  ) {
    return false;
  }

  const {
    data: organization,
  } =
    await supabaseAdmin
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

  if (
    organization?.owner_id ===
    userId
  ) {
    return true;
  }

  const {
    data: membership,
  } =
    await supabaseAdmin
      .from(
        "organization_members"
      )
      .select(`
        role
      `)
      .eq(
        "organization_id",
        collection.organization_id
      )
      .eq(
        "user_id",
        userId
      )
      .maybeSingle();

  if (
    membership?.role === "admin" ||
    membership?.role === "treasurer"
  ) {
    return true;
  }

  return hasCollectorOrganizationAccess(
    userId,
    collection.organization_id
  );
}

export async function adjustFieldReceipt(
  formData: FormData
) {
  "use server";

  const supabase =
    await createClient();

  const {
    data: claimsData,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  const eventId =
    String(
      formData.get("event_id") ??
        ""
    ).trim();

  const action =
    String(
      formData.get("action") ??
        ""
    ).trim();

  const reason =
    String(
      formData.get("reason") ??
        ""
    ).trim();

  const correctedAmountRaw =
    String(
      formData.get(
        "corrected_amount"
      ) ?? ""
    ).trim();

  const correctedMethod =
    String(
      formData.get(
        "corrected_method"
      ) ?? ""
    ).trim();

  const note =
    String(
      formData.get("note") ??
        ""
    ).trim();

  if (!userId) {
    redirect(
      `/auth/login?next=${encodeURIComponent(
        `/collector/receipts/${eventId}/adjust`
      )}`
    );
  }

  if (!eventId) {
    redirect(
      "/collector/history"
    );
  }

  if (
    action !==
      "correction" &&
    action !==
      "void"
  ) {
    fail(
      eventId,
      "invalid_action"
    );
  }

  if (
    reason.length < 5
  ) {
    fail(
      eventId,
      "reason_required"
    );
  }

  const {
    data: original,
    error: originalError,
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
        local_recorded_at,
        correction_of_event_id
      `)
      .eq(
        "id",
        eventId
      )
      .maybeSingle();

  if (
    originalError ||
    !original
  ) {
    fail(
      eventId,
      "not_found"
    );
  }

  if (
    original.correction_of_event_id
  ) {
    fail(
      eventId,
      "adjustment_not_allowed"
    );
  }

  if (
    original.lifecycle_status ===
      "voided"
  ) {
    fail(
      eventId,
      "already_voided"
    );
  }

  const hasAccess =
    await requireCollectorAccess(
      userId,
      original.collection_id
    );

  if (!hasAccess) {
    fail(
      eventId,
      "not_allowed"
    );
  }

  if (
    original.collector_user_id !==
    userId
  ) {
    fail(
      eventId,
      "not_owner"
    );
  }

  const adjustmentId =
    crypto.randomUUID();

  const receiptReference =
    `TP-ADJ-${new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "")}-${adjustmentId
      .replaceAll("-", "")
      .slice(0, 10)
      .toUpperCase()}`;

  if (
    action === "void"
  ) {
    const {
      error: insertError,
    } =
      await supabaseAdmin
        .from(
          "field_contribution_events"
        )
        .insert({
          id: adjustmentId,
          device_event_id:
            crypto.randomUUID(),
          receipt_reference:
            receiptReference,
          collection_id:
            original.collection_id,
          participant_id:
            original.participant_id,
          collector_user_id:
            userId,
          amount: 0.01,
          currency:
            original.currency,
          payment_method:
            original.payment_method,
          lifecycle_status:
            "voided",
          local_recorded_at:
            new Date().toISOString(),
          server_synced_at:
            new Date().toISOString(),
          note:
            note || null,
          correction_of_event_id:
            original.id,
          correction_reason:
            reason,
          adjustment_type:
            "void",
          adjusted_by_user_id:
            userId,
          adjusted_at:
            new Date().toISOString(),
        });

    if (insertError) {
      console.error(
        "FIELD_VOID_INSERT_FAILED",
        insertError
      );

      fail(
        eventId,
        "save_failed"
      );
    }

    redirect(
      `/collector/history?adjusted=voided`
    );
  }

  const correctedAmount =
    Number(
      correctedAmountRaw
    );

  if (
    !Number.isFinite(
      correctedAmount
    ) ||
    correctedAmount <= 0
  ) {
    fail(
      eventId,
      "amount_required"
    );
  }

  const validMethods =
    new Set([
      "cash",
      "bank_transfer_manual",
      "pos_manual",
      "other_manual",
    ]);

  const method =
    validMethods.has(
      correctedMethod
    )
      ? correctedMethod
      : original.payment_method;

  const {
    error: correctionError,
  } =
    await supabaseAdmin
      .from(
        "field_contribution_events"
      )
      .insert({
        id: adjustmentId,
        device_event_id:
          crypto.randomUUID(),
        receipt_reference:
          receiptReference,
        collection_id:
          original.collection_id,
        participant_id:
          original.participant_id,
        collector_user_id:
          userId,
        amount:
          correctedAmount,
        currency:
          original.currency,
        payment_method:
          method,
        lifecycle_status:
          "corrected",
        local_recorded_at:
          new Date().toISOString(),
        server_synced_at:
          new Date().toISOString(),
        note:
          note || null,
        correction_of_event_id:
          original.id,
        correction_reason:
          reason,
        adjustment_type:
          "correction",
        adjusted_by_user_id:
          userId,
        adjusted_at:
          new Date().toISOString(),
      });

  if (
    correctionError
  ) {
    console.error(
      "FIELD_CORRECTION_INSERT_FAILED",
      correctionError
    );

    fail(
      eventId,
      "save_failed"
    );
  }

  redirect(
    `/collector/history?adjusted=corrected`
  );
}


