"use server";

import {
  redirect,
} from "next/navigation";

import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

type CollectionRestriction = {
  id: string;
  collection_id: string;
  trust_safety_report_id:
    | string
    | null;
  restriction_type: string;
  reason: string;
  imposed_by: string;
  imposed_at: string;
  lifted_by:
    | string
    | null;
  lifted_at:
    | string
    | null;
  lift_reason:
    | string
    | null;
};

export async function getActiveCollectionRestriction(
  collectionId: string
) {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from(
      "collection_restrictions"
    )
    .select(`
      id,
      collection_id,
      trust_safety_report_id,
      restriction_type,
      reason,
      imposed_by,
      imposed_at,
      lifted_by,
      lifted_at,
      lift_reason
    `)
    .eq(
      "collection_id",
      collectionId
    )
    .is(
      "lifted_at",
      null
    )
    .order(
      "imposed_at",
      {
        ascending: false,
      }
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "Active Collection restriction lookup failed:",
      error
    );

    return null;
  }

  return (
    data as
      | CollectionRestriction
      | null
  );
}

export async function getCollectionJoinRestriction(
  collectionId: string
) {
  const restriction =
    await getActiveCollectionRestriction(
      collectionId
    );

  const blocked =
    restriction?.restriction_type ===
      "join_block" ||
    restriction?.restriction_type ===
      "full_collection";

  return {
    blocked,
    restriction,
  };
}

export async function getCollectionOrganizerRestriction(
  collectionId: string
) {
  const restriction =
    await getActiveCollectionRestriction(
      collectionId
    );

  const blocked =
    restriction?.restriction_type ===
      "organizer_changes_block" ||
    restriction?.restriction_type ===
      "full_collection";

  return {
    blocked,
    restriction,
  };
}

export async function assertCollectionJoinAllowed(
  collectionId: string,
  returnTo = "/dashboard"
) {
  const {
    blocked,
    restriction,
  } =
    await getCollectionJoinRestriction(
      collectionId
    );

  if (
    blocked &&
    restriction
  ) {
    redirect(
      `/restricted?scope=collection_participation&subjectId=${encodeURIComponent(
        collectionId
      )}&type=${encodeURIComponent(
        restriction.restriction_type
      )}&returnTo=${encodeURIComponent(
        returnTo
      )}`
    );
  }
}

export async function assertCollectionOrganizerChangesAllowed(
  collectionId: string,
  returnTo = "/dashboard"
) {
  const {
    blocked,
    restriction,
  } =
    await getCollectionOrganizerRestriction(
      collectionId
    );

  if (
    blocked &&
    restriction
  ) {
    redirect(
      `/restricted?scope=collection_organizer&subjectId=${encodeURIComponent(
        collectionId
      )}&type=${encodeURIComponent(
        restriction.restriction_type
      )}&returnTo=${encodeURIComponent(
        returnTo
      )}`
    );
  }
}
