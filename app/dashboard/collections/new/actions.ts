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
  const expectedParticipantCountRaw =
    String(
      formData.get(
        "expected_participant_count"
      ) ?? ""
    ).trim();

  const expectedParticipantCount =
    expectedParticipantCountRaw
      ? Number(expectedParticipantCountRaw)
      : null;

  let contributionAmountPolicy:
    | "calculated_equal_share"
    | "fixed_per_person"
    | "flexible"
    | "schedule_based";

  let normalizedDefaultAmount =
    defaultAmount;

  let normalizedAllowCustomAmount =
    false;

  if (
    collectionMode === "target"
  ) {
    contributionAmountPolicy =
      "calculated_equal_share";

    if (
      targetAmount === null ||
      !Number.isInteger(
        expectedParticipantCount
      ) ||
      Number(
        expectedParticipantCount
      ) <= 0
    ) {
      throw new Error(
        "Equal-share target collections require a target amount and a valid expected participant count."
      );
    }

    normalizedDefaultAmount =
      null;

    normalizedAllowCustomAmount =
      false;
  } else if (
    collectionMode ===
      "fixed_per_person" ||
    collectionMode ===
      "event_fee"
  ) {
    contributionAmountPolicy =
      "fixed_per_person";

    if (
      defaultAmount === null
    ) {
      throw new Error(
        "Fixed-per-person and event-fee collections require an amount per participant."
      );
    }

    normalizedAllowCustomAmount =
      false;
  } else if (
    collectionMode ===
      "flexible"
  ) {
    contributionAmountPolicy =
      "flexible";

    if (
      targetAmount === null
    ) {
      throw new Error(
        "Flexible target collections require a target amount."
      );
    }

    normalizedDefaultAmount =
      null;

    normalizedAllowCustomAmount =
      true;
  } else if (
    collectionMode ===
      "recurring_dues" ||
    collectionMode ===
      "rotating_pool"
  ) {
    contributionAmountPolicy =
      "schedule_based";

    if (
      defaultAmount === null
    ) {
      throw new Error(
        "Recurring and rotational collections require a base contribution per cycle."
      );
    }

    normalizedAllowCustomAmount =
      false;
  } else {
    throw new Error(
      "Select a valid contribution model."
    );
  }

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
  const rotationFrequency =
    String(
      formData.get(
        "rotation_frequency"
      ) ?? ""
    ).trim();

  const rotationStartDate =
    String(
      formData.get(
        "rotation_start_date"
      ) ?? ""
    ).trim();

  const coordinatorFeeMode =
    String(
      formData.get(
        "coordinator_fee_mode"
      ) ?? "none"
    ).trim();

  const coordinatorFeeValueRaw =
    String(
      formData.get(
        "coordinator_fee_value"
      ) ?? ""
    ).trim();

  const coordinatorFeeValue =
    coordinatorFeeValueRaw
      ? Number(
          coordinatorFeeValueRaw
        )
      : 0;

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
  if (
    collectionMode ===
      "rotating_pool"
  ) {
    if (
      ![
        "weekly",
        "biweekly",
        "monthly",
      ].includes(
        rotationFrequency
      )
    ) {
      throw new Error(
        "Select a valid rotational contribution frequency."
      );
    }

    if (!rotationStartDate) {
      throw new Error(
        "Rotational contributions require a start date."
      );
    }

    if (
      ![
        "none",
        "fixed",
        "percentage",
      ].includes(
        coordinatorFeeMode
      )
    ) {
      throw new Error(
        "Select a valid coordinator fee type."
      );
    }

    if (
      !Number.isFinite(
        coordinatorFeeValue
      ) ||
      coordinatorFeeValue < 0
    ) {
      throw new Error(
        "Coordinator fee must be zero or greater."
      );
    }

    if (
      coordinatorFeeMode ===
        "percentage" &&
      coordinatorFeeValue > 100
    ) {
      throw new Error(
        "Coordinator percentage cannot exceed 100%."
      );
    }
  }

  const deadline =
    deadlineRaw
      ? `${deadlineRaw}T23:59:59.000Z`
      : null;

  // -------------------------------------------------------
  // 6. Create Collection
  // -------------------------------------------------------

  const {
    data: createdCollection,
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
          normalizedDefaultAmount,

        contribution_amount_policy:
          contributionAmountPolicy,

        expected_participant_count:
          collectionMode === "target"
            ? expectedParticipantCount
            : null,

        deadline,

        visibility,

        allow_partial_payments:
          formData.get(
            "allow_partial_payments"
          ) === "on",

        allow_custom_amount:
          normalizedAllowCustomAmount,

        requires_approval:
          formData.get(
            "requires_approval"
          ) === "on",

        status:
          "draft",
      })
      .select("id")
      .single();

  if (insertError) {
    console.error(
      "CREATE COLLECTION ERROR:",
      insertError
    );

    throw new Error(
      `Collection could not be created: ${insertError.message}`
    );
  }
  if (
    !createdCollection?.id
  ) {
    throw new Error(
      "Threeple created the Collection but could not confirm its ID."
    );
  }

  if (
    collectionMode ===
      "rotating_pool"
  ) {
    const {
      error: rotationError,
    } =
      await supabase
        .from(
          "rotation_settings"
        )
        .insert({
          collection_id:
            createdCollection.id,

          contribution_amount:
            normalizedDefaultAmount,

          frequency:
            rotationFrequency,

          start_date:
            rotationStartDate,

          coordinator_fee_mode:
            coordinatorFeeMode,

          coordinator_fee_value:
            coordinatorFeeMode ===
              "none"
              ? 0
              : coordinatorFeeValue,

          status:
            "draft",
        });

    if (rotationError) {
      console.error(
        "CREATE ROTATION SETTINGS ERROR:",
        rotationError
      );

      await supabase
        .from(
          "collections"
        )
        .delete()
        .eq(
          "id",
          createdCollection.id
        );

      throw new Error(
        `Rotational settings could not be created: ${rotationError.message}`
      );
    }
  }

  // -------------------------------------------------------
  // 7. Refresh dashboard and return
  // -------------------------------------------------------

  revalidatePath(
    "/dashboard"
  );

  if (
    collectionMode ===
      "rotating_pool"
  ) {
    redirect(
      `/dashboard/collections/${createdCollection.id}`
    );
  }

  redirect(
    "/dashboard"
  );
}
