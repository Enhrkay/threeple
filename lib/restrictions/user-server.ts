"use server";

import {
  redirect,
} from "next/navigation";

import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

type UserRestriction = {
  id: string;
  user_id: string;
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

export async function getActiveUserRestriction(
  userId: string
) {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("user_restrictions")
    .select(`
      id,
      user_id,
      trust_safety_report_id,
      restriction_type,
      reason,
      imposed_by,
      imposed_at,
      lifted_by,
      lifted_at,
      lift_reason
    `)
    .eq("user_id", userId)
    .is("lifted_at", null)
    .order(
      "imposed_at",
      { ascending: false }
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "Active user restriction lookup failed:",
      error
    );
    return null;
  }

  return (
    data as UserRestriction | null
  );
}

export async function getUserParticipationRestriction(
  userId: string
) {
  const restriction =
    await getActiveUserRestriction(
      userId
    );

  const blocked =
    restriction?.restriction_type ===
      "participation_block" ||
    restriction?.restriction_type ===
      "full_platform";

  return {
    blocked,
    restriction,
  };
}

export async function getUserOrganizerRestriction(
  userId: string
) {
  const restriction =
    await getActiveUserRestriction(
      userId
    );

  const blocked =
    restriction?.restriction_type ===
      "organizer_block" ||
    restriction?.restriction_type ===
      "full_platform";

  return {
    blocked,
    restriction,
  };
}

export async function assertUserParticipationAllowed(
  userId: string,
  returnTo = "/dashboard"
) {
  const {
    blocked,
    restriction,
  } =
    await getUserParticipationRestriction(
      userId
    );

  if (
    blocked &&
    restriction
  ) {
    redirect(
      `/restricted?scope=user_participation&subjectId=${encodeURIComponent(
        userId
      )}&type=${encodeURIComponent(
        restriction.restriction_type
      )}&returnTo=${encodeURIComponent(
        returnTo
      )}`
    );
  }
}

export async function assertUserOrganizerActionsAllowed(
  userId: string,
  returnTo = "/dashboard"
) {
  const {
    blocked,
    restriction,
  } =
    await getUserOrganizerRestriction(
      userId
    );

  if (
    blocked &&
    restriction
  ) {
    redirect(
      `/restricted?scope=user_organizer&subjectId=${encodeURIComponent(
        userId
      )}&type=${encodeURIComponent(
        restriction.restriction_type
      )}&returnTo=${encodeURIComponent(
        returnTo
      )}`
    );
  }
}
