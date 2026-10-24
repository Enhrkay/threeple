"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  logCollectionActivity,
} from "@/lib/activity/server";

// =========================================================
// ACCESS CHECK
// =========================================================

async function getManagerContext(
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
    redirect("/auth/login");
  }

  const {
    data: collection,
  } = await supabase
    .from("collections")
    .select(`
      id,
      organization_id
    `)
    .eq(
      "id",
      collectionId
    )
    .maybeSingle();

  if (!collection) {
    throw new Error(
      "Collection not found."
    );
  }

  const {
    data: organization,
  } = await supabase
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
    const {
      data: membership,
    } = await supabase
      .from(
        "organization_members"
      )
      .select("role")
      .eq(
        "organization_id",
        collection.organization_id
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
      Boolean(membership);
  }

  if (!allowed) {
    throw new Error(
      "You do not have permission to manage participants."
    );
  }

  return {
    supabase,
    userId,
    collection,
    organization,
  };
}

// =========================================================
// LOAD PARTICIPANT
// =========================================================

async function getParticipant(
  supabase: Awaited<
    ReturnType<
      typeof createClient
    >
  >,
  collectionId: string,
  participantId: string
) {
  const {
    data: participant,
    error,
  } = await supabase
    .from("participants")
    .select(`
      id,
      full_name,
      email,
      phone,
      participation_status,
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
    .maybeSingle();

  if (
    error ||
    !participant
  ) {
    throw new Error(
      "Participant not found."
    );
  }

  return participant;
}

// =========================================================
// RETURN HELPER
// =========================================================

function returnToParticipants(
  collectionId: string,
  result: string
): never {
  revalidatePath(
    `/dashboard/collections/${collectionId}/participants`
  );

  revalidatePath(
    `/dashboard/collections/${collectionId}`
  );

  redirect(
    `/dashboard/collections/${collectionId}/participants?result=${encodeURIComponent(
      result
    )}`
  );
}

// =========================================================
// APPROVE
// =========================================================

export async function approveParticipant(
  formData: FormData
) {
  const collectionId =
    String(
      formData.get(
        "collection_id"
      ) ?? ""
    ).trim();

  const participantId =
    String(
      formData.get(
        "participant_id"
      ) ?? ""
    ).trim();

  if (
    !collectionId ||
    !participantId
  ) {
    throw new Error(
      "Missing participant information."
    );
  }

  const {
    supabase,
    userId,
    organization,
  } =
    await getManagerContext(
      collectionId
    );

  const participant =
    await getParticipant(
      supabase,
      collectionId,
      participantId
    );

  const previousStatus =
    participant
      .participation_status;

  const {
    error,
  } = await supabase
    .from("participants")
    .update({
      participation_status:
        "approved",

      is_active: true,
    })
    .eq(
      "id",
      participantId
    )
    .eq(
      "collection_id",
      collectionId
    );

  if (error) {
    returnToParticipants(
      collectionId,
      "approve_failed"
    );
  }

  await logCollectionActivity({
    collectionId,

    organizationId:
      organization.id,

    actorUserId:
      userId,

    eventType:
      "participant.approved",

    subjectType:
      "participant",

    subjectId:
      participant.id,

    subjectLabel:
      participant.full_name,

    description:
      `${participant.full_name} was approved to participate in the Collection.`,

    metadata: {
      previous_status:
        previousStatus,

      new_status:
        "approved",
    },
  });

  returnToParticipants(
    collectionId,
    "approved"
  );
}

// =========================================================
// DECLINE
// =========================================================

export async function declineParticipant(
  formData: FormData
) {
  const collectionId =
    String(
      formData.get(
        "collection_id"
      ) ?? ""
    ).trim();

  const participantId =
    String(
      formData.get(
        "participant_id"
      ) ?? ""
    ).trim();

  if (
    !collectionId ||
    !participantId
  ) {
    throw new Error(
      "Missing participant information."
    );
  }

  const {
    supabase,
    userId,
    organization,
  } =
    await getManagerContext(
      collectionId
    );

  const participant =
    await getParticipant(
      supabase,
      collectionId,
      participantId
    );

  const previousStatus =
    participant
      .participation_status;

  const {
    error,
  } = await supabase
    .from("participants")
    .update({
      participation_status:
        "declined",
    })
    .eq(
      "id",
      participantId
    )
    .eq(
      "collection_id",
      collectionId
    );

  if (error) {
    returnToParticipants(
      collectionId,
      "decline_failed"
    );
  }

  await logCollectionActivity({
    collectionId,

    organizationId:
      organization.id,

    actorUserId:
      userId,

    eventType:
      "participant.declined",

    subjectType:
      "participant",

    subjectId:
      participant.id,

    subjectLabel:
      participant.full_name,

    description:
      `${participant.full_name} was declined from the Collection.`,

    metadata: {
      previous_status:
        previousStatus,

      new_status:
        "declined",
    },
  });

  returnToParticipants(
    collectionId,
    "declined"
  );
}

// =========================================================
// DEACTIVATE
//
// Participant is preserved.
// We do NOT delete their record.
// =========================================================

export async function deactivateParticipant(
  formData: FormData
) {
  const collectionId =
    String(
      formData.get(
        "collection_id"
      ) ?? ""
    ).trim();

  const participantId =
    String(
      formData.get(
        "participant_id"
      ) ?? ""
    ).trim();

  if (
    !collectionId ||
    !participantId
  ) {
    throw new Error(
      "Missing participant information."
    );
  }

  const {
    supabase,
    userId,
    organization,
  } =
    await getManagerContext(
      collectionId
    );

  const participant =
    await getParticipant(
      supabase,
      collectionId,
      participantId
    );

  const previousStatus =
    participant
      .participation_status;

  const {
    error,
  } = await supabase
    .from("participants")
    .update({
      participation_status:
        "cancelled",

      is_active: false,
    })
    .eq(
      "id",
      participantId
    )
    .eq(
      "collection_id",
      collectionId
    );

  if (error) {
    returnToParticipants(
      collectionId,
      "deactivate_failed"
    );
  }

  await logCollectionActivity({
    collectionId,

    organizationId:
      organization.id,

    actorUserId:
      userId,

    eventType:
      "participant.deactivated",

    subjectType:
      "participant",

    subjectId:
      participant.id,

    subjectLabel:
      participant.full_name,

    description:
      `${participant.full_name} was deactivated from the Collection.`,

    metadata: {
      previous_status:
        previousStatus,

      new_status:
        "cancelled",

      previous_active:
        participant.is_active,

      new_active:
        false,
    },
  });

  returnToParticipants(
    collectionId,
    "deactivated"
  );
}

// =========================================================
// REACTIVATE
//
// Organizer explicitly restoring a participant counts
// as approval.
// =========================================================

export async function reactivateParticipant(
  formData: FormData
) {
  const collectionId =
    String(
      formData.get(
        "collection_id"
      ) ?? ""
    ).trim();

  const participantId =
    String(
      formData.get(
        "participant_id"
      ) ?? ""
    ).trim();

  if (
    !collectionId ||
    !participantId
  ) {
    throw new Error(
      "Missing participant information."
    );
  }

  const {
    supabase,
    userId,
    organization,
  } =
    await getManagerContext(
      collectionId
    );

  const participant =
    await getParticipant(
      supabase,
      collectionId,
      participantId
    );

  const previousStatus =
    participant
      .participation_status;

  const previousActive =
    participant.is_active;

  const {
    error,
  } = await supabase
    .from("participants")
    .update({
      participation_status:
        "approved",

      is_active: true,
    })
    .eq(
      "id",
      participantId
    )
    .eq(
      "collection_id",
      collectionId
    );

  if (error) {
    returnToParticipants(
      collectionId,
      "reactivate_failed"
    );
  }

  await logCollectionActivity({
    collectionId,

    organizationId:
      organization.id,

    actorUserId:
      userId,

    eventType:
      "participant.reactivated",

    subjectType:
      "participant",

    subjectId:
      participant.id,

    subjectLabel:
      participant.full_name,

    description:
      `${participant.full_name} was reactivated and approved for the Collection.`,

    metadata: {
      previous_status:
        previousStatus,

      new_status:
        "approved",

      previous_active:
        previousActive,

      new_active:
        true,
    },
  });

  returnToParticipants(
    collectionId,
    "reactivated"
  );
}