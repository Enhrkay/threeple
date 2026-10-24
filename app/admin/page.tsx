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
      <section className="overflow-hidden rounded-[2rem] border border-[var(--tp-primary-border)] bg-[var(--tp-primary)] text-white shadow-[var(--tp-shadow-md)]">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.25fr_.75fr] lg:p-10">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-white/50">
              Threeple Operations
            </p>

            <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">
              See the platform clearly.
              Act carefully.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
              Monitor people, organizations, collections and trust activity from one operational workspace.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/admin/users"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-black text-[var(--tp-primary)]"
              >
                Review users
              </Link>

              <Link
                href="/admin/trust-safety"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 text-sm font-black text-white"
              >
                Trust & Safety
              </Link>
            </div>
          </div>

          <div className="rounded-[1.75rem] bg-white/10 p-6">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-white/50">
              Attention
            </p>

            <div className="mt-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-4xl font-black">
                  {openCases}
                </p>

                <p className="mt-1 text-sm text-white/65">
                  active safety cases
                </p>
              </div>

              {urgentCases >
                0 && (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[var(--tp-danger)]">
                  {urgentCases} urgent
                </span>
              )}
            </div>

            <p className="mt-5 text-xs leading-5 text-white/55">
              Administrative actions should remain traceable and proportionate to the issue being reviewed.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ThreepleStat
          label="Users"
          value={
            totalUsers
          }
          helper="Registered Threeple profiles."
          tone="primary"
        />

        <ThreepleStat
          label="Organizations"
          value={
            totalOrganizations
          }
          helper="Organizer workspaces on the platform."
        />

        <ThreepleStat
          label="Collections"
          value={
            totalCollections
          }
          helper={`${activeCollections} active right now.`}
          tone="success"
        />

        <ThreepleStat
          label="Participants"
          value={
            totalParticipants
          }
          helper="Participant records across collections."
          tone="warning"
        />
      </section>

      <section className="mt-8">
        <div>
          <p className="tp-kicker">
            Operations
          </p>

          <h2 className="tp-heading mt-2 text-2xl">
            Platform controls.
          </h2>

          <p className="tp-body mt-2 max-w-2xl text-sm">
            Use focused operational areas instead of managing everything from one overloaded screen.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Link
            href="/admin/users"
            className="tp-card tp-hover-card p-6"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--tp-primary-soft)] font-black text-[var(--tp-primary)]">
              U
            </div>

            <h3 className="tp-heading mt-5 text-lg">
              Users
            </h3>

            <p className="tp-body mt-2 text-sm">
              Review profiles, participation and account-level administrative state.
            </p>

            <p className="mt-5 text-sm font-black text-[var(--tp-primary)]">
              Open user directory
            </p>
          </Link>

          <Link
            href="/admin/organizations"
            className="tp-card tp-hover-card p-6"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--tp-info-soft)] font-black text-[var(--tp-info)]">
              O
            </div>

            <h3 className="tp-heading mt-5 text-lg">
              Organizations
            </h3>

            <p className="tp-body mt-2 text-sm">
              Inspect organizer workspaces, ownership, members and settlement state.
            </p>

            <p className="mt-5 text-sm font-black text-[var(--tp-primary)]">
              Open organizations
            </p>
          </Link>

          <Link
            href="/admin/collections"
            className="tp-card tp-hover-card p-6"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--tp-success-soft)] font-black text-[var(--tp-success)]">
              C
            </div>

            <h3 className="tp-heading mt-5 text-lg">
              Collections
            </h3>

            <p className="tp-body mt-2 text-sm">
              Review contribution models, organizers, status and collection-level controls.
            </p>

            <p className="mt-5 text-sm font-black text-[var(--tp-primary)]">
              Open collection directory
            </p>
          </Link>

          <Link
            href="/admin/trust-safety"
            className="tp-card tp-hover-card p-6"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--tp-warning-soft)] font-black text-[var(--tp-warning)]">
              T
            </div>

            <h3 className="tp-heading mt-5 text-lg">
              Trust & Safety
            </h3>

            <p className="tp-body mt-2 text-sm">
              Review reports, investigations, restrictions and resolution history.
            </p>

            <p className="mt-5 text-sm font-black text-[var(--tp-primary)]">
              Review cases
            </p>
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_.6fr]">
        <div className="tp-card p-5 sm:p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="tp-kicker">
                Trust & Safety
              </p>

              <h2 className="tp-heading mt-2 text-xl">
                Recent cases
              </h2>
            </div>

            <Link
              href="/admin/trust-safety"
              className="text-sm font-black text-[var(--tp-primary)]"
            >
              View all
            </Link>
          </div>

          {recentCases.length ===
          0 ? (
            <div className="mt-6 rounded-2xl bg-[var(--tp-bg-soft)] p-6 text-sm text-[var(--tp-muted)]">
              No Trust & Safety cases are currently available.
            </div>
          ) : (
            <div className="mt-5 divide-y divide-[var(--tp-border)]">
              {recentCases.map(
                (item) => (
                  <Link
                    key={
                      item.id
                    }
                    href={`/admin/trust-safety/${item.id}`}
                    className="flex flex-col gap-3 py-4 transition first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-black text-[var(--tp-ink)]">
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

        <div className="tp-card p-6">
          <p className="tp-kicker">
            Admin principle
          </p>

          <h2 className="tp-heading mt-2 text-xl">
            Protect history.
          </h2>

          <p className="tp-body mt-3 text-sm">
            Collection and user deletion should preserve financial and audit records where required. Normal operations should prefer archive, deactivate or anonymize over destructive removal.
          </p>

          <div className="mt-5 rounded-2xl bg-[var(--tp-danger-soft)] p-4 text-sm leading-6 text-[var(--tp-danger)]">
            Permanent destructive actions should remain restricted and explicitly confirmed.
          </div>
        </div>
      </section>
    </ThreepleAppShell>
  );
}
