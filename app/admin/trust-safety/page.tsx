import Link from "next/link";

import {
  requirePlatformAdmin,
} from "@/lib/admin/server";

import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

export const instant = false;

type PageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    priority?: string;
    page?: string;
  }>;
};

type TrustSafetyCase = {
  id: string;
  report_reference: string;
  reporter_user_id: string | null;
  reporter_name: string | null;
  reporter_email: string | null;

  subject_type: string;
  subject_id: string;

  collection_id: string | null;

  category: string;
  priority: string;
  status: string;

  description: string;

  assigned_admin_id:
    | string
    | null;

  resolution_notes:
    | string
    | null;

  resolved_at:
    | string
    | null;

  created_at: string;
  updated_at: string;
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

function filterStyle(
  active: boolean
) {
  return active
    ? "bg-black text-white"
    : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50";
}

function buildCaseUrl(
  search: string,
  status: string,
  priority: string,
  page: number
) {
  const params =
    new URLSearchParams();

  if (search) {
    params.set(
      "q",
      search
    );
  }

  if (
    status &&
    status !== "all"
  ) {
    params.set(
      "status",
      status
    );
  }

  if (
    priority &&
    priority !== "all"
  ) {
    params.set(
      "priority",
      priority
    );
  }

  if (page > 1) {
    params.set(
      "page",
      String(page)
    );
  }

  const query =
    params.toString();

  return query
    ? `/admin/trust-safety?${query}`
    : "/admin/trust-safety";
}

// =========================================================
// PAGE
// =========================================================

export default async function TrustSafetyDashboardPage({
  searchParams,
}: PageProps) {
  const admin =
    await requirePlatformAdmin();

  const query =
    await searchParams;

  const searchTerm =
    query.q?.trim() ?? "";

  const allowedStatuses = [
    "all",
    "open",
    "under_review",
    "action_required",
    "resolved",
    "dismissed",
  ];

  const allowedPriorities = [
    "all",
    "low",
    "normal",
    "high",
    "urgent",
  ];

  const statusFilter =
    allowedStatuses.includes(
      query.status ?? ""
    )
      ? query.status!
      : "all";

  const priorityFilter =
    allowedPriorities.includes(
      query.priority ?? ""
    )
      ? query.priority!
      : "all";

  const requestedPage =
    Number(
      query.page ?? "1"
    );

  const currentPage =
    Number.isFinite(
      requestedPage
    ) &&
    requestedPage > 0
      ? Math.floor(
          requestedPage
        )
      : 1;

  const pageSize = 25;

  const start =
    (currentPage - 1) *
    pageSize;

  const end =
    start + pageSize - 1;

  // =======================================================
  // CASE DIRECTORY
  // =======================================================

  let casesQuery =
    supabaseAdmin
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
        resolved_at,
        created_at,
        updated_at
      `)
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .range(
        start,
        end
      );

  if (
    statusFilter !== "all"
  ) {
    casesQuery =
      casesQuery.eq(
        "status",
        statusFilter
      );
  }

  if (
    priorityFilter !== "all"
  ) {
    casesQuery =
      casesQuery.eq(
        "priority",
        priorityFilter
      );
  }

  if (searchTerm) {
    const safeSearch =
      searchTerm
        .replaceAll(",", " ")
        .trim();

    casesQuery =
      casesQuery.or(
        [
          `report_reference.ilike.%${safeSearch}%`,
          `reporter_name.ilike.%${safeSearch}%`,
          `reporter_email.ilike.%${safeSearch}%`,
          `description.ilike.%${safeSearch}%`,
        ].join(",")
      );
  }

  const {
    data: caseData,
    error: caseError,
  } =
    await casesQuery;

  if (caseError) {
    console.error(
      "TRUST_SAFETY_DIRECTORY_FAILED",
      {
        errorCode:
          caseError.code,

        message:
          caseError.message,
      }
    );

    throw new Error(
      "Threeple could not load Trust & Safety cases."
    );
  }

  const cases =
    (caseData ??
      []) as TrustSafetyCase[];

  const statusRank: Record<string, number> = {
    action_required: 0,
    under_review: 1,
    open: 2,
    resolved: 3,
    dismissed: 4,
  };

  const priorityRank: Record<string, number> = {
    urgent: 0,
    high: 1,
    normal: 2,
    low: 3,
  };

  const prioritizedCases =
    [...cases].sort(
      (left, right) => {
        const leftStatusRank =
          statusRank[left.status] ?? 99;

        const rightStatusRank =
          statusRank[right.status] ?? 99;

        if (
          leftStatusRank !==
          rightStatusRank
        ) {
          return (
            leftStatusRank -
            rightStatusRank
          );
        }

        const leftPriorityRank =
          priorityRank[
            left.priority
          ] ?? 99;

        const rightPriorityRank =
          priorityRank[
            right.priority
          ] ?? 99;

        if (
          leftPriorityRank !==
          rightPriorityRank
        ) {
          return (
            leftPriorityRank -
            rightPriorityRank
          );
        }

        return (
          new Date(
            right.updated_at
          ).getTime() -
          new Date(
            left.updated_at
          ).getTime()
        );
      }
    );

  // =======================================================
  // ASSIGNED ADMINS
  // =======================================================

  const assignedAdminIds =
    Array.from(
      new Set(
        cases
          .map(
            (report) =>
              report.assigned_admin_id
          )
          .filter(
            (
              adminId
            ): adminId is string =>
              Boolean(adminId)
          )
      )
    );

  let assignedAdmins:
    {
      id: string;
      user_id: string;
      role: string;
    }[] = [];

  if (
    assignedAdminIds.length >
    0
  ) {
    const {
      data,
    } = await supabaseAdmin
      .from("platform_admins")
      .select(`
        id,
        user_id,
        role
      `)
      .in(
        "id",
        assignedAdminIds
      );

    assignedAdmins =
      data ?? [];
  }

  const assignedUserIds =
    assignedAdmins.map(
      (assignedAdmin) =>
        assignedAdmin.user_id
    );

  let assignedProfiles:
    {
      id: string;
      full_name:
        | string
        | null;
    }[] = [];

  if (
    assignedUserIds.length >
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
        assignedUserIds
      );

    assignedProfiles =
      data ?? [];
  }

  const profileMap =
    new Map(
      assignedProfiles.map(
        (profile) => [
          profile.id,
          profile.full_name,
        ]
      )
    );

  const adminMap =
    new Map(
      assignedAdmins.map(
        (assignedAdmin) => [
          assignedAdmin.id,
          {
            role:
              assignedAdmin.role,

            name:
              profileMap.get(
                assignedAdmin.user_id
              ) ??
              null,
          },
        ]
      )
    );

  // =======================================================
  // SUMMARY COUNTS
  // =======================================================

  const [
    openResult,
    underReviewResult,
    actionRequiredResult,
    resolvedResult,
    dismissedResult,
    urgentResult,
  ] = await Promise.all([

    supabaseAdmin
      .from(
        "trust_safety_reports"
      )
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "status",
        "open"
      ),

    supabaseAdmin
      .from(
        "trust_safety_reports"
      )
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "status",
        "under_review"
      ),

    supabaseAdmin
      .from(
        "trust_safety_reports"
      )
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "status",
        "action_required"
      ),

    supabaseAdmin
      .from(
        "trust_safety_reports"
      )
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "status",
        "resolved"
      ),

    supabaseAdmin
      .from(
        "trust_safety_reports"
      )
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "status",
        "dismissed"
      ),

    supabaseAdmin
      .from(
        "trust_safety_reports"
      )
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "priority",
        "urgent"
      )
      .in(
        "status",
        [
          "open",
          "under_review",
          "action_required",
        ]
      ),

  ]);

  const openCases =
    openResult.count ?? 0;

  const underReviewCases =
    underReviewResult.count ??
    0;

  const actionRequiredCases =
    actionRequiredResult.count ??
    0;

  const resolvedCases =
    resolvedResult.count ?? 0;

  const dismissedCases =
    dismissedResult.count ?? 0;

  const urgentCases =
    urgentResult.count ?? 0;

  const hasPrevious =
    currentPage > 1;

  const hasNext =
    cases.length ===
    pageSize;

  // =======================================================
  // UI
  // =======================================================

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">

      {/* HEADER */}

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

        {/* BACK */}

        <Link
          href="/admin"
          className="text-sm font-medium text-neutral-500 hover:text-black"
        >
          ← Admin Dashboard
        </Link>

        {/* INTRO */}

        <section className="mt-6">

          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
            Trust & Safety
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Case Management
          </h1>

          <p className="mt-3 max-w-3xl leading-7 text-neutral-600">
            Review reports involving
            users, organizations,
            Collections and
            participants before any
            platform intervention is
            taken.
          </p>

        </section>

        {/* SUMMARY */}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">

          <div className="rounded-2xl border bg-white p-5">

            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Open
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {openCases}
            </p>

          </div>

          <div className="rounded-2xl border bg-white p-5">

            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Under Review
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {underReviewCases}
            </p>

          </div>

          <div
            className={`rounded-2xl border p-5 ${
              actionRequiredCases >
              0
                ? "border-red-200 bg-red-50"
                : "bg-white"
            }`}
          >

            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Action Required
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {actionRequiredCases}
            </p>

          </div>

          <div className="rounded-2xl border bg-white p-5">

            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Resolved
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {resolvedCases}
            </p>

          </div>

          <div className="rounded-2xl border bg-white p-5">

            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Dismissed
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {dismissedCases}
            </p>

          </div>

          <div
            className={`rounded-2xl border p-5 ${
              urgentCases > 0
                ? "border-red-300 bg-red-50"
                : "bg-white"
            }`}
          >

            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Urgent Active
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {urgentCases}
            </p>

          </div>

        </section>

        {/* SEARCH */}

        <section className="mt-8 rounded-3xl border bg-white p-6">

          <form
            action="/admin/trust-safety"
            method="get"
            className="flex flex-col gap-3 lg:flex-row"
          >

            <div className="flex-1">

              <label
                htmlFor="case-search"
                className="sr-only"
              >
                Search cases
              </label>

              <input
                id="case-search"
                type="search"
                name="q"
                defaultValue={
                  searchTerm
                }
                placeholder="Search reference, reporter or description..."
                className="h-11 w-full rounded-xl border border-neutral-300 px-4 text-sm outline-none focus:border-black"
              />

            </div>

            {statusFilter !==
              "all" && (
              <input
                type="hidden"
                name="status"
                value={
                  statusFilter
                }
              />
            )}

            {priorityFilter !==
              "all" && (
              <input
                type="hidden"
                name="priority"
                value={
                  priorityFilter
                }
              />
            )}

            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              Search
            </button>

            {(searchTerm ||
              statusFilter !==
                "all" ||
              priorityFilter !==
                "all") && (
              <Link
                href="/admin/trust-safety"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-neutral-300 px-5 text-sm font-semibold hover:bg-neutral-50"
              >
                Clear
              </Link>
            )}

          </form>

        </section>

        {/* STATUS FILTERS */}

        <section className="mt-5">

          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Status
          </p>

          <div className="flex flex-wrap gap-2">

            {[
              ["all", "All"],
              ["open", "Open"],
              [
                "under_review",
                "Under Review",
              ],
              [
                "action_required",
                "Action Required",
              ],
              [
                "resolved",
                "Resolved",
              ],
              [
                "dismissed",
                "Dismissed",
              ],
            ].map(
              ([key, label]) => (
                <Link
                  key={key}
                  href={buildCaseUrl(
                    searchTerm,
                    key,
                    priorityFilter,
                    1
                  )}
                  className={`inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-medium ${filterStyle(
                    statusFilter ===
                      key
                  )}`}
                >
                  {label}
                </Link>
              )
            )}

          </div>

        </section>

        {/* PRIORITY FILTERS */}

        <section className="mt-5">

          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Priority
          </p>

          <div className="flex flex-wrap gap-2">

            {[
              ["all", "All"],
              ["low", "Low"],
              ["normal", "Normal"],
              ["high", "High"],
              ["urgent", "Urgent"],
            ].map(
              ([key, label]) => (
                <Link
                  key={key}
                  href={buildCaseUrl(
                    searchTerm,
                    statusFilter,
                    key,
                    1
                  )}
                  className={`inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-medium ${filterStyle(
                    priorityFilter ===
                      key
                  )}`}
                >
                  {label}
                </Link>
              )
            )}

          </div>

        </section>

        {/* CASES */}

        <section className="mt-8 overflow-hidden rounded-3xl border bg-white">

          <div className="flex flex-col gap-2 border-b px-6 py-5 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="text-lg font-semibold">
                Trust & Safety Cases
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Review and investigate
                reported platform
                concerns.
              </p>

            </div>

            <p className="text-xs text-neutral-400">
              Page{" "}
              {currentPage}
            </p>

          </div>

          {cases.length > 0 ? (
            <div className="divide-y">

              {prioritizedCases.map(
                (report) => {
                  const assignment =
                    report.assigned_admin_id
                      ? adminMap.get(
                          report.assigned_admin_id
                        )
                      : null;

                  return (
                    <article
                      key={
                        report.id
                      }
                      className={`px-6 py-6 transition ${
                        report.status ===
                          "resolved" ||
                        report.status ===
                          "dismissed"
                          ? "bg-neutral-50/70 hover:bg-neutral-100"
                          : report.status ===
                              "action_required" ||
                            report.priority ===
                              "urgent"
                            ? "bg-red-50/40 hover:bg-red-50"
                            : "hover:bg-neutral-50"
                      }`}
                    >

                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                        <div className="min-w-0 flex-1">

                          <div className="flex flex-wrap items-center gap-2">

                            <Link
                              href={`/admin/trust-safety/${report.id}`}
                              className="font-mono text-sm font-semibold hover:underline"
                            >
                              {
                                report.report_reference
                              }
                            </Link>

                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle(
                                report.status
                              )}`}
                            >
                              {friendlyText(
                                report.status
                              )}
                            </span>

                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityStyle(
                                report.priority
                              )}`}
                            >
                              {friendlyText(
                                report.priority
                              )}
                            </span>

                            {(report.status ===
                              "resolved" ||
                              report.status ===
                                "dismissed") && (
                              <span className="rounded-full border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-500">
                                Closed
                              </span>
                            )}

                          </div>

                          <h3 className="mt-4 font-semibold">
                            {friendlyText(
                              report.category
                            )}
                          </h3>

                          <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-neutral-600">
                            {
                              report.description
                            }
                          </p>

                          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-neutral-500">

                            <span>
                              Subject:{" "}
                              {friendlyText(
                                report.subject_type
                              )}
                            </span>

                            <span>
                              Reporter:{" "}
                              {report.reporter_name ||
                                report.reporter_email ||
                                "Not identified"}
                            </span>

                            <span>
                              Created:{" "}
                              {formatDateTime(
                                report.created_at
                              )}
                            </span>

                            {report.resolved_at && (
                              <span>
                                Closed:{" "}
                                {formatDateTime(
                                  report.resolved_at
                                )}
                              </span>
                            )}

                          </div>

                        </div>

                        <div className="flex min-w-[190px] flex-col gap-3 lg:items-end">

                          <div>

                            <p className="text-xs text-neutral-400 lg:text-right">
                              Assigned to
                            </p>

                            <p className="mt-1 text-sm font-medium lg:text-right">
                              {assignment?.name ||
                                (assignment
                                  ? friendlyText(
                                      assignment.role
                                    )
                                  : "Unassigned")}
                            </p>

                          </div>

                          <Link
                            href={`/admin/trust-safety/${report.id}`}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold hover:bg-neutral-100"
                          >
                            View Case →
                          </Link>

                        </div>

                      </div>

                    </article>
                  );
                }
              )}

            </div>
          ) : (
            <div className="px-6 py-14 text-center">

              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100">
                ✓
              </div>

              <h3 className="mt-4 font-semibold">
                No cases found
              </h3>

              <p className="mt-2 text-sm text-neutral-500">
                There are no Trust
                & Safety reports
                matching the current
                filters.
              </p>

            </div>
          )}

        </section>

        {/* PAGINATION */}

        {(hasPrevious ||
          hasNext) && (
          <div className="mt-6 flex items-center justify-between">

            {hasPrevious ? (
              <Link
                href={buildCaseUrl(
                  searchTerm,
                  statusFilter,
                  priorityFilter,
                  currentPage - 1
                )}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 text-sm font-semibold hover:bg-neutral-50"
              >
                ← Previous
              </Link>
            ) : (
              <div />
            )}

            <p className="text-sm text-neutral-500">
              Page{" "}
              {currentPage}
            </p>

            {hasNext ? (
              <Link
                href={buildCaseUrl(
                  searchTerm,
                  statusFilter,
                  priorityFilter,
                  currentPage + 1
                )}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 text-sm font-semibold hover:bg-neutral-50"
              >
                Next →
              </Link>
            ) : (
              <div />
            )}

          </div>
        )}

        {/* SAFETY */}

        <section className="mt-8 rounded-3xl bg-neutral-950 p-6 text-white md:p-8">

          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Trust & Safety Principle
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            Case first. Action second.
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-300">
            Threeple administrative
            intervention should be
            based on documented
            evidence, a recorded
            reason and an auditable
            case history. This
            dashboard currently
            provides case visibility
            only.
          </p>

        </section>

      </div>

    </main>
  );
}

