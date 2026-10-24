import Link from "next/link";

import {
  requirePlatformAdmin,
} from "@/lib/admin/server";

import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

export const instant = false;

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

function metricCard(
  label: string,
  value: number,
  description: string,
  href?: string,
  alert = false
) {
  const card = (
    <div
      className={`h-full rounded-2xl border p-5 ${
        alert
          ? "border-red-200 bg-red-50"
          : "bg-white"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-wide ${
          alert
            ? "text-red-600"
            : "text-neutral-400"
        }`}
      >
        {label}
      </p>

      <p
        className={`mt-3 text-3xl font-semibold ${
          alert
            ? "text-red-950"
            : "text-neutral-950"
        }`}
      >
        {value}
      </p>

      <p
        className={`mt-2 text-xs ${
          alert
            ? "text-red-700"
            : "text-neutral-500"
        }`}
      >
        {description}
      </p>

      {href && (
        <p
          className={`mt-4 text-sm font-semibold ${
            alert
              ? "text-red-900"
              : "text-neutral-900"
          }`}
        >
          Open →
        </p>
      )}
    </div>
  );

  if (!href) {
    return card;
  }

  return (
    <Link
      href={href}
      className="block transition hover:-translate-y-0.5"
    >
      {card}
    </Link>
  );
}

export default async function AdminDashboardPage() {
  const admin =
    await requirePlatformAdmin();

  const [
    usersResult,
    organizationsResult,
    collectionsResult,
    activeCollectionsResult,
    participantsResult,
    pendingParticipantsResult,
    archivedCollectionsResult,
    platformAdminsResult,
    restrictedUsersResult,
    restrictedOrganizationsResult,
    restrictedCollectionsResult,
    openCasesResult,
    actionRequiredCasesResult,
    underReviewCasesResult,
  ] = await Promise.all([

    supabaseAdmin
      .from("profiles")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      ),

    supabaseAdmin
      .from("organizations")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      ),

    supabaseAdmin
      .from("collections")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      ),

    supabaseAdmin
      .from("collections")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "status",
        "active"
      )
      .is(
        "archived_at",
        null
      ),

    supabaseAdmin
      .from("participants")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      ),

    supabaseAdmin
      .from("participants")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "participation_status",
        "approval_pending"
      )
      .eq(
        "is_active",
        true
      ),

    supabaseAdmin
      .from("collections")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .not(
        "archived_at",
        "is",
        null
      ),

    supabaseAdmin
      .from("platform_admins")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "is_active",
        true
      ),

    supabaseAdmin
      .from("user_restrictions")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .is(
        "lifted_at",
        null
      ),

    supabaseAdmin
      .from(
        "organization_restrictions"
      )
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .is(
        "lifted_at",
        null
      ),

    supabaseAdmin
      .from(
        "collection_restrictions"
      )
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .is(
        "lifted_at",
        null
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
        "under_review"
      ),
  ]);

  const totalUsers =
    usersResult.count ?? 0;

  const totalOrganizations =
    organizationsResult.count ?? 0;

  const totalCollections =
    collectionsResult.count ?? 0;

  const activeCollections =
    activeCollectionsResult.count ??
    0;

  const totalParticipants =
    participantsResult.count ?? 0;

  const pendingParticipants =
    pendingParticipantsResult.count ??
    0;

  const archivedCollections =
    archivedCollectionsResult.count ??
    0;

  const platformAdminCount =
    platformAdminsResult.count ?? 0;

  const restrictedUsers =
    restrictedUsersResult.count ?? 0;

  const restrictedOrganizations =
    restrictedOrganizationsResult.count ??
    0;

  const restrictedCollections =
    restrictedCollectionsResult.count ??
    0;

  const openCases =
    openCasesResult.count ?? 0;

  const actionRequiredCases =
    actionRequiredCasesResult.count ??
    0;

  const underReviewCases =
    underReviewCasesResult.count ?? 0;

  const activeEnforcementTotal =
    restrictedUsers +
    restrictedOrganizations +
    restrictedCollections;

  const activeTrustSafetyWorkload =
    openCases +
    actionRequiredCases +
    underReviewCases;

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">

      <header className="border-b bg-neutral-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <Link href="/admin">
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

        <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
              Threeple Admin
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Platform Overview
            </h1>

            <p className="mt-3 max-w-2xl leading-7 text-neutral-600">
              Monitor platform growth, active enforcement and Trust & Safety workload across Threeple.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-neutral-300 bg-white px-5 text-sm font-semibold transition hover:bg-neutral-100"
          >
            Open Organizer Dashboard
          </Link>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metricCard(
            "Users",
            totalUsers,
            "Registered user profiles",
            "/admin/users"
          )}

          {metricCard(
            "Organizations",
            totalOrganizations,
            "Organizations on Threeple",
            "/admin/organizations"
          )}

          {metricCard(
            "Collections",
            totalCollections,
            `${activeCollections} currently active`,
            "/admin/collections"
          )}

          {metricCard(
            "Participants",
            totalParticipants,
            `${pendingParticipants} awaiting approval`
          )}
        </section>

        <section className="mt-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Enforcement
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                Active Restrictions
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                Live restrictions currently affecting users, organizations and Collections.
              </p>
            </div>

            <div className="rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-700">
              {activeEnforcementTotal} active
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {metricCard(
              "Restricted Users",
              restrictedUsers,
              "Accounts with active user-level enforcement",
              "/admin/users",
              restrictedUsers > 0
            )}

            {metricCard(
              "Restricted Organizations",
              restrictedOrganizations,
              "Organizations with active enforcement",
              "/admin/organizations",
              restrictedOrganizations >
                0
            )}

            {metricCard(
              "Restricted Collections",
              restrictedCollections,
              "Collections with active enforcement",
              "/admin/collections",
              restrictedCollections >
                0
            )}
          </div>
        </section>

        <section className="mt-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Trust & Safety
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                Investigation Workload
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                Cases that still require review, investigation or enforcement action.
              </p>
            </div>

            <Link
              href="/admin/trust-safety"
              className="text-sm font-semibold hover:underline"
            >
              Open Trust & Safety →
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metricCard(
              "Open Cases",
              openCases,
              "Waiting to enter review",
              "/admin/trust-safety?status=open",
              openCases > 0
            )}

            {metricCard(
              "Under Review",
              underReviewCases,
              "Cases currently being investigated",
              "/admin/trust-safety?status=under_review",
              underReviewCases > 0
            )}

            {metricCard(
              "Action Required",
              actionRequiredCases,
              "Cases requiring an admin decision",
              "/admin/trust-safety?status=action_required",
              actionRequiredCases > 0
            )}

            {metricCard(
              "Active Workload",
              activeTrustSafetyWorkload,
              "Open + under review + action required",
              "/admin/trust-safety",
              activeTrustSafetyWorkload >
                0
            )}
          </div>
        </section>

        <section className="mt-10">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Platform Health
          </p>

          <h2 className="mt-2 text-2xl font-semibold">
            Operational Metrics
          </h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metricCard(
              "Active Collections",
              activeCollections,
              "Currently operating Collections",
              "/admin/collections"
            )}

            {metricCard(
              "Pending Participants",
              pendingParticipants,
              "Participation requests awaiting approval"
            )}

            {metricCard(
              "Archived Collections",
              archivedCollections,
              "Historical Collections"
            )}

            {metricCard(
              "Platform Admins",
              platformAdminCount,
              "Active admin accounts"
            )}
          </div>
        </section>

        <section className="mt-10">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Platform Operations
          </p>

          <h2 className="mt-2 text-2xl font-semibold">
            Admin Control Center
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
            Open the operational areas used to review users, organizations, Collections and Trust & Safety activity.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">

            <Link
              href="/admin/users"
              className="group rounded-2xl border bg-white p-6 transition hover:-translate-y-0.5 hover:border-neutral-400 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-lg transition group-hover:bg-neutral-900 group-hover:text-white">
                  👤
                </div>

                {restrictedUsers > 0 ? (
                  <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                    {restrictedUsers} Restricted
                  </span>
                ) : (
                  <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                    Clear
                  </span>
                )}
              </div>

              <h3 className="mt-5 font-semibold">
                Users
              </h3>

              <p className="mt-2 text-sm leading-6 text-neutral-500">
                Review user accounts, admin status and enforcement history.
              </p>

              <p className="mt-5 text-sm font-semibold text-neutral-900">
                Open Users →
              </p>
            </Link>

            <Link
              href="/admin/organizations"
              className="group rounded-2xl border bg-white p-6 transition hover:-translate-y-0.5 hover:border-neutral-400 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-lg transition group-hover:bg-neutral-900 group-hover:text-white">
                  ◫
                </div>

                {restrictedOrganizations >
                0 ? (
                  <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                    {restrictedOrganizations} Restricted
                  </span>
                ) : (
                  <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                    Clear
                  </span>
                )}
              </div>

              <h3 className="mt-5 font-semibold">
                Organizations
              </h3>

              <p className="mt-2 text-sm leading-6 text-neutral-500">
                Review organization ownership, Collections and active restrictions.
              </p>

              <p className="mt-5 text-sm font-semibold text-neutral-900">
                Open Organizations →
              </p>
            </Link>

            <Link
              href="/admin/collections"
              className="group rounded-2xl border bg-white p-6 transition hover:-translate-y-0.5 hover:border-neutral-400 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-lg transition group-hover:bg-neutral-900 group-hover:text-white">
                  ▦
                </div>

                {restrictedCollections >
                0 ? (
                  <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                    {restrictedCollections} Restricted
                  </span>
                ) : (
                  <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                    Clear
                  </span>
                )}
              </div>

              <h3 className="mt-5 font-semibold">
                Collections
              </h3>

              <p className="mt-2 text-sm leading-6 text-neutral-500">
                Monitor Collections, lifecycle state and enforcement.
              </p>

              <p className="mt-5 text-sm font-semibold text-neutral-900">
                Open Collections →
              </p>
            </Link>

            <Link
              href="/admin/trust-safety"
              className="group rounded-2xl border bg-white p-6 transition hover:-translate-y-0.5 hover:border-neutral-400 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-lg transition group-hover:bg-neutral-900 group-hover:text-white">
                  ⚑
                </div>

                {activeTrustSafetyWorkload >
                0 ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    {activeTrustSafetyWorkload} Active
                  </span>
                ) : (
                  <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                    Clear
                  </span>
                )}
              </div>

              <h3 className="mt-5 font-semibold">
                Trust & Safety
              </h3>

              <p className="mt-2 text-sm leading-6 text-neutral-500">
                Investigate reports, apply enforcement and resolve cases.
              </p>

              <p className="mt-5 text-sm font-semibold text-neutral-900">
                Open Trust & Safety →
              </p>
            </Link>

          </div>
        </section>

      </div>
    </main>
  );
}
