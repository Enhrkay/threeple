"use server";

import {
  assertCollectionOrganizerChangesAllowed,
} from "@/lib/restrictions/server";

import {
  assertUserOrganizerActionsAllowed,
} from "@/lib/restrictions/user-server";

import {
  assertOrganizationOrganizerActionsAllowed,
} from "@/lib/restrictions/organization-server";

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
// MANAGER CONTEXT
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
    error: collectionError,
  } = await supabase
    .from("collections")
    .select(`
      id,
      title,
      organization_id,
      status,
      archived_at
    `)
    .eq(
      "id",
      collectionId
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
      "You do not have permission to manage this Collection."
    );
  }

  // =======================================================
  // USER-LEVEL ORGANIZER RESTRICTION
  //
  // organizer_block and full_platform stop this user from
  // making organizer-side changes across all Collections.
  // =======================================================

  await assertUserOrganizerActionsAllowed(
    userId
  );

  // =======================================================
  // ORGANIZATION-LEVEL ORGANIZER RESTRICTION
  //
  // organizer_changes_block and full_organization stop
  // organizer-side changes across this organization.
  // =======================================================

  await assertOrganizationOrganizerActionsAllowed(
    organization.id
  );

  // =======================================================
  // COLLECTION-LEVEL ORGANIZER RESTRICTION
  //
  // organizer_changes_block and full_collection stop
  // organizer-side changes to this specific Collection.
  // =======================================================

  await assertCollectionOrganizerChangesAllowed(
    collection.id
  );

  return {
    supabase,
    userId,
    collection,
    organization,
  };
}

// =========================================================
// REDIRECT HELPER
// =========================================================

function returnToCollection(
  collectionId: string,
  result: string
): never {
  revalidatePath(
    "/dashboard"
  );

  revalidatePath(
    `/dashboard/collections/${collectionId}`
  );

  redirect(
    `/dashboard/collections/${collectionId}?result=${encodeURIComponent(
      result
    )}`
  );
}

// =========================================================
// ACTIVATE
// =========================================================

export async function activateCollection(
  formData: FormData
) {
  const collectionId =
    String(
      formData.get(
        "collection_id"
      ) ?? ""
    ).trim();

  if (!collectionId) {
    throw new Error(
      "Collection ID is missing."
    );
  }

  const {
    supabase,
    userId,
    collection,
    organization,
  } =
    await getManagerContext(
      collectionId
    );

  if (
    collection.archived_at
  ) {
    returnToCollection(
      collectionId,
      "restore_before_activation"
    );
  }

  if (
    collection.status !==
    "draft"
  ) {
    returnToCollection(
      collectionId,
      "already_activated"
    );
  }

  const {
    error,
  } = await supabase
    .from("collections")
    .update({
      status:
        "active",

      closed_at:
        null,
    })
    .eq(
      "id",
      collectionId
    )
    .eq(
      "status",
      "draft"
    );

  if (error) {
    returnToCollection(
      collectionId,
      "activate_failed"
    );
  }

  await logCollectionActivity({
    collectionId,

    organizationId:
      organization.id,

    actorUserId:
      userId,

    eventType:
      "collection.activated",

    subjectType:
      "collection",

    subjectId:
      collection.id,

    subjectLabel:
      collection.title,

    description:
      `${collection.title} was activated.`,

    metadata: {
      previous_status:
        "draft",

      new_status:
        "active",
    },
  });

  returnToCollection(
    collectionId,
    "activated"
  );
}

// =========================================================
// CLOSE
// =========================================================

export async function closeCollection(
  formData: FormData
) {
  const collectionId =
    String(
      formData.get(
        "collection_id"
      ) ?? ""
    ).trim();

  if (!collectionId) {
    throw new Error(
      "Collection ID is missing."
    );
  }

  const {
    supabase,
    userId,
    collection,
    organization,
  } =
    await getManagerContext(
      collectionId
    );

  if (
    collection.archived_at
  ) {
    returnToCollection(
      collectionId,
      "restore_before_closing"
    );
  }

  if (
    collection.status !==
    "active"
  ) {
    returnToCollection(
      collectionId,
      "close_not_allowed"
    );
  }

  const closedAt =
    new Date().toISOString();

  const {
    error,
  } = await supabase
    .from("collections")
    .update({
      status:
        "closed",

      closed_at:
        closedAt,
    })
    .eq(
      "id",
      collectionId
    )
    .eq(
      "status",
      "active"
    );

  if (error) {
    returnToCollection(
      collectionId,
      "close_failed"
    );
  }

  await logCollectionActivity({
    collectionId,

    organizationId:
      organization.id,

    actorUserId:
      userId,

    eventType:
      "collection.closed",

    subjectType:
      "collection",

    subjectId:
      collection.id,

    subjectLabel:
      collection.title,

    description:
      `${collection.title} was closed.`,

    metadata: {
      previous_status:
        "active",

      new_status:
        "closed",

      closed_at:
        closedAt,
    },
  });

  returnToCollection(
    collectionId,
    "closed"
  );
}

// =========================================================
// REOPEN
// =========================================================

export async function reopenCollection(
  formData: FormData
) {
  const collectionId =
    String(
      formData.get(
        "collection_id"
      ) ?? ""
    ).trim();

  if (!collectionId) {
    throw new Error(
      "Collection ID is missing."
    );
  }

  const {
    supabase,
    userId,
    collection,
    organization,
  } =
    await getManagerContext(
      collectionId
    );

  if (
    collection.archived_at
  ) {
    returnToCollection(
      collectionId,
      "restore_before_reopening"
    );
  }

  if (
    collection.status !==
    "closed"
  ) {
    returnToCollection(
      collectionId,
      "reopen_not_allowed"
    );
  }

  const {
    error,
  } = await supabase
    .from("collections")
    .update({
      status:
        "active",

      closed_at:
        null,
    })
    .eq(
      "id",
      collectionId
    )
    .eq(
      "status",
      "closed"
    );

  if (error) {
    returnToCollection(
      collectionId,
      "reopen_failed"
    );
  }

  await logCollectionActivity({
    collectionId,

    organizationId:
      organization.id,

    actorUserId:
      userId,

    eventType:
      "collection.reopened",

    subjectType:
      "collection",

    subjectId:
      collection.id,

    subjectLabel:
      collection.title,

    description:
      `${collection.title} was reopened.`,

    metadata: {
      previous_status:
        "closed",

      new_status:
        "active",
    },
  });

  returnToCollection(
    collectionId,
    "reopened"
  );
}

// =========================================================
// ARCHIVE
// =========================================================

export async function archiveCollection(
  formData: FormData
) {
  const collectionId =
    String(
      formData.get(
        "collection_id"
      ) ?? ""
    ).trim();

  if (!collectionId) {
    throw new Error(
      "Collection ID is missing."
    );
  }

  const {
    supabase,
    userId,
    collection,
    organization,
  } =
    await getManagerContext(
      collectionId
    );

  if (
    collection.archived_at
  ) {
    returnToCollection(
      collectionId,
      "already_archived"
    );
  }

  if (
    ![
      "closed",
      "cancelled",
    ].includes(
      collection.status
    )
  ) {
    returnToCollection(
      collectionId,
      "archive_not_allowed"
    );
  }

  const archivedAt =
    new Date().toISOString();

  const {
    error,
  } = await supabase
    .from("collections")
    .update({
      archived_at:
        archivedAt,
    })
    .eq(
      "id",
      collectionId
    )
    .is(
      "archived_at",
      null
    );

  if (error) {
    returnToCollection(
      collectionId,
      "archive_failed"
    );
  }

  await logCollectionActivity({
    collectionId,

    organizationId:
      organization.id,

    actorUserId:
      userId,

    eventType:
      "collection.archived",

    subjectType:
      "collection",

    subjectId:
      collection.id,

    subjectLabel:
      collection.title,

    description:
      `${collection.title} was archived.`,

    metadata: {
      status:
        collection.status,

      archived_at:
        archivedAt,
    },
  });

  returnToCollection(
    collectionId,
    "archived"
  );
}

// =========================================================
// RESTORE
// =========================================================

export async function restoreCollection(
  formData: FormData
) {
  const collectionId =
    String(
      formData.get(
        "collection_id"
      ) ?? ""
    ).trim();

  if (!collectionId) {
    throw new Error(
      "Collection ID is missing."
    );
  }

  const {
    supabase,
    userId,
    collection,
    organization,
  } =
    await getManagerContext(
      collectionId
    );

  if (
    !collection.archived_at
  ) {
    returnToCollection(
      collectionId,
      "not_archived"
    );
  }

  const previousArchivedAt =
    collection.archived_at;

  const {
    error,
  } = await supabase
    .from("collections")
    .update({
      archived_at:
        null,
    })
    .eq(
      "id",
      collectionId
    );

  if (error) {
    returnToCollection(
      collectionId,
      "restore_failed"
    );
  }

  await logCollectionActivity({
    collectionId,

    organizationId:
      organization.id,

    actorUserId:
      userId,

    eventType:
      "collection.restored",

    subjectType:
      "collection",

    subjectId:
      collection.id,

    subjectLabel:
      collection.title,

    description:
      `${collection.title} was restored from archive.`,

    metadata: {
      status:
        collection.status,

      previous_archived_at:
        previousArchivedAt,
    },
  });

  returnToCollection(
    collectionId,
    "restored"
  );
}