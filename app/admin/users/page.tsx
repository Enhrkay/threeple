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
  }>;
};

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
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

export default async function AdminUsersPage({
  searchParams,
}: PageProps) {
  await requirePlatformAdmin();

  const query =
    await searchParams;

  const searchTerm =
    query.q?.trim() ?? "";

  let usersQuery =
    supabaseAdmin
      .from("profiles")
      .select(`
        id,
        full_name,
        phone
      `)
      .order(
        "full_name",
        {
          ascending: true,
        }
      )
      .limit(250);

  if (searchTerm) {
    usersQuery =
      usersQuery.ilike(
        "full_name",
        `%${searchTerm}%`
      );
  }

  const {
    data: users,
    error: usersError,
  } = await usersQuery;

  if (usersError) {
    console.error(
      "Admin users lookup failed:",
      usersError
    );
  }

  const userRows =
    users ?? [];

  const {
    data: activeRestrictions,
  } = await supabaseAdmin
    .from("user_restrictions")
    .select(`
      user_id,
      restriction_type,
      imposed_at
    `)
    .is(
      "lifted_at",
      null
    );

  const restrictionMap =
    new Map(
      (activeRestrictions ?? []).map(
        (restriction) => [
          restriction.user_id,
          restriction,
        ]
      )
    );

  const {
    data: platformAdmins,
  } = await supabaseAdmin
    .from("platform_admins")
    .select(`
      user_id,
      role,
      is_active
    `);

  const adminMap =
    new Map(
      (platformAdmins ?? []).map(
        (admin) => [
          admin.user_id,
          admin,
        ]
      )
    );

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

          <span className="font-semibold">
            Users
          </span>
        </div>

        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
              Platform Operations
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Users
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
              Review Threeple users and identify accounts with active Trust & Safety enforcement.
            </p>
          </div>

          <form
            action="/admin/users"
            className="flex w-full max-w-md gap-2"
          >
            <input
              name="q"
              defaultValue={
                searchTerm
              }
              placeholder="Search by name"
              className="h-11 min-w-0 flex-1 rounded-xl border border-neutral-300 bg-white px-4 text-sm outline-none focus:border-neutral-500"
            />

            <button
              type="submit"
              className="h-11 rounded-xl bg-black px-5 text-sm font-semibold text-white"
            >
              Search
            </button>
          </form>
        </div>

        <section className="mt-8 rounded-3xl border bg-white p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Directory
              </p>

              <h2 className="mt-2 text-xl font-semibold">
                User Accounts
              </h2>
            </div>

            <p className="text-sm text-neutral-500">
              {userRows.length} shown
            </p>
          </div>

          {userRows.length === 0 ? (
            <p className="mt-6 text-sm text-neutral-500">
              No users found.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-neutral-400">
                    <th className="pb-3 pr-4">
                      User
                    </th>
                    <th className="pb-3 pr-4">
                      Phone
                    </th>
                    <th className="pb-3 pr-4">
                      Enforcement
                    </th>
                    <th className="pb-3 pr-4">
                      Admin Status
                    </th>
                    <th className="pb-3">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {userRows.map(
                    (user) => {
                      const restriction =
                        restrictionMap.get(
                          user.id
                        );

                      const admin =
                        adminMap.get(
                          user.id
                        );

                      return (
                        <tr
                          key={user.id}
                          className="border-b last:border-0"
                        >
                          <td className="py-4 pr-4">
                            <p className="font-semibold">
                              {user.full_name ||
                                "Unnamed User"}
                            </p>

                            <p className="mt-1 font-mono text-xs text-neutral-400">
                              {user.id}
                            </p>
                          </td>

                          <td className="py-4 pr-4">
                            {user.phone ||
                              "—"}
                          </td>

                          <td className="py-4 pr-4">
                            {restriction ? (
                              <div>
                                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                                  Restricted
                                </span>

                                <p className="mt-2 text-xs text-neutral-500">
                                  {friendlyText(
                                    restriction.restriction_type
                                  )}
                                </p>
                              </div>
                            ) : (
                              <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                                Clear
                              </span>
                            )}
                          </td>

                          <td className="py-4 pr-4">
                            {admin ? (
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  admin.is_active
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-neutral-200 text-neutral-600"
                                }`}
                              >
                                {admin.is_active
                                  ? friendlyText(
                                      admin.role
                                    )
                                  : "Inactive Admin"}
                              </span>
                            ) : (
                              <span className="text-neutral-400">
                                Standard User
                              </span>
                            )}
                          </td>

                          <td className="py-4">
                            <Link
                              href={`/admin/users/${user.id}`}
                              className="font-semibold hover:underline"
                            >
                              View User →
                            </Link>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}


