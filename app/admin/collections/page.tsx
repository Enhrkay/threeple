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

export default async function AdminCollectionsPage({
  searchParams,
}: PageProps) {
  await requirePlatformAdmin();

  const query =
    await searchParams;

  const searchTerm =
    query.q?.trim() ?? "";

  let collectionsQuery =
    supabaseAdmin
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
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(250);

  if (searchTerm) {
    collectionsQuery =
      collectionsQuery.ilike(
        "title",
        `%${searchTerm}%`
      );
  }

  const {
    data: collections,
    error: collectionsError,
  } = await collectionsQuery;

  if (collectionsError) {
    console.error(
      "Admin collections lookup failed:",
      collectionsError
    );
  }

  const collectionRows =
    collections ?? [];

  const organizationIds = [
    ...new Set(
      collectionRows.map(
        (collection) =>
          collection.organization_id
      )
    ),
  ];

  const [
    restrictionsResult,
    organizationsResult,
  ] = await Promise.all([
    supabaseAdmin
      .from(
        "collection_restrictions"
      )
      .select(`
        collection_id,
        restriction_type,
        imposed_at
      `)
      .is(
        "lifted_at",
        null
      ),

    organizationIds.length > 0
      ? supabaseAdmin
          .from("organizations")
          .select(`
            id,
            name
          `)
          .in(
            "id",
            organizationIds
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
          restriction.collection_id,
          restriction,
        ]
      )
    );

  const organizationMap =
    new Map(
      (organizationsResult.data ??
        []).map(
        (organization) => [
          organization.id,
          organization,
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
            Collections
          </span>
        </div>

        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
              Platform Operations
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Collections
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
              Review Collections across Threeple and see active enforcement immediately.
            </p>
          </div>

          <form
            action="/admin/collections"
            className="flex w-full max-w-md gap-2"
          >
            <input
              name="q"
              defaultValue={
                searchTerm
              }
              placeholder="Search Collections"
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
                Platform Collections
              </h2>
            </div>

            <p className="text-sm text-neutral-500">
              {collectionRows.length} shown
            </p>
          </div>

          {collectionRows.length ===
          0 ? (
            <p className="mt-6 text-sm text-neutral-500">
              No Collections found.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-neutral-400">
                    <th className="pb-3 pr-4">
                      Collection
                    </th>
                    <th className="pb-3 pr-4">
                      Organization
                    </th>
                    <th className="pb-3 pr-4">
                      Status
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
                  {collectionRows.map(
                    (collection) => {
                      const restriction =
                        restrictionMap.get(
                          collection.id
                        );

                      const organization =
                        organizationMap.get(
                          collection.organization_id
                        );

                      return (
                        <tr
                          key={
                            collection.id
                          }
                          className="border-b last:border-0"
                        >
                          <td className="py-4 pr-4">
                            <p className="font-semibold">
                              {
                                collection.title
                              }
                            </p>

                            <p className="mt-1 font-mono text-xs text-neutral-400">
                              {collection.join_code ||
                                collection.id}
                            </p>
                          </td>

                          <td className="py-4 pr-4">
                            {organization ? (
                              <Link
                                href={`/admin/organizations/${organization.id}`}
                                className="font-medium hover:underline"
                              >
                                {
                                  organization.name
                                }
                              </Link>
                            ) : (
                              "Unknown Organization"
                            )}
                          </td>

                          <td className="py-4 pr-4">
                            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">
                              {collection.archived_at
                                ? "Archived"
                                : friendlyText(
                                    collection.status
                                  )}
                            </span>
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
                              collection.created_at
                            )}
                          </td>

                          <td className="py-4">
                            <Link
                              href={`/admin/collections/${collection.id}`}
                              className="font-semibold hover:underline"
                            >
                              View Collection →
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
