"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import {
  assertUserOrganizerActionsAllowed,
} from "@/lib/restrictions/user-server";

import {
  assertOrganizationNewCollectionAllowed,
} from "@/lib/restrictions/organization-server";

const allowedTypes = [
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

const allowedModes = [
  "target",
  "fixed_per_person",
  "flexible",
  "event_fee",
  "recurring_dues",
  "rotating_pool",
];

function optionalAmount(
  value: FormDataEntryValue | null
) {
  const raw =
    String(value ?? "").trim();

  if (!raw) {
    return null;
  }

  const number =
    Number(raw);

  if (
    !Number.isFinite(number) ||
    number <= 0
  ) {
    throw new Error(
      "Please enter a valid amount."
    );
  }

  return number;
}

export async function createCollection(
  formData: FormData
) {
  const supabase =
    await createClient();

  // -------------------------------------------------------
  // 1. Verify authenticated user
  // -------------------------------------------------------

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

  // -------------------------------------------------------
  // 2. User-level organizer restriction
  // -------------------------------------------------------

  await assertUserOrganizerActionsAllowed(
    userId
  );

  // -------------------------------------------------------
  // 3. Find user's personal workspace
  // -------------------------------------------------------

  const {
    data: workspace,
    error: workspaceError,
  } =
    await supabase
      .from(
        "organizations"
      )
      .select(
        "id"
      )
      .eq(
        "owner_id",
        userId
      )
      .eq(
        "organization_type",
        "personal"
      )
      .single();

  if (
    workspaceError ||
    !workspace
  ) {
    throw new Error(
      "Threeple workspace could not be found."
    );
  }

  // -------------------------------------------------------
  // 4. Organization-level creation restriction
  //
  // Blocks:
  // - new_collection_block
  // - full_organization
  // -------------------------------------------------------

  await assertOrganizationNewCollectionAllowed(
    workspace.id
  );

  // -------------------------------------------------------
  // 5. Read and validate form
  // -------------------------------------------------------

  const title =
    String(
      formData.get(
        "title"
      ) ?? ""
    ).trim();

  const description =
    String(
      formData.get(
        "description"
      ) ?? ""
    ).trim();

  const collectionType =
    String(
      formData.get(
        "collection_type"
      ) ?? ""
    );

  const collectionMode =
    String(
      formData.get(
        "collection_mode"
      ) ?? ""
    );

  const currency =
    String(
      formData.get(
        "currency"
      ) ?? "NGN"
    )
      .trim()
      .toUpperCase();

  const targetAmount =
    optionalAmount(
      formData.get(
        "target_amount"
      )
    );

  const defaultAmount =
    optionalAmount(
      formData.get(
        "default_amount"
      )
    );

  const deadlineRaw =
    String(
      formData.get(
        "deadline"
      ) ?? ""
    ).trim();

  const visibility =
    String(
      formData.get(
        "visibility"
      ) ?? "private"
    );

  if (
    title.length < 3
  ) {
    throw new Error(
      "Collection title must contain at least 3 characters."
    );
  }

  if (
    !allowedTypes.includes(
      collectionType
    )
  ) {
    throw new Error(
      "Invalid Collection type."
    );
  }

  if (
    !allowedModes.includes(
      collectionMode
    )
  ) {
    throw new Error(
      "Invalid Collection mode."
    );
  }

  if (
    currency.length !== 3
  ) {
    throw new Error(
      "Invalid currency."
    );
  }

  if (
    collectionMode ===
      "target" &&
    targetAmount === null
  ) {
    throw new Error(
      "A target Collection requires a target amount."
    );
  }

  if (
    [
      "fixed_per_person",
      "event_fee",
    ].includes(
      collectionMode
    ) &&
    defaultAmount === null
  ) {
    throw new Error(
      "This Collection requires an amount per participant."
    );
  }

  const deadline =
    deadlineRaw
      ? `${deadlineRaw}T23:59:59.000Z`
      : null;

  // -------------------------------------------------------
  // 6. Create Collection
  // -------------------------------------------------------

  const {
    error: insertError,
  } =
    await supabase
      .from(
        "collections"
      )
      .insert({
        organization_id:
          workspace.id,

        created_by:
          userId,

        title,

        description:
          description ||
          null,

        collection_type:
          collectionType,

        collection_mode:
          collectionMode,

        currency,

        target_amount:
          targetAmount,

        default_amount:
          defaultAmount,

        deadline,

        visibility,

        allow_partial_payments:
          formData.get(
            "allow_partial_payments"
          ) === "on",

        allow_custom_amount:
          formData.get(
            "allow_custom_amount"
          ) === "on",

        requires_approval:
          formData.get(
            "requires_approval"
          ) === "on",

        status:
          "draft",
      });

  if (insertError) {
    console.error(
      "CREATE COLLECTION ERROR:",
      insertError
    );

    throw new Error(
      `Collection could not be created: ${insertError.message}`
    );
  }

  // -------------------------------------------------------
  // 7. Refresh dashboard and return
  // -------------------------------------------------------

  revalidatePath(
    "/dashboard"
  );

  redirect(
    "/dashboard"
  );
}