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

// =========================================================
// HELPERS
// =========================================================

function cleanFormValue(
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

function returnToCase(
  reportId: string,
  result: string
): never {
  revalidatePath("/admin");

  revalidatePath(
    "/admin/trust-safety"
  );

  revalidatePath(
    `/admin/trust-safety/${reportId}`
  );

  revalidatePath(
    "/admin/collections"
  );

  revalidatePath(
    "/admin/users"
  );

  redirect(
    `/admin/trust-safety/${reportId}?result=${encodeURIComponent(
      result
    )}`
  );
}

// =========================================================
// START TRUST & SAFETY REVIEW
// =========================================================

export async function startTrustSafetyReview(
  formData: FormData
) {
  const admin =
    await requirePlatformAdmin();

  const reportId =
    cleanFormValue(
      formData,
      "report_id"
    );

  const priority =
    cleanFormValue(
      formData,
      "priority"
    );

  const reason =
    cleanFormValue(
      formData,
      "reason"
    );

  if (
    !canInvestigate(
      admin.role
    )
  ) {
    returnToCase(
      reportId,
      "review_failed"
    );
  }

  if (
    reason.length <
    10
  ) {
    returnToCase(
      reportId,
      "reason_required"
    );
  }

  const allowedPriorities = [
    "low",
    "normal",
    "high",
    "urgent",
  ];

  if (
    !allowedPriorities.includes(
      priority
    )
  ) {
    returnToCase(
      reportId,
      "invalid_priority"
    );
  }

  // =======================================================
  // LIFECYCLE GUARD
  // =======================================================

  const {
    data: reviewCase,
    error: reviewCaseError,
  } = await supabaseAdmin
    .from(
      "trust_safety_reports"
    )
    .select(`
      id,
      status
    `)
    .eq(
      "id",
      reportId
    )
    .maybeSingle();

  if (
    reviewCaseError ||
    !reviewCase
  ) {
    console.error(
      "Start review case lookup failed:",
      reviewCaseError
    );

    returnToCase(
      reportId,
      "review_failed"
    );
  }

  if (
    reviewCase.status !==
    "open"
  ) {
    returnToCase(
      reportId,
      "not_open"
    );
  }

  const {
    error,
  } = await supabaseAdmin.rpc(
    "admin_start_trust_safety_review",
    {
      p_admin_user_id:
        admin.userId,

      p_report_id:
        reportId,

      p_priority:
        priority,

      p_reason:
        reason,
    }
  );

  if (error) {
    const message =
      error.message
        ?.toLowerCase() ??
      "";

    if (
      message.includes(
        "only open"
      )
    ) {
      returnToCase(
        reportId,
        "not_open"
      );
    }

    console.error(
      "Start Trust & Safety review failed:",
      error
    );

    returnToCase(
      reportId,
      "review_failed"
    );
  }

  returnToCase(
    reportId,
    "review_started"
  );
}

// =========================================================
// TRIAGE TRUST & SAFETY CASE
// =========================================================

export async function triageTrustSafetyCase(
  formData: FormData
) {
  const admin =
    await requirePlatformAdmin();

  const reportId =
    cleanFormValue(
      formData,
      "report_id"
    );

  const reason =
    cleanFormValue(
      formData,
      "reason"
    );

  const newStatus =
    cleanFormValue(
      formData,
      "new_status"
    ) ||
    cleanFormValue(
      formData,
      "status"
    );

  if (
    !canInvestigate(
      admin.role
    )
  ) {
    returnToCase(
      reportId,
      "triage_failed"
    );
  }

  if (
    reason.length <
    10
  ) {
    returnToCase(
      reportId,
      "triage_reason_required"
    );
  }

  const allowedStatuses = [
    "action_required",
    "resolved",
    "dismissed",
  ];

  if (
    !allowedStatuses.includes(
      newStatus
    )
  ) {
    returnToCase(
      reportId,
      "invalid_triage_status"
    );
  }

  // =======================================================
  // LIFECYCLE GUARD
  // =======================================================

  const {
    data: triageCaseRecord,
    error: triageCaseError,
  } = await supabaseAdmin
    .from(
      "trust_safety_reports"
    )
    .select(`
      id,
      status
    `)
    .eq(
      "id",
      reportId
    )
    .maybeSingle();

  if (
    triageCaseError ||
    !triageCaseRecord
  ) {
    console.error(
      "Triage case lookup failed:",
      triageCaseError
    );

    returnToCase(
      reportId,
      "triage_failed"
    );
  }

  if (
    triageCaseRecord.status !==
    "under_review"
  ) {
    returnToCase(
      reportId,
      "not_under_review"
    );
  }

  const {
    error,
  } = await supabaseAdmin.rpc(
    "admin_triage_trust_safety_case",
    {
      p_admin_user_id:
        admin.userId,

      p_report_id:
        reportId,

      p_new_status:
        newStatus,

      p_reason:
        reason,
    }
  );

  if (error) {
    const message =
      error.message
        ?.toLowerCase() ??
      "";

    if (
      message.includes(
        "under review"
      )
    ) {
      returnToCase(
        reportId,
        "not_under_review"
      );
    }

    console.error(
      "Triage Trust & Safety case failed:",
      error
    );

    returnToCase(
      reportId,
      "triage_failed"
    );
  }

  returnToCase(
    reportId,
    newStatus
  );
}

// =========================================================
// RESTRICT COLLECTION
// =========================================================

export async function restrictCollection(
  formData: FormData
) {
  const admin =
    await requirePlatformAdmin();

  const reportId =
    cleanFormValue(
      formData,
      "report_id"
    );

  const collectionId =
    cleanFormValue(
      formData,
      "collection_id"
    );

  const restrictionType =
    cleanFormValue(
      formData,
      "restriction_type"
    );

  const reason =
    cleanFormValue(
      formData,
      "reason"
    );

  // =======================================================
  // ADMIN AUTHORIZATION
  // =======================================================

  if (
    !canInvestigate(
      admin.role
    )
  ) {
    returnToCase(
      reportId,
      "restriction_failed"
    );
  }

  // =======================================================
  // COLLECTION
  // =======================================================

  if (!collectionId) {
    returnToCase(
      reportId,
      "restriction_collection_missing"
    );
  }

  // =======================================================
  // REASON
  // =======================================================

  if (
    reason.length <
    10
  ) {
    returnToCase(
      reportId,
      "restriction_reason_required"
    );
  }

  // =======================================================
  // RESTRICTION TYPE
  // =======================================================

  const allowedRestrictionTypes =
    [
      "join_block",
      "organizer_changes_block",
      "full_collection",
    ];

  if (
    !allowedRestrictionTypes.includes(
      restrictionType
    )
  ) {
    returnToCase(
      reportId,
      "invalid_restriction_type"
    );
  }

  // =======================================================
  // VERIFY CASE/COLLECTION RELATIONSHIP
  // =======================================================

  const {
    data: report,
    error: reportError,
  } = await supabaseAdmin
    .from(
      "trust_safety_reports"
    )
    .select(`
      id,
      collection_id,
      status
    `)
    .eq(
      "id",
      reportId
    )
    .maybeSingle();

  if (
    reportError ||
    !report
  ) {
    console.error(
      "Restriction report lookup failed:",
      reportError
    );

    returnToCase(
      reportId,
      "restriction_failed"
    );
  }

  if (
    report.collection_id !==
    collectionId
  ) {
    returnToCase(
      reportId,
      "restriction_not_authorized_by_case"
    );
  }

  if (
    report.status !==
    "action_required"
  ) {
    returnToCase(
      reportId,
      "restriction_not_authorized_by_case"
    );
  }

  // =======================================================
  // APPLY RESTRICTION
  // =======================================================

  const {
    error,
  } = await supabaseAdmin.rpc(
    "admin_restrict_collection",
    {
      p_admin_user_id:
        admin.userId,

      p_report_id:
        reportId,

      p_collection_id:
        collectionId,

      p_restriction_type:
        restrictionType,

      p_reason:
        reason,
    }
  );

  if (error) {
    const message =
      error.message
        ?.toLowerCase() ??
      "";

    if (
      message.includes(
        "already has an active"
      )
    ) {
      returnToCase(
        reportId,
        "restriction_exists"
      );
    }

    if (
      message.includes(
        "action required"
      ) ||
      message.includes(
        "does not belong"
      )
    ) {
      returnToCase(
        reportId,
        "restriction_not_authorized_by_case"
      );
    }

    console.error(
      "Restrict Collection failed:",
      error
    );

    returnToCase(
      reportId,
      "restriction_failed"
    );
  }

  returnToCase(
    reportId,
    "collection_restricted"
  );
}

// =========================================================
// LIFT COLLECTION RESTRICTION
// =========================================================

export async function liftCollectionRestriction(
  formData: FormData
) {
  const admin =
    await requirePlatformAdmin();

  const reportId =
    cleanFormValue(
      formData,
      "report_id"
    );

  const collectionId =
    cleanFormValue(
      formData,
      "collection_id"
    );

  const reason =
    cleanFormValue(
      formData,
      "reason"
    );

  // =======================================================
  // ADMIN AUTHORIZATION
  // =======================================================

  if (
    !canInvestigate(
      admin.role
    )
  ) {
    returnToCase(
      reportId,
      "restriction_lift_failed"
    );
  }

  // =======================================================
  // COLLECTION
  // =======================================================

  if (!collectionId) {
    returnToCase(
      reportId,
      "restriction_collection_missing"
    );
  }

  // =======================================================
  // REASON
  // =======================================================

  if (
    reason.length <
    10
  ) {
    returnToCase(
      reportId,
      "lift_reason_required"
    );
  }

  // =======================================================
  // VERIFY TRUST & SAFETY CASE
  // =======================================================

  const {
    data: report,
    error: reportError,
  } = await supabaseAdmin
    .from(
      "trust_safety_reports"
    )
    .select(`
      id,
      collection_id,
      status
    `)
    .eq(
      "id",
      reportId
    )
    .maybeSingle();

  if (
    reportError ||
    !report
  ) {
    console.error(
      "Lift restriction report lookup failed:",
      reportError
    );

    returnToCase(
      reportId,
      "restriction_lift_failed"
    );
  }

  if (
    report.collection_id !==
    collectionId
  ) {
    returnToCase(
      reportId,
      "restriction_collection_missing"
    );
  }

  if (
    report.status !==
    "action_required"
  ) {
    returnToCase(
      reportId,
      "restriction_lift_failed"
    );
  }

  // =======================================================
  // VERIFY ACTIVE RESTRICTION
  // =======================================================

  const {
    data: activeRestriction,
    error:
      activeRestrictionError,
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
      lifted_at
    `)
    .eq(
      "collection_id",
      collectionId
    )
    .eq(
      "trust_safety_report_id",
      reportId
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

  if (
    activeRestrictionError
  ) {
    console.error(
      "Active restriction lookup failed:",
      activeRestrictionError
    );

    returnToCase(
      reportId,
      "restriction_lift_failed"
    );
  }

  if (
    !activeRestriction
  ) {
    returnToCase(
      reportId,
      "restriction_not_found"
    );
  }

  // =======================================================
  // LIFT RESTRICTION
  // =======================================================

  const {
    error,
  } = await supabaseAdmin.rpc(
    "admin_lift_collection_restriction",
    {
      p_admin_user_id:
        admin.userId,

      p_report_id:
        reportId,

      p_collection_id:
        collectionId,

      p_reason:
        reason,
    }
  );

  if (error) {
    console.error(
      "Lift Collection restriction failed:",
      error
    );

    returnToCase(
      reportId,
      "restriction_lift_failed"
    );
  }

  returnToCase(
    reportId,
    "restriction_lifted"
  );
}

// =========================================================
// RESTRICT USER
// =========================================================

export async function restrictUser(
  formData: FormData
) {
  const admin =
    await requirePlatformAdmin();

  const reportId =
    cleanFormValue(
      formData,
      "report_id"
    );

  const userId =
    cleanFormValue(
      formData,
      "user_id"
    );

  const restrictionType =
    cleanFormValue(
      formData,
      "restriction_type"
    );

  const reason =
    cleanFormValue(
      formData,
      "reason"
    );

  if (
    !canInvestigate(
      admin.role
    )
  ) {
    returnToCase(
      reportId,
      "user_restriction_failed"
    );
  }

  if (!userId) {
    returnToCase(
      reportId,
      "user_restriction_subject_missing"
    );
  }

  if (
    reason.length <
    10
  ) {
    returnToCase(
      reportId,
      "user_restriction_reason_required"
    );
  }

  const allowedRestrictionTypes =
    [
      "participation_block",
      "organizer_block",
      "full_platform",
    ];

  if (
    !allowedRestrictionTypes.includes(
      restrictionType
    )
  ) {
    returnToCase(
      reportId,
      "invalid_user_restriction_type"
    );
  }

  const {
    data: report,
    error: reportError,
  } = await supabaseAdmin
    .from(
      "trust_safety_reports"
    )
    .select(`
      id,
      status,
      subject_type,
      subject_id
    `)
    .eq(
      "id",
      reportId
    )
    .maybeSingle();

  if (
    reportError ||
    !report
  ) {
    console.error(
      "User restriction report lookup failed:",
      reportError
    );

    returnToCase(
      reportId,
      "user_restriction_failed"
    );
  }

  if (
    report.status !==
      "action_required" ||
    report.subject_type !==
      "user" ||
    report.subject_id !==
      userId
  ) {
    returnToCase(
      reportId,
      "user_restriction_not_authorized_by_case"
    );
  }

  const {
    error,
  } = await supabaseAdmin.rpc(
    "admin_restrict_user",
    {
      p_admin_user_id:
        admin.userId,

      p_report_id:
        reportId,

      p_user_id:
        userId,

      p_restriction_type:
        restrictionType,

      p_reason:
        reason,
    }
  );

  if (error) {
    const message =
      error.message
        ?.toLowerCase() ??
      "";

    if (
      message.includes(
        "already_restricted"
      ) ||
      message.includes(
        "already restricted"
      )
    ) {
      returnToCase(
        reportId,
        "user_restriction_exists"
      );
    }

    if (
      message.includes(
        "case_not_action_required"
      ) ||
      message.includes(
        "case_subject"
      ) ||
      message.includes(
        "mismatch"
      )
    ) {
      returnToCase(
        reportId,
        "user_restriction_not_authorized_by_case"
      );
    }

    console.error(
      "Restrict User failed:",
      error
    );

    returnToCase(
      reportId,
      "user_restriction_failed"
    );
  }

  returnToCase(
    reportId,
    "user_restricted"
  );
}

// =========================================================
// LIFT USER RESTRICTION
// =========================================================

export async function liftUserRestriction(
  formData: FormData
) {
  const admin =
    await requirePlatformAdmin();

  const reportId =
    cleanFormValue(
      formData,
      "report_id"
    );

  const userId =
    cleanFormValue(
      formData,
      "user_id"
    );

  const reason =
    cleanFormValue(
      formData,
      "reason"
    );

  if (
    !canInvestigate(
      admin.role
    )
  ) {
    returnToCase(
      reportId,
      "user_restriction_lift_failed"
    );
  }

  if (!userId) {
    returnToCase(
      reportId,
      "user_restriction_subject_missing"
    );
  }

  if (
    reason.length <
    10
  ) {
    returnToCase(
      reportId,
      "user_lift_reason_required"
    );
  }

  const {
    data: report,
    error: reportError,
  } = await supabaseAdmin
    .from(
      "trust_safety_reports"
    )
    .select(`
      id,
      status,
      subject_type,
      subject_id
    `)
    .eq(
      "id",
      reportId
    )
    .maybeSingle();

  if (
    reportError ||
    !report
  ) {
    console.error(
      "Lift User restriction report lookup failed:",
      reportError
    );

    returnToCase(
      reportId,
      "user_restriction_lift_failed"
    );
  }

  if (
    report.status !==
      "action_required" ||
    report.subject_type !==
      "user" ||
    report.subject_id !==
      userId
  ) {
    returnToCase(
      reportId,
      "user_restriction_not_authorized_by_case"
    );
  }

  const {
    error,
  } = await supabaseAdmin.rpc(
    "admin_lift_user_restriction",
    {
      p_admin_user_id:
        admin.userId,

      p_report_id:
        reportId,

      p_user_id:
        userId,

      p_reason:
        reason,
    }
  );

  if (error) {
    const message =
      error.message
        ?.toLowerCase() ??
      "";

    if (
      message.includes(
        "not_found"
      ) ||
      message.includes(
        "not found"
      )
    ) {
      returnToCase(
        reportId,
        "user_restriction_not_found"
      );
    }

    console.error(
      "Lift User restriction failed:",
      error
    );

    returnToCase(
      reportId,
      "user_restriction_lift_failed"
    );
  }

  returnToCase(
    reportId,
    "user_restriction_lifted"
  );
}

// =========================================================
// RESTRICT ORGANIZATION
// =========================================================

export async function restrictOrganization(
  formData: FormData
) {
  const admin =
    await requirePlatformAdmin();

  const reportId =
    cleanFormValue(
      formData,
      "report_id"
    );

  const organizationId =
    cleanFormValue(
      formData,
      "organization_id"
    );

  const restrictionType =
    cleanFormValue(
      formData,
      "restriction_type"
    );

  const reason =
    cleanFormValue(
      formData,
      "reason"
    );

  if (
    !canInvestigate(
      admin.role
    )
  ) {
    returnToCase(
      reportId,
      "organization_restriction_failed"
    );
  }

  if (!organizationId) {
    returnToCase(
      reportId,
      "organization_restriction_subject_missing"
    );
  }

  if (
    reason.length <
    10
  ) {
    returnToCase(
      reportId,
      "organization_restriction_reason_required"
    );
  }

  const allowedRestrictionTypes =
    [
      "new_collection_block",
      "organizer_changes_block",
      "full_organization",
    ];

  if (
    !allowedRestrictionTypes.includes(
      restrictionType
    )
  ) {
    returnToCase(
      reportId,
      "invalid_organization_restriction_type"
    );
  }

  const {
    data: report,
    error: reportError,
  } = await supabaseAdmin
    .from(
      "trust_safety_reports"
    )
    .select(`
      id,
      status,
      subject_type,
      subject_id
    `)
    .eq(
      "id",
      reportId
    )
    .maybeSingle();

  if (
    reportError ||
    !report
  ) {
    console.error(
      "Organization restriction report lookup failed:",
      reportError
    );

    returnToCase(
      reportId,
      "organization_restriction_failed"
    );
  }

  if (
    report.status !==
      "action_required" ||
    report.subject_type !==
      "organization" ||
    report.subject_id !==
      organizationId
  ) {
    returnToCase(
      reportId,
      "organization_restriction_not_authorized_by_case"
    );
  }

  const {
    error,
  } = await supabaseAdmin.rpc(
    "admin_restrict_organization",
    {
      p_admin_user_id:
        admin.userId,

      p_report_id:
        reportId,

      p_organization_id:
        organizationId,

      p_restriction_type:
        restrictionType,

      p_reason:
        reason,
    }
  );

  if (error) {
    const message =
      error.message
        ?.toLowerCase() ??
      "";

    if (
      message.includes(
        "already_restricted"
      ) ||
      message.includes(
        "already restricted"
      )
    ) {
      returnToCase(
        reportId,
        "organization_restriction_exists"
      );
    }

    if (
      message.includes(
        "case_not_action_required"
      ) ||
      message.includes(
        "case_subject"
      ) ||
      message.includes(
        "mismatch"
      )
    ) {
      returnToCase(
        reportId,
        "organization_restriction_not_authorized_by_case"
      );
    }

    console.error(
      "Restrict Organization failed:",
      error
    );

    returnToCase(
      reportId,
      "organization_restriction_failed"
    );
  }

  returnToCase(
    reportId,
    "organization_restricted"
  );
}

// =========================================================
// LIFT ORGANIZATION RESTRICTION
// =========================================================

export async function liftOrganizationRestriction(
  formData: FormData
) {
  const admin =
    await requirePlatformAdmin();

  const reportId =
    cleanFormValue(
      formData,
      "report_id"
    );

  const organizationId =
    cleanFormValue(
      formData,
      "organization_id"
    );

  const reason =
    cleanFormValue(
      formData,
      "reason"
    );

  if (
    !canInvestigate(
      admin.role
    )
  ) {
    returnToCase(
      reportId,
      "organization_restriction_lift_failed"
    );
  }

  if (!organizationId) {
    returnToCase(
      reportId,
      "organization_restriction_subject_missing"
    );
  }

  if (
    reason.length <
    10
  ) {
    returnToCase(
      reportId,
      "organization_lift_reason_required"
    );
  }

  const {
    data: report,
    error: reportError,
  } = await supabaseAdmin
    .from(
      "trust_safety_reports"
    )
    .select(`
      id,
      status,
      subject_type,
      subject_id
    `)
    .eq(
      "id",
      reportId
    )
    .maybeSingle();

  if (
    reportError ||
    !report
  ) {
    console.error(
      "Lift Organization restriction report lookup failed:",
      reportError
    );

    returnToCase(
      reportId,
      "organization_restriction_lift_failed"
    );
  }

  if (
    report.status !==
      "action_required" ||
    report.subject_type !==
      "organization" ||
    report.subject_id !==
      organizationId
  ) {
    returnToCase(
      reportId,
      "organization_restriction_not_authorized_by_case"
    );
  }

  const {
    error,
  } = await supabaseAdmin.rpc(
    "admin_lift_organization_restriction",
    {
      p_admin_user_id:
        admin.userId,

      p_report_id:
        reportId,

      p_organization_id:
        organizationId,

      p_reason:
        reason,
    }
  );

  if (error) {
    const message =
      error.message
        ?.toLowerCase() ??
      "";

    if (
      message.includes(
        "not_found"
      ) ||
      message.includes(
        "not found"
      )
    ) {
      returnToCase(
        reportId,
        "organization_restriction_not_found"
      );
    }

    console.error(
      "Lift Organization restriction failed:",
      error
    );

    returnToCase(
      reportId,
      "organization_restriction_lift_failed"
    );
  }

  returnToCase(
    reportId,
    "organization_restriction_lifted"
  );
}

// =========================================================
// RESOLVE ACTION REQUIRED TRUST & SAFETY CASE
// =========================================================

export async function resolveTrustSafetyCase(
  formData: FormData
) {
  const admin =
    await requirePlatformAdmin();

  const reportId =
    cleanFormValue(
      formData,
      "report_id"
    );

  const resolutionNotes =
    cleanFormValue(
      formData,
      "resolution_notes"
    );

  // =======================================================
  // ADMIN AUTHORIZATION
  // =======================================================

  if (
    !canInvestigate(
      admin.role
    )
  ) {
    returnToCase(
      reportId,
      "resolution_failed"
    );
  }

  // =======================================================
  // RESOLUTION NOTES
  // =======================================================

  if (
    resolutionNotes.length <
    10
  ) {
    returnToCase(
      reportId,
      "resolution_notes_required"
    );
  }

  // =======================================================
  // VERIFY CASE
  // =======================================================

  const {
    data: report,
    error: reportError,
  } = await supabaseAdmin
    .from(
      "trust_safety_reports"
    )
    .select(`
      id,
      status,
      subject_type,
      subject_id,
      collection_id
    `)
    .eq(
      "id",
      reportId
    )
    .maybeSingle();

  if (
    reportError ||
    !report
  ) {
    console.error(
      "Resolve Trust & Safety case lookup failed:",
      reportError
    );

    returnToCase(
      reportId,
      "resolution_failed"
    );
  }

  if (
    report.status !==
    "action_required"
  ) {
    returnToCase(
      reportId,
      "resolution_not_allowed"
    );
  }

  // =======================================================
  // ACTIVE COLLECTION RESTRICTION CHECK
  //
  // A case cannot be closed while an enforcement control
  // created from that case is still active.
  // =======================================================

  if (
    report.collection_id
  ) {
    const {
      data: activeRestriction,
      error:
        activeRestrictionError,
    } = await supabaseAdmin
      .from(
        "collection_restrictions"
      )
      .select(`
        id
      `)
      .eq(
        "collection_id",
        report.collection_id
      )
      .is(
        "lifted_at",
        null
      )
      .limit(1)
      .maybeSingle();

    if (
      activeRestrictionError
    ) {
      console.error(
        "Resolve case active restriction lookup failed:",
        activeRestrictionError
      );

      returnToCase(
        reportId,
        "resolution_failed"
      );
    }

    if (
      activeRestriction
    ) {
      returnToCase(
        reportId,
        "active_restriction_remaining"
      );
    }
  }

  // =======================================================
  // ACTIVE USER RESTRICTION CHECK
  // =======================================================

  if (
    report.subject_type ===
      "user"
  ) {
    const {
      data:
        activeUserRestriction,
      error:
        activeUserRestrictionError,
    } = await supabaseAdmin
      .from(
        "user_restrictions"
      )
      .select(`
        id
      `)
      .eq(
        "user_id",
        report.subject_id
      )
      .eq(
        "trust_safety_report_id",
        reportId
      )
      .is(
        "lifted_at",
        null
      )
      .limit(1)
      .maybeSingle();

    if (
      activeUserRestrictionError
    ) {
      console.error(
        "Resolve case active user restriction lookup failed:",
        activeUserRestrictionError
      );

      returnToCase(
        reportId,
        "resolution_failed"
      );
    }

    if (
      activeUserRestriction
    ) {
      returnToCase(
        reportId,
        "active_restriction_remaining"
      );
    }
  }

  // =======================================================
  // ACTIVE ORGANIZATION RESTRICTION CHECK
  // =======================================================

  if (
    report.subject_type ===
      "organization"
  ) {
    const {
      data:
        activeOrganizationRestriction,
      error:
        activeOrganizationRestrictionError,
    } = await supabaseAdmin
      .from(
        "organization_restrictions"
      )
      .select(`
        id
      `)
      .eq(
        "organization_id",
        report.subject_id
      )
      .eq(
        "trust_safety_report_id",
        reportId
      )
      .is(
        "lifted_at",
        null
      )
      .limit(1)
      .maybeSingle();

    if (
      activeOrganizationRestrictionError
    ) {
      console.error(
        "Resolve case active organization restriction lookup failed:",
        activeOrganizationRestrictionError
      );

      returnToCase(
        reportId,
        "resolution_failed"
      );
    }

    if (
      activeOrganizationRestriction
    ) {
      returnToCase(
        reportId,
        "active_restriction_remaining"
      );
    }
  }

  // =======================================================
  // RESOLVE CASE
  //
  // The database RPC performs the case update and audit
  // insert atomically so the case cannot be marked resolved
  // without its permanent administrative audit record.
  // =======================================================

  const {
    error,
  } = await supabaseAdmin.rpc(
    "admin_resolve_trust_safety_case",
    {
      p_admin_user_id:
        admin.userId,

      p_report_id:
        reportId,

      p_resolution_notes:
        resolutionNotes,
    }
  );

  if (error) {
    const message =
      error.message
        ?.toLowerCase() ??
      "";

    if (
      message.includes(
        "action required"
      ) ||
      message.includes(
        "cannot be resolved"
      )
    ) {
      returnToCase(
        reportId,
        "resolution_not_allowed"
      );
    }

    if (
      message.includes(
        "active restriction"
      )
    ) {
      returnToCase(
        reportId,
        "active_restriction_remaining"
      );
    }

    console.error(
      "Resolve Trust & Safety case failed:",
      error
    );

    returnToCase(
      reportId,
      "resolution_failed"
    );
  }

  returnToCase(
    reportId,
    "case_resolved"
  );
}

// =========================================================
// COMPATIBILITY EXPORTS
// =========================================================

export async function startReview(
  formData: FormData
) {
  return startTrustSafetyReview(
    formData
  );
}

export async function startReviewAction(
  formData: FormData
) {
  return startTrustSafetyReview(
    formData
  );
}

export async function beginReview(
  formData: FormData
) {
  return startTrustSafetyReview(
    formData
  );
}

export async function triageCase(
  formData: FormData
) {
  return triageTrustSafetyCase(
    formData
  );
}

export async function triageCaseAction(
  formData: FormData
) {
  return triageTrustSafetyCase(
    formData
  );
}

export async function triageReport(
  formData: FormData
) {
  return triageTrustSafetyCase(
    formData
  );
}