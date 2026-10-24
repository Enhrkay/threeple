"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

import {
  assertCollectionOrganizerChangesAllowed,
} from "@/lib/restrictions/server";

import {
  assertUserOrganizerActionsAllowed,
} from "@/lib/restrictions/user-server";

import {
  assertOrganizationOrganizerActionsAllowed,
} from "@/lib/restrictions/organization-server";

async function requireRotationManager(
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
      organization_id,
      title,
      collection_mode,
      status,
      archived_at
    `)
    .eq("id", collectionId)
    .maybeSingle();

  if (
    collectionError ||
    !collection
  ) {
    throw new Error(
      "Collection not found."
    );
  }

  if (
    collection.collection_mode !==
      "rotating_pool"
  ) {
    throw new Error(
      "This Collection is not rotational."
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
      .from("organization_members")
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
      Boolean(membership);
  }

  if (!allowed) {
    throw new Error(
      "You do not have permission to manage this Collection."
    );
  }

  await assertUserOrganizerActionsAllowed(
    userId
  );

  await assertOrganizationOrganizerActionsAllowed(
    organization.id
  );

  await assertCollectionOrganizerChangesAllowed(
    collection.id
  );

  return {
    userId,
    collection,
    organization,
  };
}

function returnToRotation(
  collectionId: string,
  result: string
): never {
  revalidatePath(
    `/dashboard/collections/${collectionId}`
  );

  revalidatePath(
    `/dashboard/collections/${collectionId}/rotation`
  );

  redirect(
    `/dashboard/collections/${collectionId}/rotation?result=${encodeURIComponent(
      result
    )}`
  );
}

export async function seedRotationMembers(
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
    collection,
  } =
    await requireRotationManager(
      collectionId
    );

  if (collection.archived_at) {
    returnToRotation(
      collectionId,
      "collection_archived"
    );
  }

  const {
    error,
  } =
    await supabaseAdmin.rpc(
      "seed_rotation_members",
      {
        p_collection_id:
          collectionId,
      }
    );

  if (error) {
    console.error(
      "SEED ROTATION MEMBERS FAILED:",
      error
    );

    returnToRotation(
      collectionId,
      "seed_failed"
    );
  }

  returnToRotation(
    collectionId,
    "members_seeded"
  );
}

export async function generateRotationSchedule(
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
    collection,
  } =
    await requireRotationManager(
      collectionId
    );

  if (collection.archived_at) {
    returnToRotation(
      collectionId,
      "collection_archived"
    );
  }

  const {
    error,
  } =
    await supabaseAdmin.rpc(
      "generate_rotation_schedule",
      {
        p_collection_id:
          collectionId,
      }
    );

  if (error) {
    console.error(
      "GENERATE ROTATION SCHEDULE FAILED:",
      error
    );

    returnToRotation(
      collectionId,
      "schedule_failed"
    );
  }

  returnToRotation(
    collectionId,
    "schedule_generated"
  );
}
