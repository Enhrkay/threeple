"use server";

import { assertOrganizationOrganizerActionsAllowed } from "@/lib/restrictions/organization-server";
import { assertUserOrganizerActionsAllowed } from "@/lib/restrictions/user-server";
import { assertCollectionOrganizerChangesAllowed } from "@/lib/restrictions/server";
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
  supabaseAdmin,
} from "@/lib/supabase/admin";

function value(
  formData: FormData,
  key: string
) {
  return String(
    formData.get(key) ?? ""
  ).trim();
}

function returnToLifecycle(
  collectionId: string,
  result: string
): never {
  revalidatePath("/dashboard");
  revalidatePath(
    `/dashboard/collections/${collectionId}`
  );
  revalidatePath(
    `/dashboard/collections/${collectionId}/lifecycle`
  );

  redirect(
    `/dashboard/collections/${collectionId}/lifecycle?result=${encodeURIComponent(
      result
    )}`
  );
}

async function getCollectionManager(
  collectionId: string
) {
  const supabase =
    await createClient();

  const {
    data: claimsData,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    redirect(
      `/auth/login?next=${encodeURIComponent(
        `/dashboard/collections/${collectionId}/lifecycle`
      )}`
    );
  }

  const {
    data: collection,
    error:
      collectionError,
  } = await supabaseAdmin
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
    throw new Error(
      "You do not have permission to manage this collection."
    );
  }

  // -------------------------------------------------------


  // ORGANIZER RESTRICTION ENFORCEMENT


  // -------------------------------------------------------


  await assertUserOrganizerActionsAllowed(userId);


  await assertOrganizationOrganizerActionsAllowed(


    collection.organization_id


  );


  await assertCollectionOrganizerChangesAllowed(


    collection.id


  );



  return {


    userId,


    collection,


  };
}

async function historyCounts(
  collectionId: string
) {
  const [
    paymentResult,
    participantResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("payments")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "collection_id",
        collectionId
      ),

    supabaseAdmin
      .from("participants")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "collection_id",
        collectionId
      ),
  ]);

  return {
    paymentCount:
      paymentResult.count ??
      0,

    participantCount:
      participantResult.count ??
      0,
  };
}

export async function archiveFromLifecycle(
  formData: FormData
) {
  const collectionId =
    value(
      formData,
      "collection_id"
    );

  const reason =
    value(
      formData,
      "reason"
    );

  if (
    reason.length < 10
  ) {
    returnToLifecycle(
      collectionId,
      "reason_required"
    );
  }

  const {
    userId,
  } =
    await getCollectionManager(
      collectionId
    );

  const now =
    new Date().toISOString();

  const {
    error:
      collectionError,
  } = await supabaseAdmin
    .from("collections")
    .update({
      archived_at:
        now,
    })
    .eq(
      "id",
      collectionId
    );

  if (
    collectionError
  ) {
    returnToLifecycle(
      collectionId,
      "archive_failed"
    );
  }

  await supabaseAdmin
    .from(
      "collection_lifecycle"
    )
    .upsert(
      {
        collection_id:
          collectionId,
        lifecycle_status:
          "archived",
        reason,
        changed_by:
          userId,
        archived_at:
          now,
        updated_at:
          now,
      },
      {
        onConflict:
          "collection_id",
      }
    );

  returnToLifecycle(
    collectionId,
    "archived"
  );
}

export async function restoreFromLifecycle(
  formData: FormData
) {
  const collectionId =
    value(
      formData,
      "collection_id"
    );

  const reason =
    value(
      formData,
      "reason"
    );

  if (
    reason.length < 10
  ) {
    returnToLifecycle(
      collectionId,
      "reason_required"
    );
  }

  const {
    userId,
  } =
    await getCollectionManager(
      collectionId
    );

  const {
    data: lifecycle,
  } = await supabaseAdmin
    .from(
      "collection_lifecycle"
    )
    .select(`
      lifecycle_status
    `)
    .eq(
      "collection_id",
      collectionId
    )
    .maybeSingle();

  if (
    lifecycle?.lifecycle_status ===
      "historical_locked" ||
    lifecycle?.lifecycle_status ===
      "soft_deleted"
  ) {
    returnToLifecycle(
      collectionId,
      "restore_not_allowed"
    );
  }

  const now =
    new Date().toISOString();

  const {
    error,
  } = await supabaseAdmin
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
    returnToLifecycle(
      collectionId,
      "restore_failed"
    );
  }

  await supabaseAdmin
    .from(
      "collection_lifecycle"
    )
    .upsert(
      {
        collection_id:
          collectionId,
        lifecycle_status:
          "active",
        reason,
        changed_by:
          userId,
        restored_at:
          now,
        updated_at:
          now,
      },
      {
        onConflict:
          "collection_id",
      }
    );

  returnToLifecycle(
    collectionId,
    "restored"
  );
}

export async function deleteCollectionSafely(
  formData: FormData
) {
  const collectionId =
    value(
      formData,
      "collection_id"
    );

  const reason =
    value(
      formData,
      "reason"
    );

  const confirmation =
    value(
      formData,
      "confirmation"
    );

  if (
    reason.length < 10
  ) {
    returnToLifecycle(
      collectionId,
      "reason_required"
    );
  }

  if (
    confirmation !==
    "DELETE COLLECTION"
  ) {
    returnToLifecycle(
      collectionId,
      "confirmation_required"
    );
  }

  const {
    userId,
  } =
    await getCollectionManager(
      collectionId
    );

  const {
    paymentCount,
    participantCount,
  } =
    await historyCounts(
      collectionId
    );

  const now =
    new Date().toISOString();

  // Never remove the collection row here.
  // A collection can have activity, restrictions, schedules or
  // future accounting references that must remain traceable.
  const historical =
    paymentCount > 0 ||
    participantCount > 0;

  const {
    error:
      collectionError,
  } = await supabaseAdmin
    .from("collections")
    .update({
      status:
        "cancelled",
      archived_at:
        now,
    })
    .eq(
      "id",
      collectionId
    );

  if (
    collectionError
  ) {
    returnToLifecycle(
      collectionId,
      "delete_failed"
    );
  }

  const {
    error:
      lifecycleError,
  } = await supabaseAdmin
    .from(
      "collection_lifecycle"
    )
    .upsert(
      {
        collection_id:
          collectionId,

        lifecycle_status:
          historical
            ? "historical_locked"
            : "soft_deleted",

        reason,
        changed_by:
          userId,

        soft_deleted_at:
          historical
            ? null
            : now,

        historical_locked_at:
          historical
            ? now
            : null,

        updated_at:
          now,
      },
      {
        onConflict:
          "collection_id",
      }
    );

  if (
    lifecycleError
  ) {
    console.error(
      "COLLECTION_LIFECYCLE_AUDIT_FAILED",
      lifecycleError
    );

    returnToLifecycle(
      collectionId,
      "audit_failed"
    );
  }

  returnToLifecycle(
    collectionId,
    historical
      ? "preserved_history"
      : "deleted"
  );
}

