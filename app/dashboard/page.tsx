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
  ThreepleLinkButton,
  ThreepleProgress,
  ThreepleStat,
} from "@/components/threeple/design-system";

export const instant = false;

function friendlyText(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "â€”";
  }

  return value
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
}

function money(
  value:
    | number
    | string
    | null
    | undefined,
  currency = "NGN"
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "â€”";
  }

  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return "â€”";
  }

  try {
    return new Intl.NumberFormat(
      "en-NG",
      {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }
    ).format(number);
  } catch {
    return `${currency} ${number.toLocaleString()}`;
  }
}

function dateLabel(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "No deadline";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "No deadline";
  }

  return date.toLocaleDateString(
    "en-NG",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function badgeTone(
  status: string
):
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger" {
  switch (status) {
    case "active":
      return "success";
    case "draft":
      return "warning";
    case "cancelled":
      return "danger";
    case "closed":
      return "neutral";
    default:
      return "primary";
  }
}

export default async function DashboardPage() {
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
      "/auth/login?next=/dashboard"
    );
  }

  const email =
    typeof claimsData?.claims?.email ===
      "string"
      ? claimsData.claims.email
      : "";

  const firstName =
    email
      ? email
          .split("@")[0]
          .split(/[._-]/)[0]
      : "there";

  const {
    data: ownedOrganizations,
  } = await supabase
    .from("organizations")
    .select(`
      id,
      name,
      owner_id
    `)
    .eq(
      "owner_id",
      userId
    );

  const {
    data: memberships,
  } = await supabase
    .from("organization_members")
    .select(`
      organization_id,
      role
    `)
    .eq(
      "user_id",
      userId
    );

  const organizationIds =
    Array.from(
      new Set([
        ...(
          ownedOrganizations ??
          []
        ).map(
          (item) =>
            item.id
        ),
        ...(
          memberships ??
          []
        ).map(
          (item) =>
            item.organization_id
        ),
      ])
    );

  let collections: Array<{
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
    status: string;
    deadline: string | null;
    archived_at: string | null;
    created_at: string;
    join_code: string | null;
  }> = [];

  if (
    organizationIds.length >
    0
  ) {
    const {
      data,
    } = await supabase
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
        status,
        deadline,
        archived_at,
        created_at,
        join_code
      `)
      .in(
        "organization_id",
        organizationIds
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

  const activeCollections =
    collections.filter(
      (collection) =>
        collection.status ===
          "active" &&
        !collection.archived_at
    );

  const draftCollections =
    collections.filter(
      (collection) =>
        collection.status ===
          "draft" &&
        !collection.archived_at
    );

  const ajoCollections =
    collections.filter(
      (collection) =>
        collection.collection_mode ===
          "rotating_pool" &&
        !collection.archived_at
    );

  const ownedOrganizationIds =
    new Set(
      (ownedOrganizations ?? []).map(
        (organization) =>
          organization.id
      )
    );

  const ownedCollectionIds =
    collections
      .filter(
        (collection) =>
          ownedOrganizationIds.has(
            collection.organization_id
          ) &&
          !collection.archived_at
      )
      .map(
        (collection) =>
          collection.id
      );

  let settlementReady =
    false;

  if (
    ownedCollectionIds.length >
    0
  ) {
    const {
      data: beneficiaries,
    } = await supabaseAdmin
      .from(
        "collection_beneficiaries"
      )
      .select(
        "settlement_profile_id"
      )
      .in(
        "collection_id",
        ownedCollectionIds
      )
      .eq(
        "beneficiary_role",
        "primary"
      )
      .eq(
        "is_active",
        true
      );

    const settlementProfileIds =
      Array.from(
        new Set(
          (beneficiaries ?? [])
            .map(
              (beneficiary) =>
                beneficiary
                  .settlement_profile_id
            )
            .filter(
              (profileId):
                profileId is string =>
                  Boolean(profileId)
            )
        )
      );

    if (
      settlementProfileIds.length >
      0
    ) {
      const {
        data: settlementProfiles,
      } = await supabaseAdmin
        .from(
          "settlement_profiles"
        )
        .select(`
          id,
          provider,
          provider_recipient_reference,
          verification_status,
          is_active
        `)
        .in(
          "id",
          settlementProfileIds
        );

      settlementReady =
        (settlementProfiles ?? [])
          .some(
            (profile) =>
              profile.is_active ===
                true &&
              profile.provider ===
                "paystack" &&
              Boolean(
                profile
                  .provider_recipient_reference
                  ?.startsWith(
                    "ACCT_"
                  )
              ) &&
              [
                "provider_connected",
                "provider_verified",
              ].includes(
                profile
                  .verification_status
              )
          );
    }
  }

  const recentCollections =
    collections
      .filter(
        (collection) =>
          !collection.archived_at
      )
      .slice(
        0,
        6
      );

  return (
    <ThreepleAppShell
      title="Home"
      subtitle="Your Threeple workspace"
      actions={
        <ThreepleLinkButton
          href="/dashboard/collections/new"
          className="hidden sm:inline-flex"
        >
          Create collection
        </ThreepleLinkButton>
      }
    >
      <section className="mb-8">
        <p className="text-sm font-semibold text-[var(--tp-primary)]">
          Welcome back,{" "}
          <span className="capitalize">
            {firstName}
          </span>
        </p>

        <h1 className="mt-2 max-w-3xl text-3xl font-black tracking-[-0.04em] text-[var(--tp-ink)] sm:text-4xl">
          Your collections,
          clearly organized.
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--tp-muted)] sm:text-base">
          Track what is active,
          what needs attention,
          and the collections you are
          currently managing.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ThreepleStat
          label="Active"
          value={activeCollections.length}
          helper="Collections currently running."
          tone="success"
        />

        <ThreepleStat
          label="Drafts"
          value={draftCollections.length}
          helper="Collections still being prepared."
          tone="neutral"
        />

        <ThreepleStat
          label="Ajo groups"
          value={ajoCollections.length}
          helper="Rotational contribution groups."
          tone="primary"
        />

        <ThreepleStat
          label="Settlement"
          value={
            settlementReady
              ? "Connected"
              : "Not connected"
          }
          helper={
            settlementReady
              ? "Settlement is ready."
              : "Settlement is not yet connected."
          }
          tone={
            settlementReady
              ? "success"
              : "neutral"
          }
        />
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-6 border-b border-[var(--tp-border)] pb-5">
          <div>
            <p className="tp-kicker">
              Collections
            </p>

            <h2 className="tp-heading mt-2 text-2xl sm:text-3xl">
              Your workspace
            </h2>

            <p className="tp-body mt-2 max-w-2xl text-sm">
              Open a collection to manage
              participants, contributions,
              cycles and activity.
            </p>
          </div>

          {recentCollections.length > 0 && (
            <span className="hidden text-sm font-semibold text-[var(--tp-muted)] sm:block">
              {recentCollections.length} recent
            </span>
          )}
        </div>

        {recentCollections.length === 0 ? (
          <ThreepleEmptyState
            className="mt-6"
            title="No collections yet"
            description="Create your first collection and Threeple will keep the people, contribution rules and progress together."
            action={
              <ThreepleLinkButton href="/dashboard/collections/new">
                Create your first collection
              </ThreepleLinkButton>
            }
          />
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recentCollections.map(
              (collection) => {
                const isAjo =
                  collection.collection_mode ===
                  "rotating_pool";

                const isGoal =
                  collection.collection_mode ===
                    "target" ||
                  collection.collection_mode ===
                    "flexible";

                const target =
                  collection.target_amount !== null
                    ? Number(
                        collection.target_amount
                      )
                    : 0;

                const raised =
                  collection.amount_raised !== null
                    ? Number(
                        collection.amount_raised
                      )
                    : 0;

                const progress =
                  target > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (raised / target) * 100
                        )
                      )
                    : 0;

                const href =
                  isAjo
                    ? `/dashboard/collections/${collection.id}/rotation`
                    : `/dashboard/collections/${collection.id}`;

                return (
                  <Link
                    key={collection.id}
                    href={href}
                    className="group tp-card block overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--tp-primary-border)] hover:shadow-[var(--tp-shadow-md)]"
                  >
                    <div className="p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <ThreepleBadge
                            tone={
                              badgeTone(
                                collection.status
                              )
                            }
                          >
                            {friendlyText(
                              collection.status
                            )}
                          </ThreepleBadge>

                          <h3 className="tp-heading mt-4 truncate text-xl">
                            {collection.title}
                          </h3>

                          <p className="tp-muted mt-1.5 text-sm">
                            {isAjo
                              ? "Ajo"
                              : isGoal
                                ? "Goal"
                                : "Fixed"}
                            {" Â· "}
                            {dateLabel(
                              collection.deadline
                            )}
                          </p>
                        </div>

                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--tp-primary-soft)] text-sm font-black text-[var(--tp-primary)] transition group-hover:bg-[var(--tp-primary)] group-hover:text-white">
                          â†’
                        </span>
                      </div>

                      {isGoal ? (
                        <div className="mt-6">
                          <ThreepleProgress
                            value={progress}
                            label={`${money(
                              raised,
                              collection.currency
                            )} raised`}
                            helper={`${progress}%`}
                          />

                          <p className="tp-muted mt-2 text-xs">
                            Goal:{" "}
                            {money(
                              target,
                              collection.currency
                            )}
                          </p>
                        </div>
                      ) : (
                        <div className="mt-6 border-t border-[var(--tp-border)] pt-5">
                          <p className="tp-kicker">
                            {isAjo
                              ? "Per cycle"
                              : "Per person"}
                          </p>

                          <p className="tp-heading mt-2 text-lg">
                            {money(
                              collection.default_amount,
                              collection.currency
                            )}
                          </p>
                        </div>
                      )}

                      {collection.join_code && (
                        <p className="mt-5 text-xs font-semibold text-[var(--tp-muted)]">
                          Code {collection.join_code}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              }
            )}
          </div>
        )}
      </section>
    </ThreepleAppShell>
  );
}
