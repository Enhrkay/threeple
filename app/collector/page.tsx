import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

import {
  ThreepleAppShell,
} from "@/components/threeple/app-shell";

import {
  ThreepleBadge,
  ThreepleEmptyState,
  ThreepleStat,
} from "@/components/threeple/design-system";

export const instant = false;

function prettyText(
  value: string
) {
  return value
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
}

function money(
  amount:
    | number
    | string
    | null,
  currency: string
) {
  if (
    amount === null ||
    amount === undefined
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-NG",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }
  ).format(
    Number(amount)
  );
}

export default async function CollectorHomePage() {
  const supabase =
    await createClient();

  const {
    data: claimsData,
    error: claimsError,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (
    claimsError ||
    !userId
  ) {
    redirect(
      `/auth/login?next=${encodeURIComponent(
        "/collector"
      )}`
    );
  }

  const [
    ownedOrganizationsResult,
    membershipsResult,
  ] =
    await Promise.all([
      supabaseAdmin
        .from("organizations")
        .select(`
          id,
          name
        `)
        .eq(
          "owner_id",
          userId
        ),

      supabaseAdmin
        .from(
          "organization_members"
        )
        .select(`
          organization_id,
          role
        `)
        .eq(
          "user_id",
          userId
        )
        .in(
          "role",
          [
            "admin",
            "treasurer",
          ]
        ),
    ]);

  const ownedOrganizations =
    ownedOrganizationsResult.data ??
    [];

  const memberships =
    membershipsResult.data ??
    [];

  const organizationIds =
    Array.from(
      new Set([
        ...ownedOrganizations.map(
          (organization) =>
            organization.id
        ),
        ...memberships.map(
          (membership) =>
            membership.organization_id
        ),
      ])
    );

  const organizationNameMap =
    new Map(
      ownedOrganizations.map(
        (organization) => [
          organization.id,
          organization.name,
        ]
      )
    );

  if (
    organizationIds.length >
    0
  ) {
    const missingOrganizationIds =
      organizationIds.filter(
        (id) =>
          !organizationNameMap.has(
            id
          )
      );

    if (
      missingOrganizationIds.length >
      0
    ) {
      const {
        data:
          memberOrganizations,
      } =
        await supabaseAdmin
          .from(
            "organizations"
          )
          .select(`
            id,
            name
          `)
          .in(
            "id",
            missingOrganizationIds
          );

      for (
        const organization
        of memberOrganizations ??
        []
      ) {
        organizationNameMap.set(
          organization.id,
          organization.name
        );
      }
    }
  }

  let collections:
    {
      id: string;
      organization_id: string;
      title: string;
      collection_type: string;
      collection_mode: string;
      currency: string;
      target_amount:
        | number
        | string
        | null;
      default_amount:
        | number
        | string
        | null;
      amount_raised:
        | number
        | string
        | null;
      join_code:
        | string
        | null;
      status: string;
      archived_at:
        | string
        | null;
    }[] = [];

  if (
    organizationIds.length >
    0
  ) {
    const {
      data,
    } =
      await supabaseAdmin
        .from("collections")
        .select(`
          id,
          organization_id,
          title,
          collection_type,
          collection_mode,
          currency,
          target_amount,
          default_amount,
          amount_raised,
          join_code,
          status,
          archived_at
        `)
        .in(
          "organization_id",
          organizationIds
        )
        .eq(
          "status",
          "active"
        )
        .is(
          "archived_at",
          null
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

    collections =
      data ?? [];
  }

  const collectionIds =
    collections.map(
      (collection) =>
        collection.id
    );

  const participantCounts =
    new Map<
      string,
      number
    >();

  if (
    collectionIds.length >
    0
  ) {
    const {
      data:
        participantRows,
    } =
      await supabaseAdmin
        .from(
          "participants"
        )
        .select(`
          collection_id
        `)
        .in(
          "collection_id",
          collectionIds
        )
        .eq(
          "is_active",
          true
        );

    for (
      const row
      of participantRows ??
      []
    ) {
      participantCounts.set(
        row.collection_id,
        (
          participantCounts.get(
            row.collection_id
          ) ?? 0
        ) + 1
      );
    }
  }

  const ajoCollections =
    collections.filter(
      (collection) =>
        collection.collection_mode ===
        "rotating_pool"
    );

  const nonAjoCollections =
    collections.filter(
      (collection) =>
        collection.collection_mode !==
        "rotating_pool"
    );

  const totalMembers =
    Array.from(
      participantCounts.values()
    ).reduce(
      (
        total,
        count
      ) =>
        total + count,
      0
    );

  return (
    <ThreepleAppShell
      title="Collector Mode"
      subtitle="Field collections"
    >
      <div className="mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--tp-primary-border)] bg-[var(--tp-primary)] text-white shadow-[var(--tp-shadow-md)]">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.25fr_.75fr] lg:p-10">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/50">
                Field Collector
              </p>

              <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                Collect on the move.
                Keep every record clear.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
                Open a collection, find a member quickly, record what was collected, and keep the field ledger ready for sync.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                {collections[0] ? (
                  <Link
                    href={`/collector/${collections[0].id}`}
                    className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-black text-[var(--tp-primary)]"
                  >
                    Start collecting
                  </Link>
                ) : (
                  <Link
                    href="/dashboard/collections/new"
                    className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-black text-[var(--tp-primary)]"
                  >
                    Create collection
                  </Link>
                )}

                <Link
                  href="/dashboard"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 text-sm font-black text-white"
                >
                  Organizer home
                </Link>
              </div>
            </div>

            <div className="rounded-[1.75rem] bg-white/10 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-white/50">
                    Device status
                  </p>

                  <p className="mt-3 text-lg font-black">
                    Online workflow ready
                  </p>
                </div>

                <span className="h-3 w-3 rounded-full bg-white" />
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/60">
                    Local offline queue
                  </span>

                  <span className="font-black text-white">
                    Coming next
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/60">
                    Sync now
                  </span>

                  <span className="font-black text-white">
                    Coming next
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/60">
                    Receipt status
                  </span>

                  <span className="font-black text-white">
                    Planned
                  </span>
                </div>
              </div>

              <p className="mt-5 text-xs leading-5 text-white/50">
                Electronic payments will still require connectivity. Cash/manual field records will get their own offline-safe lifecycle.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ThreepleStat
            label="Field collections"
            value={
              collections.length
            }
            helper="Active collections you can manage."
            tone="primary"
          />

          <ThreepleStat
            label="Ajo groups"
            value={
              ajoCollections.length
            }
            helper="Rotational collections."
            tone="warning"
          />

          <ThreepleStat
            label="Members"
            value={
              totalMembers
            }
            helper="Active participants across field collections."
            tone="success"
          />

          <ThreepleStat
            label="Offline queue"
            value="0"
            helper="Will show locally recorded items waiting to sync."
          />
        </section>

        <section className="mt-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="tp-kicker">
                Today&apos;s field work
              </p>

              <h2 className="tp-heading mt-2 text-2xl">
                Choose a collection.
              </h2>

              <p className="tp-body mt-2 max-w-2xl text-sm">
                Open the group you are collecting for. The next screen will become the fast member-search and record-contribution workspace.
              </p>
            </div>

            <Link
              href="/dashboard/collections/new"
              className="tp-btn tp-btn-secondary"
            >
              New collection
            </Link>
          </div>

          {collections.length ===
          0 ? (
            <ThreepleEmptyState
              className="mt-6"
              title="No active field collections yet"
              description="Create or activate a collection first. Once it is active and you have organizer access, it will appear here."
              action={
                <Link
                  href="/dashboard/collections/new"
                  className="tp-btn tp-btn-primary"
                >
                  Create collection
                </Link>
              }
            />
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[
                ...ajoCollections,
                ...nonAjoCollections,
              ].map(
                (
                  collection
                ) => {
                  const isAjo =
                    collection.collection_mode ===
                    "rotating_pool";

                  const memberCount =
                    participantCounts.get(
                      collection.id
                    ) ?? 0;

                  return (
                    <Link
                      key={
                        collection.id
                      }
                      href={`/collector/${collection.id}`}
                      className="tp-card tp-hover-card group p-5 sm:p-6"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <ThreepleBadge
                          tone={
                            isAjo
                              ? "warning"
                              : "primary"
                          }
                        >
                          {isAjo
                            ? "Ajo"
                            : prettyText(
                                collection.collection_mode
                              )}
                        </ThreepleBadge>

                        <span className="text-xs font-black text-[var(--tp-muted)]">
                          {memberCount}{" "}
                          {memberCount ===
                          1
                            ? "member"
                            : "members"}
                        </span>
                      </div>

                      <h3 className="tp-heading mt-5 text-xl transition group-hover:text-[var(--tp-primary)]">
                        {collection.title}
                      </h3>

                      <p className="mt-2 text-sm text-[var(--tp-muted)]">
                        {organizationNameMap.get(
                          collection.organization_id
                        ) ??
                          "Organizer workspace"}
                      </p>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-[var(--tp-bg-soft)] p-4">
                          <p className="text-xs text-[var(--tp-muted)]">
                            {isAjo
                              ? "Per cycle"
                              : "Base amount"}
                          </p>

                          <p className="mt-1 text-sm font-black">
                            {money(
                              collection.default_amount,
                              collection.currency
                            )}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-[var(--tp-bg-soft)] p-4">
                          <p className="text-xs text-[var(--tp-muted)]">
                            Threeple Code
                          </p>

                          <p className="mt-1 truncate font-mono text-sm font-black tracking-wider text-[var(--tp-primary)]">
                            {collection.join_code ??
                              "—"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--tp-border)] pt-4">
                        <span className="text-sm font-black text-[var(--tp-primary)]">
                          Open collector workspace
                        </span>

                        <span className="text-lg text-[var(--tp-primary)]">
                          →
                        </span>
                      </div>
                    </Link>
                  );
                }
              )}
            </div>
          )}
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="tp-card p-6">
            <p className="tp-kicker">
              01
            </p>

            <h3 className="tp-heading mt-2 text-lg">
              Find the member
            </h3>

            <p className="tp-body mt-2 text-sm">
              Search by name or phone with large one-hand-friendly controls.
            </p>
          </div>

          <div className="tp-card p-6">
            <p className="tp-kicker">
              02
            </p>

            <h3 className="tp-heading mt-2 text-lg">
              Record contribution
            </h3>

            <p className="tp-body mt-2 text-sm">
              Record cash/manual collection separately from verified electronic payment.
            </p>
          </div>

          <div className="tp-card p-6">
            <p className="tp-kicker">
              03
            </p>

            <h3 className="tp-heading mt-2 text-lg">
              Receipt + sync
            </h3>

            <p className="tp-body mt-2 text-sm">
              Issue an immediate local receipt, then reconcile the event with Threeple when online.
            </p>
          </div>
        </section>
      </div>
    </ThreepleAppShell>
  );
}
