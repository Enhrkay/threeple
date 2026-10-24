import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import {
  requirePlatformAdmin,
} from "@/lib/admin/server";

import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

import ReviewControls from "./review-controls";
import TriageControls from "./triage-controls";
import RestrictionSection from "./restriction-section";
import UserRestrictionSection from "./user-restriction-section";
import OrganizationRestrictionSection from "./organization-restriction-section";
import ResolutionControls from "./resolution-controls";

export const instant = false;

type PageProps = {
  params: Promise<{
    reportId: string;
  }>;

  searchParams: Promise<{
    result?: string;
  }>;
};

// =========================================================
// HELPERS
// =========================================================

function friendlyText(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "—";
  }

  return value
    .replaceAll("_", " ")
    .replaceAll(".", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

function formatDateTime(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-NG",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone:
        "Africa/Lagos",
    }
  ).format(
    new Date(value)
  );
}

function statusStyle(
  status: string
) {
  switch (status) {
    case "open":
      return "bg-blue-100 text-blue-700";

    case "under_review":
      return "bg-amber-100 text-amber-700";

    case "action_required":
      return "bg-red-100 text-red-700";

    case "resolved":
      return "bg-green-100 text-green-700";

    case "dismissed":
      return "bg-neutral-200 text-neutral-600";

    default:
      return "bg-neutral-100 text-neutral-600";
  }
}

function priorityStyle(
  priority: string
) {
  switch (priority) {
    case "urgent":
      return "bg-red-700 text-white";

    case "high":
      return "bg-red-100 text-red-700";

    case "normal":
      return "bg-blue-100 text-blue-700";

    case "low":
      return "bg-neutral-100 text-neutral-600";

    default:
      return "bg-neutral-100 text-neutral-600";
  }
}

function resultMessage(
  result:
    | string
    | undefined
) {
  switch (result) {
    // =====================================================
    // START REVIEW
    // =====================================================

    case "review_started":
      return {
        type: "success",
        text:
          "Review started successfully. The case is now assigned to you and marked Under Review.",
      };

    case "reason_required":
      return {
        type: "error",
        text:
          "Enter a reason of at least 10 characters before starting the review.",
      };

    case "invalid_priority":
      return {
        type: "error",
        text:
          "Select a valid Trust & Safety priority.",
      };

    case "not_open":
      return {
        type: "info",
        text:
          "This case is no longer Open and cannot start another review.",
      };

    case "review_failed":
      return {
        type: "error",
        text:
          "Threeple could not start the review.",
      };

    // =====================================================
    // TRIAGE
    // =====================================================

    case "action_required":
      return {
        type: "success",
        text:
          "Investigation completed. This case is now marked Action Required.",
      };

    case "resolved":
      return {
        type: "success",
        text:
          "The Trust & Safety case has been resolved.",
      };

    case "dismissed":
      return {
        type: "success",
        text:
          "The Trust & Safety case has been dismissed.",
      };

    case "triage_reason_required":
      return {
        type: "error",
        text:
          "Enter investigation notes of at least 10 characters.",
      };

    case "invalid_triage_status":
      return {
        type: "error",
        text:
          "Select a valid investigation outcome.",
      };

    case "not_under_review":
      return {
        type: "info",
        text:
          "This case is no longer Under Review and cannot be triaged from this stage.",
      };

    case "triage_failed":
      return {
        type: "error",
        text:
          "Threeple could not record the investigation outcome.",
      };

    // =====================================================
    // APPLY RESTRICTION
    // =====================================================

    case "collection_restricted":
      return {
        type: "success",
        text:
          "The Collection restriction has been applied successfully. The administrative action has been recorded in the audit history.",
      };

    case "restriction_reason_required":
      return {
        type: "error",
        text:
          "Enter a restriction reason of at least 10 characters.",
      };

    case "invalid_restriction_type":
      return {
        type: "error",
        text:
          "Select a valid Collection restriction type.",
      };

    case "restriction_exists":
      return {
        type: "info",
        text:
          "This Collection already has an active platform restriction.",
      };

    case "restriction_not_authorized_by_case":
      return {
        type: "error",
        text:
          "This Trust & Safety case cannot authorize a restriction on the specified Collection.",
      };

    case "restriction_failed":
      return {
        type: "error",
        text:
          "Threeple could not apply the Collection restriction.",
      };

    // =====================================================
    // LIFT RESTRICTION
    // =====================================================

    case "restriction_lifted":
      return {
        type: "success",
        text:
          "The Collection restriction has been lifted successfully. The administrative action has been recorded in the audit history.",
      };

    case "lift_reason_required":
      return {
        type: "error",
        text:
          "Enter a reason of at least 10 characters before lifting the restriction.",
      };

    case "restriction_collection_missing":
      return {
        type: "error",
        text:
          "The Trust & Safety case is not linked to a valid Collection.",
      };

    case "restriction_not_found":
      return {
        type: "info",
        text:
          "There is no active Collection restriction to lift.",
      };

    case "restriction_lift_failed":
      return {
        type: "error",
        text:
          "Threeple could not lift the Collection restriction.",
      };

    // =====================================================
    // USER RESTRICTIONS
    // =====================================================

    case "user_restricted":
      return {
        type: "success",
        text:
          "The user restriction has been applied successfully and recorded in the administrative audit history.",
      };

    case "user_restriction_lifted":
      return {
        type: "success",
        text:
          "The user restriction has been lifted successfully and recorded in the administrative audit history.",
      };

    case "user_restriction_reason_required":
    case "user_lift_reason_required":
      return {
        type: "error",
        text:
          "Enter a reason of at least 10 characters.",
      };

    case "invalid_user_restriction_type":
      return {
        type: "error",
        text:
          "Select a valid user restriction type.",
      };

    case "user_restriction_exists":
      return {
        type: "info",
        text:
          "This user already has an active platform restriction.",
      };

    case "user_restriction_not_found":
      return {
        type: "info",
        text:
          "There is no active user restriction to lift.",
      };

    case "user_restriction_not_authorized_by_case":
    case "user_restriction_subject_missing":
    case "user_restriction_failed":
    case "user_restriction_lift_failed":
      return {
        type: "error",
        text:
          "Threeple could not complete the user enforcement action.",
      };

    // =====================================================
    // ORGANIZATION RESTRICTIONS
    // =====================================================

    case "organization_restricted":
      return {
        type: "success",
        text:
          "The organization restriction has been applied successfully and recorded in the administrative audit history.",
      };

    case "organization_restriction_lifted":
      return {
        type: "success",
        text:
          "The organization restriction has been lifted successfully and recorded in the administrative audit history.",
      };

    case "organization_restriction_reason_required":
    case "organization_lift_reason_required":
      return {
        type: "error",
        text:
          "Enter a reason of at least 10 characters.",
      };

    case "invalid_organization_restriction_type":
      return {
        type: "error",
        text:
          "Select a valid organization restriction type.",
      };

    case "organization_restriction_exists":
      return {
        type: "info",
        text:
          "This organization already has an active platform restriction.",
      };

    case "organization_restriction_not_found":
      return {
        type: "info",
        text:
          "There is no active organization restriction to lift.",
      };

    case "organization_restriction_not_authorized_by_case":
    case "organization_restriction_subject_missing":
    case "organization_restriction_failed":
    case "organization_restriction_lift_failed":
      return {
        type: "error",
        text:
          "Threeple could not complete the organization enforcement action.",
      };

    // =====================================================
    // RESOLVE CASE
    // =====================================================

    case "case_resolved":
      return {
        type: "success",
        text:
          "The Trust & Safety case has been resolved successfully. The final decision has been permanently recorded in the administrative audit history.",
      };

    case "resolution_notes_required":
      return {
        type: "error",
        text:
          "Enter final resolution notes of at least 10 characters.",
      };

    case "resolution_not_allowed":
      return {
        type: "info",
        text:
          "This case is no longer eligible for resolution from the Action Required stage.",
      };

    case "active_restriction_remaining":
      return {
        type: "error",
        text:
          "Lift the active Collection restriction before resolving this Trust & Safety case.",
      };

    case "resolution_failed":
      return {
        type: "error",
        text:
          "Threeple could not resolve this Trust & Safety case.",
      };

    default:
      return null;
  }
}

function resultStyle(
  type: string
) {
  switch (type) {
    case "success":
      return "border-green-200 bg-green-50 text-green-800";

    case "error":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-blue-200 bg-blue-50 text-blue-700";
  }
}

// =========================================================
// PAGE
// =========================================================

export default async function TrustSafetyCasePage({
  params,
  searchParams,
}: PageProps) {
  const {
    reportId,
  } = await params;

  const query =
    await searchParams;

  const admin =
    await requirePlatformAdmin();

  // =======================================================
  // REPORT
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
      report_reference,
      reporter_user_id,
      reporter_name,
      reporter_email,
      subject_type,
      subject_id,
      collection_id,
      category,
      priority,
      status,
      description,
      assigned_admin_id,
      resolution_notes,
      resolved_by,
      resolved_at,
      metadata,
      created_at,
      updated_at
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
    notFound();
  }

  const message =
    resultMessage(
      query.result
    );

  // =======================================================
  // REPORTER
  // =======================================================

  let reporterProfile:
    | {
        full_name:
          | string
          | null;

        phone:
          | string
          | null;
      }
    | null = null;

  if (
    report.reporter_user_id
  ) {
    const {
      data,
    } = await supabaseAdmin
      .from("profiles")
      .select(`
        full_name,
        phone
      `)
      .eq(
        "id",
        report.reporter_user_id
      )
      .maybeSingle();

    reporterProfile =
      data ?? null;
  }

  // =======================================================
  // ASSIGNED ADMIN
  // =======================================================

  let assignedAdmin:
    | {
        id: string;
        user_id: string;
        role: string;
        is_active: boolean;
      }
    | null = null;

  let assignedAdminName:
    | string
    | null = null;

  if (
    report.assigned_admin_id
  ) {
    const {
      data,
    } = await supabaseAdmin
      .from("platform_admins")
      .select(`
        id,
        user_id,
        role,
        is_active
      `)
      .eq(
        "id",
        report.assigned_admin_id
      )
      .maybeSingle();

    assignedAdmin =
      data ?? null;

    if (
      assignedAdmin
    ) {
      const {
        data: profile,
      } = await supabaseAdmin
        .from("profiles")
        .select(`
          full_name
        `)
        .eq(
          "id",
          assignedAdmin.user_id
        )
        .maybeSingle();

      assignedAdminName =
        profile?.full_name ??
        null;
    }
  }

  // =======================================================
  // RESOLVED BY
  // =======================================================

  let resolvedByName:
    | string
    | null = null;

  if (
    report.resolved_by
  ) {
    const {
      data,
    } = await supabaseAdmin
      .from("profiles")
      .select(`
        full_name
      `)
      .eq(
        "id",
        report.resolved_by
      )
      .maybeSingle();

    resolvedByName =
      data?.full_name ??
      null;
  }

  // =======================================================
  // LINKED COLLECTION
  // =======================================================

  let collection:
    | {
        id: string;
        organization_id: string;
        created_by: string;
        title: string;
        join_code:
          | string
          | null;
        collection_type: string;
        collection_mode: string;
        status: string;
        archived_at:
          | string
          | null;
        created_at: string;
      }
    | null = null;

  if (
    report.collection_id
  ) {
    const {
      data,
    } = await supabaseAdmin
      .from("collections")
      .select(`
        id,
        organization_id,
        created_by,
        title,
        join_code,
        collection_type,
        collection_mode,
        status,
        archived_at,
        created_at
      `)
      .eq(
        "id",
        report.collection_id
      )
      .maybeSingle();

    collection =
      data ?? null;
  }

  // =======================================================
  // ACTIVE COLLECTION RESTRICTION
  // =======================================================

  let activeRestriction:
    | {
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
      }
    | null = null;

  if (
    collection
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
        collection.id
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
    }

    activeRestriction =
      data ?? null;
  }

  // =======================================================
  // ACTIVE USER RESTRICTION
  // =======================================================

  let activeUserRestriction:
    | {
        id: string;
        restriction_type: string;
        reason: string;
        imposed_by: string;
        imposed_at: string;
      }
    | null = null;

  if (
    report.subject_type ===
      "user"
  ) {
    const {
      data,
      error,
    } = await supabaseAdmin
      .from(
        "user_restrictions"
      )
      .select(`
        id,
        restriction_type,
        reason,
        imposed_by,
        imposed_at
      `)
      .eq(
        "user_id",
        report.subject_id
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
        "Active user restriction lookup failed:",
        error
      );
    }

    activeUserRestriction =
      data ?? null;
  }

  // =======================================================
  // ACTIVE ORGANIZATION RESTRICTION
  // =======================================================

  let activeOrganizationRestriction:
    | {
        id: string;
        restriction_type: string;
        reason: string;
        imposed_by: string;
        imposed_at: string;
      }
    | null = null;

  if (
    report.subject_type ===
      "organization"
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
        restriction_type,
        reason,
        imposed_by,
        imposed_at
      `)
      .eq(
        "organization_id",
        report.subject_id
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
    }

    activeOrganizationRestriction =
      data ?? null;
  }

  // =======================================================
  // COLLECTION ORGANIZATION
  // =======================================================

  let organization:
    | {
        id: string;
        name: string;
        type: string;
      }
    | null = null;

  if (collection) {
    const {
      data,
    } = await supabaseAdmin
      .from("organizations")
      .select(`
        id,
        name,
        type
      `)
      .eq(
        "id",
        collection.organization_id
      )
      .maybeSingle();

    organization =
      data ?? null;
  }

  // =======================================================
  // SUBJECT
  // =======================================================

  let subjectLabel =
    "Unknown Subject";

  let subjectLink:
    | string
    | null = null;

  if (
    report.subject_type ===
      "collection"
  ) {
    subjectLabel =
      collection?.title ??
      "Unknown Collection";

    subjectLink =
      collection
        ? `/admin/collections/${collection.id}`
        : null;
  }

  if (
    report.subject_type ===
      "user"
  ) {
    const {
      data: subjectProfile,
    } = await supabaseAdmin
      .from("profiles")
      .select(`
        full_name
      `)
      .eq(
        "id",
        report.subject_id
      )
      .maybeSingle();

    subjectLabel =
      subjectProfile?.full_name ??
      "Unknown User";

    subjectLink =
      `/admin/users/${report.subject_id}`;
  }

  if (
    report.subject_type ===
      "organization"
  ) {
    const {
      data: subjectOrganization,
    } = await supabaseAdmin
      .from("organizations")
      .select(`
        name
      `)
      .eq(
        "id",
        report.subject_id
      )
      .maybeSingle();

    subjectLabel =
      subjectOrganization?.name ??
      "Unknown Organization";

    subjectLink =
      `/admin/organizations/${report.subject_id}`;
  }

  if (
    report.subject_type ===
      "participant"
  ) {
    const {
      data: subjectParticipant,
    } = await supabaseAdmin
      .from("participants")
      .select(`
        full_name,
        collection_id
      `)
      .eq(
        "id",
        report.subject_id
      )
      .maybeSingle();

    subjectLabel =
      subjectParticipant?.full_name ??
      "Unknown Participant";

    if (
      subjectParticipant
        ?.collection_id
    ) {
      subjectLink =
        `/admin/collections/${subjectParticipant.collection_id}`;
    }
  }

  // =======================================================
  // COLLECTION ACTIVITY
  // =======================================================

  let collectionActivity:
    {
      id: string;

      actor_user_id:
        | string
        | null;

      actor_type: string;

      event_type: string;

      subject_type:
        | string
        | null;

      subject_label:
        | string
        | null;

      description:
        | string
        | null;

      created_at: string;
    }[] = [];

  if (
    report.collection_id
  ) {
    const {
      data,
    } = await supabaseAdmin
      .from(
        "collection_activity_events"
      )
      .select(`
        id,
        actor_user_id,
        actor_type,
        event_type,
        subject_type,
        subject_label,
        description,
        created_at
      `)
      .eq(
        "collection_id",
        report.collection_id
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(15);

    collectionActivity =
      data ?? [];
  }

  // =======================================================
  // ADMIN ACTION HISTORY
  // =======================================================

  const {
    data: adminActions,
  } = await supabaseAdmin
    .from(
      "platform_admin_actions"
    )
    .select(`
      id,
      admin_user_id,
      admin_role,
      action_type,
      subject_type,
      subject_id,
      reason,
      previous_state,
      new_state,
      created_at
    `)
    .eq(
      "trust_safety_report_id",
      report.id
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  const adminActionRows =
    adminActions ?? [];

  const actionAdminUserIds =
    Array.from(
      new Set(
        adminActionRows.map(
          (action) =>
            action.admin_user_id
        )
      )
    );

  let actionAdminProfiles:
    {
      id: string;

      full_name:
        | string
        | null;
    }[] = [];

  if (
    actionAdminUserIds.length >
    0
  ) {
    const {
      data,
    } = await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        full_name
      `)
      .in(
        "id",
        actionAdminUserIds
      );

    actionAdminProfiles =
      data ?? [];
  }

  const actionAdminMap =
    new Map(
      actionAdminProfiles.map(
        (profile) => [
          profile.id,
          profile.full_name,
        ]
      )
    );

  // =======================================================
  // ADMIN PERMISSIONS
  // =======================================================

  const canInvestigate =
    [
      "super_admin",
      "admin",
      "risk_ops",
    ].includes(
      admin.role
    );

  const canStartReview =
    report.status ===
      "open" &&
    canInvestigate;

  const canTriage =
    report.status ===
      "under_review" &&
    canInvestigate;

  // =======================================================
  // UI
  // =======================================================

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">

      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <header className="border-b bg-neutral-950 text-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <Link
            href="/admin"
          >

            <div className="text-2xl font-bold tracking-tight">
              Threeple
            </div>

            <p className="text-xs text-neutral-400">
              Platform Administration
            </p>

          </Link>

          <div className="text-right">

            <p className="text-sm font-medium">
              {admin.fullName}
            </p>

            <p className="mt-0.5 text-xs text-neutral-400">
              {friendlyText(
                admin.role
              )}
            </p>

          </div>

        </div>

      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* ================================================= */}
        {/* BACK */}
        {/* ================================================= */}

        <Link
          href="/admin/trust-safety"
          className="text-sm font-medium text-neutral-500 hover:text-black"
        >
          ← Trust & Safety Cases
        </Link>

        {/* ================================================= */}
        {/* RESULT MESSAGE */}
        {/* ================================================= */}

        {message && (
          <div
            className={`mt-6 rounded-2xl border p-4 text-sm ${resultStyle(
              message.type
            )}`}
          >
            {message.text}
          </div>
        )}

        {/* ================================================= */}
        {/* CASE HEADER */}
        {/* ================================================= */}

        <section className="mt-6">

          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

            <div>

              <div className="flex flex-wrap gap-2">

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(
                    report.status
                  )}`}
                >
                  {friendlyText(
                    report.status
                  )}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityStyle(
                    report.priority
                  )}`}
                >
                  {friendlyText(
                    report.priority
                  )}
                </span>

                {(activeRestriction ||
                  activeUserRestriction ||
                  activeOrganizationRestriction) && (
                  <span className="rounded-full bg-red-700 px-3 py-1 text-xs font-semibold text-white">
                    Restricted
                  </span>
                )}

              </div>

              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
                Trust & Safety Case
              </p>

              <h1 className="mt-3 font-mono text-2xl font-semibold tracking-tight md:text-3xl">
                {
                  report.report_reference
                }
              </h1>

              <p className="mt-3 text-lg font-semibold">
                {friendlyText(
                  report.category
                )}
              </p>

            </div>

            <div className="rounded-2xl border bg-white p-5 lg:min-w-[260px]">

              <p className="text-xs uppercase tracking-wide text-neutral-400">
                Case Created
              </p>

              <p className="mt-2 text-sm font-semibold">
                {formatDateTime(
                  report.created_at
                )}
              </p>

              <p className="mt-4 text-xs uppercase tracking-wide text-neutral-400">
                Last Updated
              </p>

              <p className="mt-2 text-sm font-semibold">
                {formatDateTime(
                  report.updated_at
                )}
              </p>

            </div>

          </div>

        </section>

        {/* ================================================= */}
        {/* START REVIEW */}
        {/* ================================================= */}

        {canStartReview && (
          <ReviewControls
            reportId={
              report.id
            }
            currentPriority={
              report.priority
            }
          />
        )}

        {/* ================================================= */}
        {/* TRIAGE */}
        {/* ================================================= */}

        {canTriage && (
          <TriageControls
            reportId={
              report.id
            }
          />
        )}

        {/* ================================================= */}
        {/* CURRENT WORKFLOW STATE */}
        {/* ================================================= */}

        {report.status ===
          "action_required" && (
          <section className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6 md:p-8">

            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
              Platform Intervention
            </p>

            <h2 className="mt-2 text-xl font-semibold text-red-950">
              Action Required
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-red-800">
              The investigation has
              identified an issue that
              may require a Threeple
              platform intervention.
              No enforcement action has
              been taken automatically.
            </p>

          </section>
        )}

        {/* ================================================= */}
        {/* RESTRICTION CONTROL */}
        {/* ================================================= */}

        {collection &&
          canInvestigate && (
            <RestrictionSection
              reportId={
                report.id
              }
              collectionId={
                collection.id
              }
              collectionTitle={
                collection.title
              }
              reportStatus={
                report.status
              }
              restriction={
                activeRestriction
                  ? {
                      id:
                        activeRestriction.id,

                      restriction_type:
                        activeRestriction.restriction_type,

                      reason:
                        activeRestriction.reason,

                      imposed_at:
                        activeRestriction.imposed_at,

                      imposed_by:
                        activeRestriction.imposed_by,
                    }
                  : null
              }
            />
          )}

        {report.subject_type ===
          "user" &&
          canInvestigate && (
            <UserRestrictionSection
              reportId={
                report.id
              }
              userId={
                report.subject_id
              }
              userLabel={
                subjectLabel
              }
              reportStatus={
                report.status
              }
              restriction={
                activeUserRestriction
              }
            />
          )}

        {report.subject_type ===
          "organization" &&
          canInvestigate && (
            <OrganizationRestrictionSection
              reportId={
                report.id
              }
              organizationId={
                report.subject_id
              }
              organizationLabel={
                subjectLabel
              }
              reportStatus={
                report.status
              }
              restriction={
                activeOrganizationRestriction
              }
            />
          )}

        {/* ================================================= */}
        {/* CASE RESOLUTION CONTROL */}
        {/* ================================================= */}

        {canInvestigate && (
          <ResolutionControls
            reportId={
              report.id
            }
            reportStatus={
              report.status
            }
            hasActiveRestriction={
              Boolean(
                activeRestriction ||
                activeUserRestriction ||
                activeOrganizationRestriction
              )
            }
          />
        )}

        {/* ================================================= */}
        {/* DESCRIPTION */}
        {/* ================================================= */}

        <section className="mt-8 rounded-3xl border bg-white p-6 md:p-8">

          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Report
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            Reported Concern
          </h2>

          <p className="mt-5 whitespace-pre-wrap leading-7 text-neutral-700">
            {report.description}
          </p>

        </section>

        {/* ================================================= */}
        {/* CASE SUMMARY */}
        {/* ================================================= */}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl border bg-white p-5">

            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Status
            </p>

            <p className="mt-3 font-semibold">
              {friendlyText(
                report.status
              )}
            </p>

          </div>

          <div className="rounded-2xl border bg-white p-5">

            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Priority
            </p>

            <p className="mt-3 font-semibold">
              {friendlyText(
                report.priority
              )}
            </p>

          </div>

          <div className="rounded-2xl border bg-white p-5">

            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Subject Type
            </p>

            <p className="mt-3 font-semibold">
              {friendlyText(
                report.subject_type
              )}
            </p>

          </div>

          <div className="rounded-2xl border bg-white p-5">

            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Assignment
            </p>

            <p className="mt-3 font-semibold">
              {assignedAdmin
                ? assignedAdminName ||
                  friendlyText(
                    assignedAdmin.role
                  )
                : "Unassigned"}
            </p>

          </div>

        </section>

        {/* ================================================= */}
        {/* SUBJECT */}
        {/* ================================================= */}

        <section className="mt-8 rounded-3xl border bg-white p-6 md:p-8">

          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Subject
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            Reported Entity
          </h2>

          <div className="mt-6">

            <p className="text-xs text-neutral-400">
              Type
            </p>

            <p className="mt-1 text-sm font-medium">
              {friendlyText(
                report.subject_type
              )}
            </p>

          </div>

          <div className="mt-5">

            <p className="text-xs text-neutral-400">
              Name
            </p>

            <p className="mt-1 text-lg font-semibold">
              {subjectLabel}
            </p>

          </div>

          <p className="mt-3 break-all font-mono text-xs text-neutral-400">
            {report.subject_id}
          </p>

          {subjectLink && (
            <Link
              href={
                subjectLink
              }
              className="mt-5 inline-flex h-10 items-center justify-center rounded-xl border border-neutral-300 px-4 text-sm font-semibold hover:bg-neutral-50"
            >
              View Subject →
            </Link>
          )}

        </section>

        {/* ================================================= */}
        {/* REPORTER */}
        {/* ================================================= */}

        <section className="mt-8 rounded-3xl border bg-white p-6 md:p-8">

          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Reporter
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            Reporter Information
          </h2>

          <div className="mt-6 grid gap-6 md:grid-cols-3">

            <div>

              <p className="text-xs text-neutral-400">
                Name
              </p>

              <p className="mt-1 text-sm font-medium">
                {reporterProfile?.full_name ||
                  report.reporter_name ||
                  "Not provided"}
              </p>

            </div>

            <div>

              <p className="text-xs text-neutral-400">
                Email
              </p>

              <p className="mt-1 break-all text-sm font-medium">
                {report.reporter_email ||
                  "Not provided"}
              </p>

            </div>

            <div>

              <p className="text-xs text-neutral-400">
                Account
              </p>

              {report.reporter_user_id ? (
                <Link
                  href={`/admin/users/${report.reporter_user_id}`}
                  className="mt-1 inline-flex text-sm font-semibold hover:underline"
                >
                  View Threeple Account →
                </Link>
              ) : (
                <p className="mt-1 text-sm font-medium">
                  Guest report
                </p>
              )}

            </div>

          </div>

        </section>

        {/* ================================================= */}
        {/* LINKED COLLECTION */}
        {/* ================================================= */}

        {collection && (
          <section className="mt-8 rounded-3xl border bg-white p-6 md:p-8">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

              <div>

                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Linked Collection
                </p>

                <h2 className="mt-2 text-xl font-semibold">
                  {collection.title}
                </h2>

              </div>

              {activeRestriction && (
                <span className="inline-flex w-fit rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                  Restricted
                </span>
              )}

            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">

              <div>

                <p className="text-xs text-neutral-400">
                  Threeple Code
                </p>

                <p className="mt-1 font-mono text-sm font-semibold">
                  {collection.join_code ||
                    "—"}
                </p>

              </div>

              <div>

                <p className="text-xs text-neutral-400">
                  Type
                </p>

                <p className="mt-1 text-sm font-medium">
                  {friendlyText(
                    collection.collection_type
                  )}
                </p>

              </div>

              <div>

                <p className="text-xs text-neutral-400">
                  Status
                </p>

                <p className="mt-1 text-sm font-medium">
                  {collection.archived_at
                    ? "Archived"
                    : friendlyText(
                        collection.status
                      )}
                </p>

              </div>

              <div>

                <p className="text-xs text-neutral-400">
                  Organizer
                </p>

                <p className="mt-1 text-sm font-medium">
                  {organization?.name ||
                    "Unknown Organization"}
                </p>

              </div>

            </div>

            <div className="mt-6 flex flex-wrap gap-3">

              <Link
                href={`/admin/collections/${collection.id}`}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-black px-4 text-sm font-semibold text-white"
              >
                View Collection
              </Link>

              <Link
                href={`/admin/users/${collection.created_by}`}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-neutral-300 px-4 text-sm font-semibold hover:bg-neutral-50"
              >
                View Organizer
              </Link>

            </div>

          </section>
        )}

        {/* ================================================= */}
        {/* ASSIGNMENT */}
        {/* ================================================= */}

        <section className="mt-8 rounded-3xl border bg-white p-6 md:p-8">

          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Case Assignment
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            Investigation Ownership
          </h2>

          {assignedAdmin ? (
            <div className="mt-6">

              <p className="font-semibold">
                {assignedAdminName ||
                  "Threeple Admin"}
              </p>

              <p className="mt-1 text-sm text-neutral-500">
                {friendlyText(
                  assignedAdmin.role
                )}
              </p>

              <p className="mt-2 text-xs text-neutral-400">
                {assignedAdmin.is_active
                  ? "Admin account active"
                  : "Admin account inactive"}
              </p>

            </div>
          ) : (
            <div className="mt-6 rounded-2xl bg-amber-50 p-5">

              <p className="font-semibold text-amber-900">
                Unassigned case
              </p>

              <p className="mt-2 text-sm leading-6 text-amber-800">
                No Threeple
                administrator currently
                owns this investigation.
              </p>

            </div>
          )}

        </section>

        {/* ================================================= */}
        {/* RESOLUTION */}
        {/* ================================================= */}

        {(report.status ===
          "resolved" ||
          report.status ===
            "dismissed") && (
          <section className="mt-8 rounded-3xl border bg-white p-6 md:p-8">

            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Resolution
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Case Outcome
            </h2>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">

              <div>

                <p className="text-xs text-neutral-400">
                  Outcome
                </p>

                <p className="mt-1 text-sm font-medium">
                  {friendlyText(
                    report.status
                  )}
                </p>

              </div>

              <div>

                <p className="text-xs text-neutral-400">
                  Completed
                </p>

                <p className="mt-1 text-sm font-medium">
                  {formatDateTime(
                    report.resolved_at
                  )}
                </p>

              </div>

              <div>

                <p className="text-xs text-neutral-400">
                  Completed By
                </p>

                <p className="mt-1 text-sm font-medium">
                  {resolvedByName ||
                    "Threeple Admin"}
                </p>

              </div>

            </div>

            <div className="mt-6">

              <p className="text-xs text-neutral-400">
                Resolution Notes
              </p>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-700">
                {report.resolution_notes ||
                  "No resolution notes recorded."}
              </p>

            </div>

          </section>
        )}

        {/* ================================================= */}
        {/* COLLECTION ACTIVITY */}
        {/* ================================================= */}

        {collection && (
          <section className="mt-8 overflow-hidden rounded-3xl border bg-white">

            <div className="border-b px-6 py-5">

              <h2 className="text-lg font-semibold">
                Related Collection Activity
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Recent Collection
                events that may help
                with this investigation.
              </p>

            </div>

            {collectionActivity.length >
            0 ? (
              <div className="divide-y">

                {collectionActivity.map(
                  (event) => (
                    <div
                      key={
                        event.id
                      }
                      className="px-6 py-5"
                    >

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">

                        <div>

                          <p className="text-sm font-semibold">
                            {friendlyText(
                              event.event_type
                            )}
                          </p>

                          <p className="mt-2 text-sm leading-6 text-neutral-600">
                            {event.description ||
                              event.subject_label ||
                              "Collection activity"}
                          </p>

                        </div>

                        <time className="whitespace-nowrap text-xs text-neutral-400">
                          {formatDateTime(
                            event.created_at
                          )}
                        </time>

                      </div>

                    </div>
                  )
                )}

              </div>
            ) : (
              <div className="px-6 py-10 text-sm text-neutral-500">
                No related Collection
                activity recorded.
              </div>
            )}

          </section>
        )}

        {/* ================================================= */}
        {/* ADMIN ACTION HISTORY */}
        {/* ================================================= */}

        <section className="mt-8 overflow-hidden rounded-3xl border bg-white">

          <div className="border-b px-6 py-5">

            <h2 className="text-lg font-semibold">
              Administrative Action History
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Audited administrative
              actions associated with
              this case.
            </p>

          </div>

          {adminActionRows.length >
          0 ? (
            <div className="divide-y">

              {adminActionRows.map(
                (action) => (
                  <div
                    key={
                      action.id
                    }
                    className="px-6 py-5"
                  >

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">

                      <div>

                        <p className="font-semibold">
                          {friendlyText(
                            action.action_type
                          )}
                        </p>

                        <p className="mt-2 text-sm leading-6 text-neutral-600">
                          {action.reason}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-neutral-400">

                          <span>
                            By{" "}
                            {actionAdminMap.get(
                              action.admin_user_id
                            ) ||
                              friendlyText(
                                action.admin_role
                              )}
                          </span>

                          <span>
                            Role:{" "}
                            {friendlyText(
                              action.admin_role
                            )}
                          </span>

                        </div>

                      </div>

                      <time className="whitespace-nowrap text-xs text-neutral-400">
                        {formatDateTime(
                          action.created_at
                        )}
                      </time>

                    </div>

                  </div>
                )
              )}

            </div>
          ) : (
            <div className="px-6 py-10">

              <p className="text-sm font-medium">
                No administrative
                actions recorded
              </p>

              <p className="mt-2 text-sm text-neutral-500">
                Administrative actions
                will appear here when
                an authorized Threeple
                admin acts on this case.
              </p>

            </div>
          )}

        </section>

        {/* ================================================= */}
        {/* SAFETY BOUNDARY */}
        {/* ================================================= */}

        <section className="mt-8 rounded-3xl bg-neutral-950 p-6 text-white md:p-8">

          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Administrative Boundary
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            Investigation does not automatically equal enforcement
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-300">
            Starting or triaging a
            Trust & Safety case does
            not automatically suspend
            a user, deactivate a
            participant or restrict a
            Collection. Platform
            interventions are handled
            separately and must be
            explicitly authorized and
            audit logged.
          </p>

        </section>

      </div>

    </main>
  );
}