import Link from "next/link";

import {
  requirePlatformAdmin,
} from "@/lib/admin/server";

import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

import {
  ThreepleAppShell,
} from "@/components/threeple/app-shell";

import {
  ThreepleBadge,
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

function caseTone(
  value: string
):
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger" {
  switch (value) {
    case "urgent":
    case "action_required":
      return "danger";

    case "high":
    case "under_review":
      return "warning";

    case "resolved":
      return "success";

    case "open":
      return "primary";

    default:
      return "neutral";
  }
}

export default async function AdminHomePage() {
  const admin =
    await requirePlatformAdmin();

  const [
    usersResult,
    organizationsResult,
    collectionsResult,
    activeCollectionsResult,
    participantsResult,
    openCasesResult,
    urgentCasesResult,
    recentCasesResult,
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
      .in(
        "status",
        [
          "open",
          "under_review",
          "action_required",
        ]
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
        reporter_name,
        created_at
      `)
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(5),
  ]);

  const totalUsers =
    usersResult.count ?? 0;

  const totalOrganizations =
    organizationsResult.count ??
    0;

  const totalCollections =
    collectionsResult.count ??
    0;

  const activeCollections =
    activeCollectionsResult.count ??
    0;

  const totalParticipants =
    participantsResult.count ??
    0;

  const openCases =
    openCasesResult.count ??
    0;

  const urgentCases =
    urgentCasesResult.count ??
    0;

  const recentCases =
    recentCasesResult.data ??
    [];

  return (
    <ThreepleAppShell
      mode="admin"
      title="Operations Overview"
      subtitle="Threeple platform administration"
      status={
        <ThreepleBadge tone="primary">
          {friendlyText(
            admin.role
          )}
        </ThreepleBadge>
      }
    >
      {/* INTRO */}
      <section className="mb-8">
        <p className="text-sm font-semibold text-[var(--tp-primary)]">
          Operations
        </p>

        <h1 className="mt-2 max-w-3xl text-3xl font-black tracking-[-0.04em] text-[var(--tp-ink)] sm:text-4xl">
          Platform overview
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--tp-muted)] sm:text-base">
          Monitor platform activity,
          growth and issues that need
          administrative attention.
        </p>
      </section>

      {/* PLATFORM METRICS */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ThreepleStat
          label="Users"
          value={totalUsers}
          helper="Registered profiles."
          tone="primary"
        />

        <ThreepleStat
          label="Organizations"
          value={totalOrganizations}
          helper="Organizer workspaces."
          tone="neutral"
        />

        <ThreepleStat
          label="Collections"
          value={totalCollections}
          helper={`${activeCollections} currently active.`}
          tone="success"
        />

        <ThreepleStat
          label="Participants"
          value={totalParticipants}
          helper="Across all collections."
          tone="neutral"
        />
      </section>

      {/* ATTENTION */}
      <section className="mt-10 grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <div className="tp-card p-6 sm:p-7">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="tp-kicker">
                Attention
              </p>

              <h2 className="tp-heading mt-2 text-2xl">
                Cases requiring review
              </h2>
            </div>

            {urgentCases > 0 && (
              <ThreepleBadge tone="danger">
                {urgentCases} urgent
              </ThreepleBadge>
            )}
          </div>

          <div className="mt-8">
            <p className="text-5xl font-black tracking-[-0.05em] text-[var(--tp-ink)]">
              {openCases}
            </p>

            <p className="mt-2 text-sm text-[var(--tp-muted)]">
              Open or active Trust & Safety cases
            </p>
          </div>

          <div className="mt-7 border-t border-[var(--tp-border)] pt-5">
            <Link
              href="/admin/trust-safety"
              className="text-sm font-bold text-[var(--tp-primary)] transition hover:text-[var(--tp-primary-hover)]"
            >
              Review outstanding cases →
            </Link>
          </div>
        </div>

        {/* RECENT CASES */}
        <div className="tp-card p-6 sm:p-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="tp-kicker">
                Recent activity
              </p>

              <h2 className="tp-heading mt-2 text-2xl">
                Latest safety cases
              </h2>
            </div>

            {recentCases.length > 0 && (
              <Link
                href="/admin/trust-safety"
                className="hidden text-sm font-bold text-[var(--tp-primary)] sm:block"
              >
                View all
              </Link>
            )}
          </div>

          {recentCases.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-[var(--tp-border)] bg-[var(--tp-bg-soft)] p-6">
              <p className="text-sm text-[var(--tp-muted)]">
                No Trust & Safety cases
                are currently available.
              </p>
            </div>
          ) : (
            <div className="mt-6 divide-y divide-[var(--tp-border)]">
              {recentCases.map(
                (item) => (
                  <Link
                    key={item.id}
                    href={`/admin/trust-safety/${item.id}`}
                    className="group flex flex-col gap-3 py-4 transition first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold text-[var(--tp-ink)] transition group-hover:text-[var(--tp-primary)]">
                        {item.report_reference}
                      </p>

                      <p className="mt-1 truncate text-sm text-[var(--tp-muted)]">
                        {friendlyText(
                          item.category
                        )}
                        {item.reporter_name
                          ? ` · ${item.reporter_name}`
                          : ""}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <ThreepleBadge
                        tone={
                          caseTone(
                            item.priority
                          )
                        }
                      >
                        {friendlyText(
                          item.priority
                        )}
                      </ThreepleBadge>

                      <ThreepleBadge
                        tone={
                          caseTone(
                            item.status
                          )
                        }
                      >
                        {friendlyText(
                          item.status
                        )}
                      </ThreepleBadge>
                    </div>
                  </Link>
                )
              )}
            </div>
          )}
        </div>
      </section>

      {/* ADMIN NOTE */}
      <section className="mt-6 border-t border-[var(--tp-border)] pt-6">
        <p className="max-w-3xl text-xs leading-6 text-[var(--tp-muted)]">
          Administrative actions should
          preserve financial history and
          remain traceable. Archive,
          deactivate or anonymize records
          where appropriate instead of
          destructive removal.
        </p>
      </section>
    </ThreepleAppShell>
  );
}
