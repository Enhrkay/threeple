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
  assertCollectionOrganizerChangesAllowed,
} from "@/lib/restrictions/server";

const COLLECTION_TYPES = [
  "wedding",
  "event",
  "society_dues",
  "association_dues",
  "group_contribution",
  "project_fund",
  "trip",
  "shared_gift",
  "levy",
  "community_fund",
  "other",
];

const COLLECTION_MODES = [
  "target",
  "fixed_per_person",
  "flexible",
  "event_fee",
  "recurring_dues",
  "rotating_pool",
];

const VISIBILITIES = [
  "private",
  "summary",
  "public",
];

const ACCESS_MODES = [
  "none",
  "approval",
  "seat",
  "ticket",
];

// =========================================================
// FORM HELPERS
// =========================================================

function value(
  formData: FormData,
  key: string
) {
  return String(
    formData.get(key) ?? ""
  ).trim();
}

function optionalNumber(
  raw: string
) {
  if (!raw) {
    return null;
  }

  const number =
    Number(raw);

  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    return null;
  }

  return number;
}

// =========================================================
// EDIT ERROR
// =========================================================

function editError(
  collectionId: string,
  error: string
): never {
  redirect(
    `/dashboard/collections/${collectionId}/edit?error=${encodeURIComponent(
      error
    )}`
  );
}

// =========================================================
// PLATFORM RESTRICTION HANDLER
//
// organizer_changes_block
// → prevents Collection editing
//
// full_collection
// → prevents Collection editing
//
// join_block
// → does NOT prevent organizer editing
// =========================================================

async function enforceOrganizerChangesOrEditError(
  collectionId: string
) {
  try {
    await assertCollectionOrganizerChangesAllowed(
      collectionId
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "COLLECTION_PLATFORM_RESTRICTED"
    ) {
      editError(
        collectionId,
        "platform_restricted"
      );
    }

    throw error;
  }
}

// =========================================================
// UPDATE COLLECTION
// =========================================================

export async function updateCollection(
  formData: FormData
) {
  const supabase =
    await createClient();

  // =======================================================
  // AUTHENTICATION
  // =======================================================

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

  const collectionId =
    value(
      formData,
      "collection_id"
    );

  if (!collectionId) {
    throw new Error(
      "Collection ID is missing."
    );
  }

  // =======================================================
  // LOAD COLLECTION
  // =======================================================

  const {
    data: collection,
    error: collectionError,
  } = await supabase
    .from("collections")
    .select(`
      id,
      organization_id,
      status,
      collection_type,
      collection_mode,
      currency,
      target_amount,
      default_amount
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
    editError(
      collectionId,
      "collection_not_found"
    );
  }

  // =======================================================
  // OWNER / ADMIN CHECK
  //
  // We verify organizer permission BEFORE checking the
  // platform restriction so unauthorized users cannot
  // probe a Collection's Trust & Safety state.
  // =======================================================

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

  let canEdit =
    organization?.owner_id ===
    userId;

  if (!canEdit) {
    const {
      data: membership,
    } = await supabase
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
      .in(
        "role",
        [
          "admin",
        ]
      )
      .maybeSingle();

    canEdit =
      Boolean(membership);
  }

  if (!canEdit) {
    editError(
      collectionId,
      "not_allowed"
    );
  }

  // =======================================================
  // PLATFORM ORGANIZER RESTRICTION
  //
  // This is server-side enforcement.
  //
  // Even if someone manually visits the edit URL or
  // submits the Server Action directly, restricted
  // Collections cannot be modified.
  // =======================================================

  await enforceOrganizerChangesOrEditError(
    collectionId
  );

  // =======================================================
  // COMMON EDITABLE FIELDS
  // =======================================================

  const title =
    value(
      formData,
      "title"
    );

  const description =
    value(
      formData,
      "description"
    );

  const deadline =
    value(
      formData,
      "deadline"
    );

  const visibility =
    value(
      formData,
      "visibility"
    );

  const requiresApproval =
    formData.get(
      "requires_approval"
    ) === "on";

  const showParticipantNames =
    formData.get(
      "show_participant_names"
    ) === "on";

  const showPaymentAmounts =
    formData.get(
      "show_payment_amounts"
    ) === "on";

  const accessMode =
    value(
      formData,
      "access_mode"
    );

  if (!title) {
    editError(
      collectionId,
      "title_required"
    );
  }

  if (
    !VISIBILITIES.includes(
      visibility
    )
  ) {
    editError(
      collectionId,
      "invalid_visibility"
    );
  }

  if (
    !ACCESS_MODES.includes(
      accessMode
    )
  ) {
    editError(
      collectionId,
      "invalid_access_mode"
    );
  }

  const updates:
    Record<
      string,
      unknown
    > = {
      title,

      description:
        description || null,

      deadline:
        deadline
          ? new Date(
              deadline
            ).toISOString()
          : null,

      visibility,

      requires_approval:
        requiresApproval,

      show_participant_names:
        showParticipantNames,

      show_payment_amounts:
        showPaymentAmounts,

      access_mode:
        accessMode,
    };

  // =======================================================
  // DRAFT-ONLY STRUCTURAL EDITS
  // =======================================================

  if (
    collection.status ===
    "draft"
  ) {
    const collectionType =
      value(
        formData,
        "collection_type"
      );

    const collectionMode =
      value(
        formData,
        "collection_mode"
      );

    const currency =
      value(
        formData,
        "currency"
      ).toUpperCase();

    const targetAmount =
      optionalNumber(
        value(
          formData,
          "target_amount"
        )
      );

    const defaultAmount =
      optionalNumber(
        value(
          formData,
          "default_amount"
        )
      );

    const allowPartialPayments =
      formData.get(
        "allow_partial_payments"
      ) === "on";

    const allowCustomAmount =
      formData.get(
        "allow_custom_amount"
      ) === "on";

    if (
      !COLLECTION_TYPES.includes(
        collectionType
      )
    ) {
      editError(
        collectionId,
        "invalid_type"
      );
    }

    if (
      !COLLECTION_MODES.includes(
        collectionMode
      )
    ) {
      editError(
        collectionId,
        "invalid_mode"
      );
    }

    if (
      currency.length !== 3
    ) {
      editError(
        collectionId,
        "invalid_currency"
      );
    }

    if (
      collectionMode ===
        "target" &&
      (
        targetAmount === null ||
        targetAmount <= 0
      )
    ) {
      editError(
        collectionId,
        "target_required"
      );
    }

    if (
      (
        collectionMode ===
          "fixed_per_person" ||
        collectionMode ===
          "event_fee"
      ) &&
      (
        defaultAmount ===
          null ||
        defaultAmount <= 0
      )
    ) {
      editError(
        collectionId,
        "default_required"
      );
    }

    updates.collection_type =
      collectionType;

    updates.collection_mode =
      collectionMode;

    updates.currency =
      currency;

    updates.target_amount =
      targetAmount;

    updates.default_amount =
      defaultAmount;

    updates.allow_partial_payments =
      allowPartialPayments;

    updates.allow_custom_amount =
      allowCustomAmount;
  }

  // =======================================================
  // UPDATE
  // =======================================================

  const {
    error: updateError,
  } = await supabase
    .from("collections")
    .update(updates)
    .eq(
      "id",
      collectionId
    );

  if (updateError) {
    console.error(
      "COLLECTION_UPDATE_FAILED",
      {
        collectionId,
      }
    );

    editError(
      collectionId,
      "update_failed"
    );
  }

  // =======================================================
  // REVALIDATE
  // =======================================================

  revalidatePath(
    "/dashboard"
  );

  revalidatePath(
    `/dashboard/collections/${collectionId}`
  );

  revalidatePath(
    `/dashboard/collections/${collectionId}/edit`
  );

  // =======================================================
  // SUCCESS
  // =======================================================

  redirect(
    `/dashboard/collections/${collectionId}`
  );
}