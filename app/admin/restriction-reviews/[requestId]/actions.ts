"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  requirePlatformAdmin,
} from "@/lib/admin/server";

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

function canInvestigate(
  role: string
) {
  return [
    "super_admin",
    "admin",
    "risk_ops",
  ].includes(role);
}

function returnToReview(
  requestId: string,
  result: string
): never {
  revalidatePath(
    "/admin/restriction-reviews"
  );

  revalidatePath(
    `/admin/restriction-reviews/${requestId}`
  );

  revalidatePath(
    "/admin/users"
  );

  revalidatePath(
    "/admin/organizations"
  );

  revalidatePath(
    "/admin/collections"
  );

  revalidatePath(
    "/admin"
  );

  redirect(
    `/admin/restriction-reviews/${requestId}?result=${encodeURIComponent(
      result
    )}`
  );
}

async function decideReview(
  formData: FormData,
  decision:
    | "approved"
    | "declined"
) {
  const admin =
    await requirePlatformAdmin();

  const requestId =
    value(
      formData,
      "request_id"
    );

  const adminNotes =
    value(
      formData,
      "admin_notes"
    );

  if (!requestId) {
    redirect(
      "/admin/restriction-reviews"
    );
  }

  if (
    !canInvestigate(
      admin.role
    )
  ) {
    returnToReview(
      requestId,
      "not_authorized"
    );
  }

  if (
    adminNotes.length < 10
  ) {
    returnToReview(
      requestId,
      "notes_required"
    );
  }

  const {
    data: request,
  } = await supabaseAdmin
    .from(
      "restriction_review_requests"
    )
    .select(`
      id,
      status
    `)
    .eq(
      "id",
      requestId
    )
    .maybeSingle();

  if (!request) {
    returnToReview(
      requestId,
      "request_missing"
    );
  }

  if (
    ![
      "submitted",
      "under_review",
    ].includes(
      request.status
    )
  ) {
    returnToReview(
      requestId,
      "already_decided"
    );
  }

  const {
    error,
  } = await supabaseAdmin.rpc(
    "admin_decide_restriction_review",
    {
      p_admin_user_id:
        admin.userId,

      p_review_request_id:
        requestId,

      p_decision:
        decision,

      p_admin_notes:
        adminNotes,
    }
  );

  if (error) {
    console.error(
      "RESTRICTION_REVIEW_DECISION_FAILED",
      error
    );

    returnToReview(
      requestId,
      "decision_failed"
    );
  }

  returnToReview(
    requestId,
    decision
  );
}

export async function approveRestrictionReview(
  formData: FormData
) {
  return decideReview(
    formData,
    "approved"
  );
}

export async function declineRestrictionReview(
  formData: FormData
) {
  return decideReview(
    formData,
    "declined"
  );
}

export async function startRestrictionReview(
  formData: FormData
) {
  const admin =
    await requirePlatformAdmin();

  const requestId =
    value(
      formData,
      "request_id"
    );

  if (!requestId) {
    redirect(
      "/admin/restriction-reviews"
    );
  }

  if (
    !canInvestigate(
      admin.role
    )
  ) {
    returnToReview(
      requestId,
      "not_authorized"
    );
  }

  const {
    data: request,
  } = await supabaseAdmin
    .from(
      "restriction_review_requests"
    )
    .select(`
      id,
      status
    `)
    .eq(
      "id",
      requestId
    )
    .maybeSingle();

  if (!request) {
    returnToReview(
      requestId,
      "request_missing"
    );
  }

  if (
    request.status !==
    "submitted"
  ) {
    returnToReview(
      requestId,
      "already_started"
    );
  }

  const {
    error,
  } = await supabaseAdmin
    .from(
      "restriction_review_requests"
    )
    .update({
      status:
        "under_review",

      reviewed_by:
        admin.userId,

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      requestId
    )
    .eq(
      "status",
      "submitted"
    );

  if (error) {
    console.error(
      "START_RESTRICTION_REVIEW_FAILED",
      error
    );

    returnToReview(
      requestId,
      "start_failed"
    );
  }

  returnToReview(
    requestId,
    "review_started"
  );
}
