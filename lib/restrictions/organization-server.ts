"use server";

import {
  redirect,
} from "next/navigation";

import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

type OrganizationRestriction = {
  id: string;
  organization_id: string;
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

export async function getActiveOrganizationRestriction(
  organizationId: string
) {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from(
      "organization_restrictions"
    )
    .select(`
      id,
      organization_id,
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
      "organization_id",
      organizationId
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
      "Active organization restriction lookup failed:",
      error
    );

    return null;
  }

  return (
    data as
      | OrganizationRestriction
      | null
  );
}

export async function getOrganizationNewCollectionRestriction(
  organizationId: string
) {
  const restriction =
    await getActiveOrganizationRestriction(
      organizationId
    );

  const blocked =
    restriction?.restriction_type ===
      "new_collection_block" ||
    restriction?.restriction_type ===
      "full_organization";

  return {
    blocked,
    restriction,
  };
}

export async function getOrganizationOrganizerRestriction(
  organizationId: string
) {
  const restriction =
    await getActiveOrganizationRestriction(
      organizationId
    );

  const blocked =
    restriction?.restriction_type ===
      "organizer_changes_block" ||
    restriction?.restriction_type ===
      "full_organization";

  return {
    blocked,
    restriction,
  };
}

export async function getOrganizationParticipationRestriction(
  organizationId: string
) {
  const restriction =
    await getActiveOrganizationRestriction(
      organizationId
    );

  const blocked =
    restriction?.restriction_type ===
      "full_organization";

  return {
    blocked,
    restriction,
  };
}

export async function assertOrganizationNewCollectionAllowed(
  organizationId: string,
  returnTo = "/dashboard"
) {
  const {
    blocked,
    restriction,
  } =
    await getOrganizationNewCollectionRestriction(
      organizationId
    );

  if (
    blocked &&
    restriction
  ) {
    redirect(
      `/restricted?scope=organization_new_collection&subjectId=${encodeURIComponent(
        organizationId
      )}&type=${encodeURIComponent(
        restriction.restriction_type
      )}&returnTo=${encodeURIComponent(
        returnTo
      )}`
    );
  }
}

export async function assertOrganizationOrganizerActionsAllowed(
  organizationId: string,
  returnTo = "/dashboard"
) {
  const {
    blocked,
    restriction,
  } =
    await getOrganizationOrganizerRestriction(
      organizationId
    );

  if (
    blocked &&
    restriction
  ) {
    redirect(
      `/restricted?scope=organization_organizer&subjectId=${encodeURIComponent(
        organizationId
      )}&type=${encodeURIComponent(
        restriction.restriction_type
      )}&returnTo=${encodeURIComponent(
        returnTo
      )}`
    );
  }
}

export async function assertOrganizationParticipationAllowed(
  organizationId: string,
  returnTo = "/dashboard"
) {
  const {
    blocked,
    restriction,
  } =
    await getOrganizationParticipationRestriction(
      organizationId
    );

  if (
    blocked &&
    restriction
  ) {
    redirect(
      `/restricted?scope=organization_participation&subjectId=${encodeURIComponent(
        organizationId
      )}&type=${encodeURIComponent(
        restriction.restriction_type
      )}&returnTo=${encodeURIComponent(
        returnTo
      )}`
    );
  }
}
