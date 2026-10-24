import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

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
    return "—";
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
    return "—";
  }

  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return "—";
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
      owner_id,
      settlement_status
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

  const settlementReady =
    (ownedOrganizations ??
      []).some(
      (organization) =>
        organization.settlement_status ===
        "active"
    );

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
      <section className="overflow-hidden rounded-[2rem] border border-[var(--tp-primary-border)] bg-[var(--tp-primary)] text-white shadow-[var(--tp-shadow-md)]">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.25fr_.75fr] lg:p-10">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-white/55">
              Threeple home
            </p>

            <h1 className="mt-3 max-w-2xl text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">
              Welcome back,{" "}
              <span className="capitalize">
                {firstName}
              </span>
              .
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
              Create a contribution, join one with a code, or see everything you are already managing in one place.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard/collections/new"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-black text-[var(--tp-primary)] transition hover:bg-white/90"
              >
                Create a collection
              </Link>

              <Link
                href="/join"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 text-sm font-black text-white transition hover:bg-white/15"
              >
                Join with a code
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Link
              href="/my-collections"
              className="rounded-2xl bg-white/10 p-5 transition hover:bg-white/15"
            >
              <p className="text-xs font-black uppercase tracking-wide text-white/45">
                Participant workspace
              </p>

              <p className="mt-2 text-lg font-black">
                My Collections
              </p>

              <p className="mt-2 text-sm leading-6 text-white/60">
                Open collections you have joined and check your contribution status.
              </p>
            </Link>

            <div className="rounded-2xl bg-white/10 p-5">
              <p className="text-xs font-black uppercase tracking-wide text-white/45">
                Field ready
              </p>

              <p className="mt-2 text-lg font-black">
                Phone · Tablet · Desktop
              </p>

              <p className="mt-2 text-sm leading-6 text-white/60">
                Collector Mode and offline sync will connect here in a later phase.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ThreepleStat
          label="Active"
          value={
            activeCollections.length
          }
          helper="Collections currently running."
          tone="success"
        />

        <ThreepleStat
          label="Drafts"
          value={
            draftCollections.length
          }
          helper="Collections still being prepared."
          tone="warning"
        />

        <ThreepleStat
          label="Ajo groups"
          value={
            ajoCollections.length
          }
          helper="Rotational contribution collections."
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
              ? "At least one organizer workspace is settlement-ready."
              : "Connect settlement before accepting electronic payments."
          }
          tone={
            settlementReady
              ? "success"
              : "neutral"
          }
        />
      </section>

      <section className="mt-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="tp-kicker">
              Your collections
            </p>

            <h2 className="tp-heading mt-2 text-2xl sm:text-3xl">
              Keep everyone aligned.
            </h2>

            <p className="tp-body mt-2 max-w-2xl text-sm">
              Open a collection to manage people, progress, transparency, Ajo rounds and contribution activity.
            </p>
          </div>

          <ThreepleLinkButton
            href="/dashboard/collections/new"
            variant="secondary"
          >
            New collection
          </ThreepleLinkButton>
        </div>

        {recentCollections.length ===
        0 ? (
          <ThreepleEmptyState
            className="mt-6"
            title="No organizer collections yet"
            description="Create your first contribution collection, Ajo group or shared goal. Threeple will keep the people, rules and progress together."
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
                  collection.target_amount !==
                  null
                    ? Number(
                        collection.target_amount
                      )
                    : 0;

                const raised =
                  collection.amount_raised !==
                  null
                    ? Number(
                        collection.amount_raised
                      )
                    : 0;

                const progress =
                  target > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (
                            raised /
                            target
                          ) *
                            100
                        )
                      )
                    : 0;

                const href =
                  isAjo
                    ? `/dashboard/collections/${collection.id}/rotation`
                    : `/dashboard/collections/${collection.id}`;

                return (
                  <Link
                    key={
                      collection.id
                    }
                    href={href}
                    className="tp-card tp-hover-card block overflow-hidden"
                  >
                    <div
                      className={[
                        "h-2",
                        isAjo
                          ? "bg-[var(--tp-warning)]"
                          : isGoal
                            ? "bg-[var(--tp-primary)]"
                            : "bg-[var(--tp-success)]",
                      ].join(" ")}
                    />

                    <div className="p-5 sm:p-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
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

                        <span className="text-xs font-bold text-[var(--tp-muted)]">
                          {isAjo
                            ? "Ajo"
                            : isGoal
                              ? "Goal"
                              : "Fixed"}
                        </span>
                      </div>

                      <h3 className="tp-heading mt-5 text-xl">
                        {collection.title}
                      </h3>

                      <p className="tp-muted mt-2 text-sm">
                        {friendlyText(
                          collection.collection_type
                        )}
                        {" · "}
                        {dateLabel(
                          collection.deadline
                        )}
                      </p>

                      {isGoal ? (
                        <div className="mt-6">
                          <ThreepleProgress
                            value={
                              progress
                            }
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
                        <div className="mt-6 rounded-2xl bg-[var(--tp-bg-soft)] p-4">
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

                      <div className="mt-5 flex items-center justify-between border-t border-[var(--tp-border)] pt-4">
                        <span className="text-xs font-bold text-[var(--tp-muted)]">
                          {collection.join_code
                            ? `Code ${collection.join_code}`
                            : "Collection"}
                        </span>

                        <span className="text-sm font-black text-[var(--tp-primary)]">
                          Open
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              }
            )}
          </div>
        )}
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <Link
          href="/join"
          className="tp-card tp-hover-card p-6"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--tp-primary-soft)] font-black text-[var(--tp-primary)]">
            J
          </div>

          <h3 className="tp-heading mt-5 text-lg">
            Join a collection
          </h3>

          <p className="tp-body mt-2 text-sm">
            Enter a Threeple Code and join a contribution in a few steps.
          </p>
        </Link>

        <Link
          href="/my-collections"
          className="tp-card tp-hover-card p-6"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--tp-success-soft)] font-black text-[var(--tp-success)]">
            M
          </div>

          <h3 className="tp-heading mt-5 text-lg">
            My Collections
          </h3>

          <p className="tp-body mt-2 text-sm">
            See every collection you joined and return to your participant workspace.
          </p>
        </Link>

        <Link
          href="/dashboard/settlement"
          className="tp-card tp-hover-card p-6"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--tp-warning-soft)] font-black text-[var(--tp-warning)]">
            S
          </div>

          <h3 className="tp-heading mt-5 text-lg">
            Settlement
          </h3>

          <p className="tp-body mt-2 text-sm">
            Manage the account used for organizer settlement on supported payments.
          </p>
        </Link>
      </section>
    </ThreepleAppShell>
  );
}
