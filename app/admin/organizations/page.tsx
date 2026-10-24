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

export default async function AdminOrganizationsPage({
  searchParams,
}: PageProps) {
  await requirePlatformAdmin();

  const query =
    await searchParams;

  const searchTerm =
    query.q?.trim() ?? "";

  let organizationsQuery =
    supabaseAdmin
      .from("organizations")
      .select(`
        id,
        owner_id,
        name,
        organization_type,
        created_at
      `)
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(250);

  if (searchTerm) {
    organizationsQuery =
      organizationsQuery.ilike(
        "name",
        `%${searchTerm}%`
      );
  }

  const {
    data: organizations,
    error: organizationsError,
  } = await organizationsQuery;

  if (organizationsError) {
    console.error(
      "Admin organizations lookup failed:",
      organizationsError
    );
  }

  const organizationRows =
    organizations ?? [];

  const ownerIds = [
    ...new Set(
      organizationRows.map(
        (organization) =>
          organization.owner_id
      )
    ),
  ];

  const [
    restrictionsResult,
    ownersResult,
    collectionsResult,
  ] = await Promise.all([
    supabaseAdmin
      .from(
        "organization_restrictions"
      )
      .select(`
        organization_id,
        restriction_type,
        imposed_at
      `)
      .is(
        "lifted_at",
        null
      ),

    ownerIds.length > 0
      ? supabaseAdmin
          .from("profiles")
          .select(`
            id,
            full_name
          `)
          .in(
            "id",
            ownerIds
          )
      : Promise.resolve({
          data: [],
          error: null,
        }),

    organizationRows.length > 0
      ? supabaseAdmin
          .from("collections")
          .select(`
            id,
            organization_id,
            status,
            archived_at
          `)
          .in(
            "organization_id",
            organizationRows.map(
              (organization) =>
                organization.id
            )
          )
      : Promise.resolve({
          data: [],
          error: null,
        }),
  ]);

  const restrictionMap =
    new Map(
      (restrictionsResult.data ??
        []).map(
        (restriction) => [
          restriction.organization_id,
          restriction,
        ]
      )
    );

  const ownerMap =
    new Map(
      (ownersResult.data ??
        []).map(
        (owner) => [
          owner.id,
          owner,
        ]
      )
    );

  const collectionCounts =
    new Map<
      string,
      {
        total: number;
        active: number;
      }
    >();

  for (
    const collection of
      collectionsResult.data ?? []
  ) {
    const current =
      collectionCounts.get(
        collection.organization_id
      ) ?? {
        total: 0,
        active: 0,
      };

    current.total += 1;

    if (
      collection.status ===
        "active" &&
      !collection.archived_at
    ) {
      current.active += 1;
    }

    collectionCounts.set(
      collection.organization_id,
      current
    );
  }

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
            Organizations
          </span>
        </div>

        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
              Platform Operations
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Organizations
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
              Review organizations, ownership, Collection activity and active Trust & Safety restrictions.
            </p>
          </div>

          <form
            action="/admin/organizations"
            className="flex w-full max-w-md gap-2"
          >
            <input
              name="q"
              defaultValue={
                searchTerm
              }
              placeholder="Search organizations"
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
                Platform Organizations
              </h2>
            </div>

            <p className="text-sm text-neutral-500">
              {organizationRows.length} shown
            </p>
          </div>

          {organizationRows.length ===
          0 ? (
            <p className="mt-6 text-sm text-neutral-500">
              No organizations found.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[940px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-neutral-400">
                    <th className="pb-3 pr-4">
                      Organization
                    </th>
                    <th className="pb-3 pr-4">
                      Owner
                    </th>
                    <th className="pb-3 pr-4">
                      Collections
                    </th>
                    <th className="pb-3 pr-4">
                      Enforcement
                    </th>
                    <th className="pb-3 pr-4">
                      Created
                    </th>
                    <th className="pb-3">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {organizationRows.map(
                    (organization) => {
                      const restriction =
                        restrictionMap.get(
                          organization.id
                        );

                      const owner =
                        ownerMap.get(
                          organization.owner_id
                        );

                      const counts =
                        collectionCounts.get(
                          organization.id
                        ) ?? {
                          total: 0,
                          active: 0,
                        };

                      return (
                        <tr
                          key={
                            organization.id
                          }
                          className="border-b last:border-0"
                        >
                          <td className="py-4 pr-4">
                            <p className="font-semibold">
                              {
                                organization.name
                              }
                            </p>

                            <p className="mt-1 text-xs text-neutral-500">
                              {friendlyText(
                                organization.organization_type
                              )}
                            </p>
                          </td>

                          <td className="py-4 pr-4">
                            <Link
                              href={`/admin/users/${organization.owner_id}`}
                              className="font-medium hover:underline"
                            >
                              {owner?.full_name ||
                                "Unknown User"}
                            </Link>
                          </td>

                          <td className="py-4 pr-4">
                            <p className="font-semibold">
                              {counts.total}
                            </p>

                            <p className="mt-1 text-xs text-neutral-500">
                              {counts.active} active
                            </p>
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

                          <td className="py-4 pr-4 text-neutral-500">
                            {formatDateTime(
                              organization.created_at
                            )}
                          </td>

                          <td className="py-4">
                            <Link
                              href={`/admin/organizations/${organization.id}`}
                              className="font-semibold hover:underline"
                            >
                              View Organization →
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
