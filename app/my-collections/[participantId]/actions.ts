"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logCollectionActivity } from "@/lib/activity/server";

// =========================================================
// HELPERS
// =========================================================

function value(
  formData: FormData,
  key: string
) {
  return String(
    formData.get(key) ?? ""
  ).trim();
}

function cleanPhone(
  phone: string
) {
  return phone
    .trim()
    .replace(/\s+/g, "");
}

function returnToParticipant(
  participantId: string,
  result: string
): never {
  revalidatePath(
    "/my-collections"
  );

  revalidatePath(
    `/my-collections/${participantId}`
  );

  redirect(
    `/my-collections/${participantId}?result=${encodeURIComponent(
      result
    )}`
  );
}

// =========================================================
// AUTHORIZED PARTICIPANT CONTEXT
// =========================================================

async function getParticipantContext(
  participantId: string
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
      user_id,
      full_name,
      phone,
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
    throw new Error(
      "Participant record not found."
    );
  }

  const {
    data: collection,
    error: collectionError,
  } = await supabaseAdmin
    .from("collections")
    .select(`
      id,
      title,
      organization_id
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
    throw new Error(
      "Collection not found."
    );
  }

  return {
    userId,
    participant,
    collection,
  };
}

// =========================================================
// UPDATE PARTICIPANT DETAILS
// =========================================================

export async function updateMyParticipantDetails(
  formData: FormData
) {
  const participantId =
    value(
      formData,
      "participant_id"
    );

  const fullName =
    value(
      formData,
      "full_name"
    );

  const phone =
    cleanPhone(
      value(
        formData,
        "phone"
      )
    );

  if (!participantId) {
    throw new Error(
      "Participant ID is missing."
    );
  }

  if (!fullName) {
    returnToParticipant(
      participantId,
      "name_required"
    );
  }

  const {
    userId,
    participant,
    collection,
  } =
    await getParticipantContext(
      participantId
    );

  const changedFields:
    string[] = [];

  if (
    participant.full_name !==
    fullName
  ) {
    changedFields.push(
      "full_name"
    );
  }

  if (
    (participant.phone ?? "") !==
    phone
  ) {
    changedFields.push(
      "phone"
    );
  }

  if (
    changedFields.length === 0
  ) {
    returnToParticipant(
      participantId,
      "nothing_changed"
    );
  }

  const {
    error: updateError,
  } = await supabaseAdmin
    .from("participants")
    .update({
      full_name:
        fullName,

      phone:
        phone || null,
    })
    .eq(
      "id",
      participantId
    )
    .eq(
      "user_id",
      userId
    );

  if (updateError) {
    console.error(
      "PARTICIPANT_SELF_UPDATE_FAILED",
      {
        participantId,
        errorCode:
          updateError.code,
      }
    );

    returnToParticipant(
      participantId,
      "update_failed"
    );
  }

  await logCollectionActivity({
    collectionId:
      collection.id,

    organizationId:
      collection.organization_id,

    actorUserId:
      userId,

    eventType:
      "participant.profile_updated",

    subjectType:
      "participant",

    subjectId:
      participant.id,

    subjectLabel:
      fullName,

    description:
      `${fullName} updated their participant details.`,

    metadata: {
      changed_fields:
        changedFields,
    },
  });

  returnToParticipant(
    participantId,
    "updated"
  );
}

// =========================================================
// LEAVE COLLECTION
//
// We preserve the participant record.
// Nothing is deleted.
// =========================================================

export async function leaveCollection(
  formData: FormData
) {
  const participantId =
    value(
      formData,
      "participant_id"
    );

  if (!participantId) {
    throw new Error(
      "Participant ID is missing."
    );
  }

  const {
    userId,
    participant,
    collection,
  } =
    await getParticipantContext(
      participantId
    );

  if (
    !participant.is_active
  ) {
    returnToParticipant(
      participantId,
      "already_inactive"
    );
  }

  const previousStatus =
    participant
      .participation_status;

  const {
    error: updateError,
  } = await supabaseAdmin
    .from("participants")
    .update({
      participation_status:
        "cancelled",

      is_active:
        false,
    })
    .eq(
      "id",
      participantId
    )
    .eq(
      "user_id",
      userId
    );

  if (updateError) {
    console.error(
      "PARTICIPANT_LEAVE_FAILED",
      {
        participantId,
        errorCode:
          updateError.code,
      }
    );

    returnToParticipant(
      participantId,
      "leave_failed"
    );
  }

  await logCollectionActivity({
    collectionId:
      collection.id,

    organizationId:
      collection.organization_id,

    actorUserId:
      userId,

    eventType:
      "participant.left",

    subjectType:
      "participant",

    subjectId:
      participant.id,

    subjectLabel:
      participant.full_name,

    description:
      `${participant.full_name} left ${collection.title}.`,

    metadata: {
      previous_status:
        previousStatus,

      new_status:
        "cancelled",

      initiated_by:
        "participant",
    },
  });

  returnToParticipant(
    participantId,
    "left"
  );
}