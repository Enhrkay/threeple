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

export const instant = false;

type PageProps = {
  params: Promise<{
    userId: string;
  }>;
};

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

export default async function AdminUserPage({
  params,
}: PageProps) {
  await requirePlatformAdmin();

  const {
    userId,
  } = await params;

  const {
    data: profile,
    error: profileError,
  } = await supabaseAdmin
    .from("profiles")
    .select(`
      id,
      full_name,
      phone
    `)
    .eq(
      "id",
      userId
    )
    .maybeSingle();

  if (
    profileError ||
    !profile
  ) {
    notFound();
  }

  const [
    authUserResult,
    ownedOrganizationsResult,
    createdCollectionsResult,
    activeRestrictionResult,
    restrictionHistoryResult,
    trustSafetyResult,
    adminStatusResult,
  ] = await Promise.all([
    supabaseAdmin.auth.admin.getUserById(
      userId
    ),

    supabaseAdmin
      .from("organizations")
      .select(`
        id,
        name,
        organization_type,
        created_at
      `)
      .eq(
        "owner_id",
        userId
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      ),

    supabaseAdmin
      .from("collections")
      .select(`
        id,
        organization_id,
        title,
        status,
        join_code,
        collection_type,
        collection_mode,
        archived_at,
        created_at
      `)
      .eq(
        "created_by",
        userId
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      ),

    supabaseAdmin
      .from(
        "user_restrictions"
      )
      .select(`
        id,
        trust_safety_report_id,
        restriction_type,
        reason,
        imposed_by,
        imposed_at
      `)
      .eq(
        "user_id",
        userId
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
      .maybeSingle(),

    supabaseAdmin
      .from(
        "user_restrictions"
      )
      .select(`
        id,
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
        "user_id",
        userId
      )
      .order(
        "imposed_at",
        {
          ascending: false,
        }
      )
      .limit(20),

    supabaseAdmin
      .from(
        "trust_safety_reports"
      )
      .select(`
        id,
        report_reference,
        category,
        priority,
        status,
        created_at
      `)
      .eq(
        "subject_type",
        "user"
      )
      .eq(
        "subject_id",
        userId
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(20),

    supabaseAdmin
      .from(
        "platform_admins"
      )
      .select(`
        id,
        role,
        is_active
      `)
      .eq(
        "user_id",
        userId
      )
      .maybeSingle(),
  ]);

  const authUser =
    authUserResult.data?.user ??
    null;

  const ownedOrganizations =
    ownedOrganizationsResult.data ??
    [];

  const createdCollections =
    createdCollectionsResult.data ??
    [];

  const activeRestriction =
    activeRestrictionResult.data ??
    null;

  const restrictionHistory =
    restrictionHistoryResult.data ??
    [];

  const trustSafetyCases =
    trustSafetyResult.data ?? [];

  const platformAdmin =
    adminStatusResult.data ??
    null;

  const activeCollections =
    createdCollections.filter(
      (collection) =>
        collection.status ===
          "active" &&
        !collection.archived_at
    ).length;

  const archivedCollections =
    createdCollections.filter(
      (collection) =>
        Boolean(
          collection.archived_at
        )
    ).length;

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link
            href="/admin"
            className="font-semibold text-neutral-500 hover:text-neutral-950"
          >
            Admin
          </Link>

          <span className="text-neutral-300">
            /
          </span>

          <Link
            href="/admin/users"
            className="font-semibold text-neutral-500 hover:text-neutral-950"
          >
            Users
          </Link>

          <span className="text-neutral-300">
            /
          </span>

          <span className="font-semibold">
            User
          </span>
        </div>

        <section className="mt-6 rounded-3xl border bg-white p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
                User Account
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                {profile.full_name ||
                  authUser?.email ||
                  "Unknown User"}
              </h1>

              <div className="mt-4 flex flex-wrap gap-2">
                {activeRestriction ? (
                  <span className="rounded-full bg-red-700 px-3 py-1 text-xs font-semibold text-white">
                    Restricted
                  </span>
                ) : (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                    No Active Restriction
                  </span>
                )}

                {platformAdmin && (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      platformAdmin.is_active
                        ? "bg-blue-100 text-blue-700"
                        : "bg-neutral-200 text-neutral-600"
                    }`}
                  >
                    {platformAdmin.is_active
                      ? `Platform Admin · ${friendlyText(
                          platformAdmin.role
                        )}`
                      : "Inactive Platform Admin"}
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-2xl border bg-neutral-50 p-5 lg:min-w-[280px]">
              <p className="text-xs uppercase tracking-wide text-neutral-400">
                User ID
              </p>

              <p className="mt-2 break-all font-mono text-xs text-neutral-600">
                {profile.id}
              </p>

              <p className="mt-4 text-xs uppercase tracking-wide text-neutral-400">
                Email
              </p>

              <p className="mt-2 break-all text-sm font-semibold">
                {authUser?.email ||
                  "Not available"}
              </p>

              <p className="mt-4 text-xs uppercase tracking-wide text-neutral-400">
                Account Created
              </p>

              <p className="mt-2 text-sm font-semibold">
                {formatDateTime(
                  authUser?.created_at
                )}
              </p>
            </div>
          </div>
        </section>

        {activeRestriction && (
          <section className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-red-700">
              Active Enforcement
            </p>

            <h2 className="mt-2 text-xl font-semibold text-red-950">
              User Restricted
            </h2>

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-red-700">
                  Restriction Type
                </p>

                <p className="mt-2 font-semibold text-red-950">
                  {friendlyText(
                    activeRestriction.restriction_type
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-red-700">
                  Imposed
                </p>

                <p className="mt-2 font-semibold text-red-950">
                  {formatDateTime(
                    activeRestriction.imposed_at
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-red-700">
                  Trust & Safety Case
                </p>

                {activeRestriction.trust_safety_report_id ? (
                  <Link
                    href={`/admin/trust-safety/${activeRestriction.trust_safety_report_id}`}
                    className="mt-2 inline-block font-semibold text-red-950 underline underline-offset-4"
                  >
                    Open Case →
                  </Link>
                ) : (
                  <p className="mt-2 font-semibold text-red-950">
                    —
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-red-200 bg-white/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                Reason
              </p>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-red-900">
                {activeRestriction.reason}
              </p>
            </div>
          </section>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl border bg-white p-5">
            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Organizations Owned
            </p>

            <p className="mt-3 text-2xl font-semibold">
              {ownedOrganizations.length}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Collections Created
            </p>

            <p className="mt-3 text-2xl font-semibold">
              {createdCollections.length}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Active Collections
            </p>

            <p className="mt-3 text-2xl font-semibold">
              {activeCollections}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Archived Collections
            </p>

            <p className="mt-3 text-2xl font-semibold">
              {archivedCollections}
            </p>
          </div>

        </section>

        <section className="mt-8 rounded-3xl border bg-white p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Account Information
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            User Details
          </h2>

          <div className="mt-6 grid gap-6 md:grid-cols-3">

            <div>
              <p className="text-xs text-neutral-400">
                Full Name
              </p>

              <p className="mt-1 text-sm font-medium">
                {profile.full_name ||
                  "Not provided"}
              </p>
            </div>

            <div>
              <p className="text-xs text-neutral-400">
                Email
              </p>

              <p className="mt-1 break-all text-sm font-medium">
                {authUser?.email ||
                  "Not available"}
              </p>
            </div>

            <div>
              <p className="text-xs text-neutral-400">
                Phone
              </p>

              <p className="mt-1 text-sm font-medium">
                {profile.phone ||
                  "Not provided"}
              </p>
            </div>

          </div>
        </section>

        <section className="mt-8 rounded-3xl border bg-white p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Organizations
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            Organizations Owned
          </h2>

          {ownedOrganizations.length ===
          0 ? (
            <p className="mt-6 text-sm text-neutral-500">
              This user does not own any organizations.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {ownedOrganizations.map(
                (organization) => (
                  <Link
                    key={
                      organization.id
                    }
                    href={`/admin/organizations/${organization.id}`}
                    className="block rounded-2xl border p-5 transition hover:border-neutral-400 hover:bg-neutral-50"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                      <div>
                        <p className="font-semibold">
                          {
                            organization.name
                          }
                        </p>

                        <p className="mt-1 text-sm text-neutral-500">
                          {friendlyText(
                            organization.organization_type
                          )}
                        </p>
                      </div>

                      <p className="text-xs text-neutral-400">
                        {formatDateTime(
                          organization.created_at
                        )}
                      </p>

                    </div>
                  </Link>
                )
              )}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-3xl border bg-white p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Collections
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            Collections Created
          </h2>

          {createdCollections.length ===
          0 ? (
            <p className="mt-6 text-sm text-neutral-500">
              This user has not created any Collections.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">

                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-neutral-400">
                    <th className="pb-3 pr-4">
                      Collection
                    </th>

                    <th className="pb-3 pr-4">
                      Status
                    </th>

                    <th className="pb-3 pr-4">
                      Type
                    </th>

                    <th className="pb-3 pr-4">
                      Join Code
                    </th>

                    <th className="pb-3">
                      Created
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {createdCollections.map(
                    (collection) => (
                      <tr
                        key={
                          collection.id
                        }
                        className="border-b last:border-0"
                      >
                        <td className="py-4 pr-4">
                          <Link
                            href={`/admin/collections/${collection.id}`}
                            className="font-semibold hover:underline"
                          >
                            {
                              collection.title
                            }
                          </Link>
                        </td>

                        <td className="py-4 pr-4">
                          {collection.archived_at
                            ? "Archived"
                            : friendlyText(
                                collection.status
                              )}
                        </td>

                        <td className="py-4 pr-4">
                          {friendlyText(
                            collection.collection_type
                          )}
                        </td>

                        <td className="py-4 pr-4 font-mono text-xs">
                          {collection.join_code ||
                            "—"}
                        </td>

                        <td className="py-4">
                          {formatDateTime(
                            collection.created_at
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>

              </table>
            </div>
          )}
        </section>

        <section className="mt-8 rounded-3xl border bg-white p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Trust & Safety
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            User Cases
          </h2>

          {trustSafetyCases.length ===
          0 ? (
            <p className="mt-6 text-sm text-neutral-500">
              No Trust & Safety cases found for this user.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {trustSafetyCases.map(
                (report) => (
                  <Link
                    key={report.id}
                    href={`/admin/trust-safety/${report.id}`}
                    className="block rounded-2xl border p-4 transition hover:border-neutral-400 hover:bg-neutral-50"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                      <div>
                        <p className="font-mono text-sm font-semibold">
                          {
                            report.report_reference
                          }
                        </p>

                        <p className="mt-1 text-sm text-neutral-600">
                          {friendlyText(
                            report.category
                          )}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-neutral-100 px-2.5 py-1 font-semibold text-neutral-600">
                          {friendlyText(
                            report.priority
                          )}
                        </span>

                        <span className="rounded-full bg-neutral-100 px-2.5 py-1 font-semibold text-neutral-600">
                          {friendlyText(
                            report.status
                          )}
                        </span>
                      </div>

                    </div>
                  </Link>
                )
              )}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-3xl border bg-white p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Enforcement History
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            User Restriction History
          </h2>

          {restrictionHistory.length ===
          0 ? (
            <p className="mt-6 text-sm text-neutral-500">
              No user restriction history.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {restrictionHistory.map(
                (restriction) => (
                  <div
                    key={
                      restriction.id
                    }
                    className="rounded-2xl border p-5"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">

                      <div>
                        <p className="font-semibold">
                          {friendlyText(
                            restriction.restriction_type
                          )}
                        </p>

                        <p className="mt-1 text-xs text-neutral-500">
                          Imposed{" "}
                          {formatDateTime(
                            restriction.imposed_at
                          )}
                        </p>
                      </div>

                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                          restriction.lifted_at
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {restriction.lifted_at
                          ? "Lifted"
                          : "Active"}
                      </span>

                    </div>

                    <p className="mt-4 text-sm leading-6 text-neutral-700">
                      {restriction.reason}
                    </p>

                    {restriction.trust_safety_report_id && (
                      <Link
                        href={`/admin/trust-safety/${restriction.trust_safety_report_id}`}
                        className="mt-4 inline-block text-sm font-semibold underline underline-offset-4"
                      >
                        Open Trust & Safety Case →
                      </Link>
                    )}

                    {restriction.lifted_at && (
                      <div className="mt-4 rounded-xl bg-neutral-50 p-4 text-sm text-neutral-600">

                        <p>
                          Lifted{" "}
                          {formatDateTime(
                            restriction.lifted_at
                          )}
                        </p>

                        {restriction.lift_reason && (
                          <p className="mt-2">
                            {
                              restriction.lift_reason
                            }
                          </p>
                        )}

                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}


