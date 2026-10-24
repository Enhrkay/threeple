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
    organizationId: string;
  }>;
};

function friendlyText(
  value: string | null | undefined
) {
  if (!value) return "—";

  return value
    .replaceAll("_", " ")
    .replaceAll(".", " ")
    .replace(/\\b\\w/g, (character) =>
      character.toUpperCase()
    );
}

function formatDateTime(
  value: string | null | undefined
) {
  if (!value) return "—";

  return new Intl.DateTimeFormat(
    "en-NG",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Lagos",
    }
  ).format(new Date(value));
}

export default async function AdminOrganizationPage({
  params,
}: PageProps) {
  await requirePlatformAdmin();

  const { organizationId } =
    await params;

  const {
    data: organization,
    error: organizationError,
  } = await supabaseAdmin
    .from("organizations")
    .select(`
      id,
      owner_id,
      name,
      organization_type,
      slug,
      created_at,
      updated_at
    `)
    .eq("id", organizationId)
    .maybeSingle();

  if (
    organizationError ||
    !organization
  ) {
    notFound();
  }

  const [
    ownerResult,
    collectionsResult,
    membersResult,
    activeRestrictionResult,
    restrictionHistoryResult,
    trustSafetyResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select(`
        id,
        full_name,
        phone
      `)
      .eq("id", organization.owner_id)
      .maybeSingle(),

    supabaseAdmin
      .from("collections")
      .select(`
        id,
        title,
        status,
        join_code,
        collection_type,
        collection_mode,
        archived_at,
        created_at
      `)
      .eq(
        "organization_id",
        organization.id
      )
      .order(
        "created_at",
        { ascending: false }
      ),

    supabaseAdmin
      .from("organization_members")
      .select(`
        user_id,
        role,
        created_at
      `)
      .eq(
        "organization_id",
        organization.id
      )
      .order(
        "created_at",
        { ascending: true }
      ),

    supabaseAdmin
      .from("organization_restrictions")
      .select(`
        id,
        trust_safety_report_id,
        restriction_type,
        reason,
        imposed_by,
        imposed_at
      `)
      .eq(
        "organization_id",
        organization.id
      )
      .is("lifted_at", null)
      .order(
        "imposed_at",
        { ascending: false }
      )
      .limit(1)
      .maybeSingle(),

    supabaseAdmin
      .from("organization_restrictions")
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
        "organization_id",
        organization.id
      )
      .order(
        "imposed_at",
        { ascending: false }
      )
      .limit(20),

    supabaseAdmin
      .from("trust_safety_reports")
      .select(`
        id,
        report_reference,
        category,
        priority,
        status,
        created_at
      `)
      .eq("subject_type", "organization")
      .eq("subject_id", organization.id)
      .order(
        "created_at",
        { ascending: false }
      )
      .limit(20),
  ]);

  const owner =
    ownerResult.data ?? null;

  const collections =
    collectionsResult.data ?? [];

  const members =
    membersResult.data ?? [];

  const activeRestriction =
    activeRestrictionResult.data ??
    null;

  const restrictionHistory =
    restrictionHistoryResult.data ??
    [];

  const trustSafetyCases =
    trustSafetyResult.data ?? [];

  const activeCollections =
    collections.filter(
      (collection) =>
        collection.status === "active" &&
        !collection.archived_at
    ).length;

  const archivedCollections =
    collections.filter(
      (collection) =>
        Boolean(collection.archived_at)
    ).length;

  return (
    <main className="min-h-screen bg-[var(--tp-bg-soft)] text-neutral-950">
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link
            href="/admin"
            className="font-semibold text-[var(--tp-muted)] hover:text-neutral-950"
          >
            Admin
          </Link>

          <span className="text-neutral-300">/</span>

          <Link
            href="/admin/trust-safety"
            className="font-semibold text-[var(--tp-muted)] hover:text-neutral-950"
          >
            Trust & Safety
          </Link>

          <span className="text-neutral-300">/</span>

          <span className="font-semibold">
            Organization
          </span>
        </div>

        <section className="mt-6 rounded-[2rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] shadow-[var(--tp-shadow-sm)] p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--tp-faint)]">
                Organization
              </p>

              <h1 className="mt-3 text-3xl font-black tracking-tight tracking-tight">
                {organization.name}
              </h1>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-[var(--tp-bg-soft)] px-3 py-1 text-xs font-semibold text-[var(--tp-ink-soft)]">
                  {friendlyText(
                    organization.organization_type
                  )}
                </span>

                {activeRestriction ? (
                  <span className="rounded-full bg-red-700 px-3 py-1 text-xs font-semibold text-white">
                    Restricted
                  </span>
                ) : (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                    No Active Restriction
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-2xl border bg-[var(--tp-bg-soft)] p-5 lg:min-w-[260px]">
              <p className="text-xs uppercase tracking-wide text-[var(--tp-faint)]">
                Organization ID
              </p>

              <p className="mt-2 break-all font-mono text-xs text-[var(--tp-ink-soft)]">
                {organization.id}
              </p>

              <p className="mt-4 text-xs uppercase tracking-wide text-[var(--tp-faint)]">
                Created
              </p>

              <p className="mt-2 text-sm font-semibold">
                {formatDateTime(
                  organization.created_at
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

            <h2 className="mt-2 text-xl font-black tracking-tight text-red-950">
              Organization Restricted
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
                  <p className="mt-2 font-semibold text-red-950">—</p>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-red-200 bg-white/70 p-5">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-red-700">
                Reason
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-red-900">
                {activeRestriction.reason}
              </p>
            </div>
          </section>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[1.5rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] shadow-[var(--tp-shadow-sm)] p-5">
            <p className="text-xs uppercase tracking-wide text-[var(--tp-faint)]">
              Collections
            </p>
            <p className="mt-3 text-2xl font-black tracking-tight">
              {collections.length}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] shadow-[var(--tp-shadow-sm)] p-5">
            <p className="text-xs uppercase tracking-wide text-[var(--tp-faint)]">
              Active Collections
            </p>
            <p className="mt-3 text-2xl font-black tracking-tight">
              {activeCollections}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] shadow-[var(--tp-shadow-sm)] p-5">
            <p className="text-xs uppercase tracking-wide text-[var(--tp-faint)]">
              Archived
            </p>
            <p className="mt-3 text-2xl font-black tracking-tight">
              {archivedCollections}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] shadow-[var(--tp-shadow-sm)] p-5">
            <p className="text-xs uppercase tracking-wide text-[var(--tp-faint)]">
              Members
            </p>
            <p className="mt-3 text-2xl font-black tracking-tight">
              {members.length}
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] shadow-[var(--tp-shadow-sm)] p-6 md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
            Ownership
          </p>
          <h2 className="mt-2 text-xl font-black tracking-tight">
            Organization Owner
          </h2>

          <div className="mt-6">
            <p className="font-semibold">
              {owner?.full_name || "Unknown User"}
            </p>
            <p className="mt-1 font-mono text-xs text-[var(--tp-muted)]">
              {organization.owner_id}
            </p>

            <Link
              href={`/admin/users/${organization.owner_id}`}
              className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-[var(--tp-border-strong)] px-4 text-sm font-semibold hover:bg-[var(--tp-bg-soft)]"
            >
              View Owner →
            </Link>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] shadow-[var(--tp-shadow-sm)] p-6 md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
            Collections
          </p>
          <h2 className="mt-2 text-xl font-black tracking-tight">
            Organization Collections
          </h2>

          {collections.length === 0 ? (
            <p className="mt-6 text-sm text-[var(--tp-muted)]">
              No Collections found for this organization.
            </p>
          ) : (
            <div className="mt-6 tp-scroll-x">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-[var(--tp-faint)]">
                    <th className="pb-3 pr-4">Collection</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Type</th>
                    <th className="pb-3 pr-4">Join Code</th>
                    <th className="pb-3">Created</th>
                  </tr>
                </thead>

                <tbody>
                  {collections.map((collection) => (
                    <tr
                      key={collection.id}
                      className="border-b last:border-0"
                    >
                      <td className="py-4 pr-4">
                        <Link
                          href={`/admin/collections/${collection.id}`}
                          className="font-semibold hover:underline"
                        >
                          {collection.title}
                        </Link>
                      </td>
                      <td className="py-4 pr-4">
                        {collection.archived_at
                          ? "Archived"
                          : friendlyText(collection.status)}
                      </td>
                      <td className="py-4 pr-4">
                        {friendlyText(collection.collection_type)}
                      </td>
                      <td className="py-4 pr-4 font-mono text-xs">
                        {collection.join_code || "—"}
                      </td>
                      <td className="py-4">
                        {formatDateTime(collection.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-8 rounded-[2rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] shadow-[var(--tp-shadow-sm)] p-6 md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
            Trust & Safety
          </p>
          <h2 className="mt-2 text-xl font-black tracking-tight">
            Organization Cases
          </h2>

          {trustSafetyCases.length === 0 ? (
            <p className="mt-6 text-sm text-[var(--tp-muted)]">
              No Trust & Safety cases found for this organization.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {trustSafetyCases.map((report) => (
                <Link
                  key={report.id}
                  href={`/admin/trust-safety/${report.id}`}
                  className="block rounded-2xl border p-4 transition hover:border-neutral-400 hover:bg-[var(--tp-bg-soft)]"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-mono text-sm font-semibold">
                        {report.report_reference}
                      </p>
                      <p className="mt-1 text-sm text-[var(--tp-ink-soft)]">
                        {friendlyText(report.category)}
                      </p>
                    </div>
                    <div className="text-sm text-[var(--tp-muted)]">
                      {friendlyText(report.status)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-[2rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] shadow-[var(--tp-shadow-sm)] p-6 md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
            Enforcement History
          </p>
          <h2 className="mt-2 text-xl font-black tracking-tight">
            Restriction History
          </h2>

          {restrictionHistory.length === 0 ? (
            <p className="mt-6 text-sm text-[var(--tp-muted)]">
              No organization restriction history.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {restrictionHistory.map((restriction) => (
                <div
                  key={restriction.id}
                  className="rounded-2xl border p-5"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold">
                        {friendlyText(restriction.restriction_type)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--tp-muted)]">
                        Imposed {formatDateTime(restriction.imposed_at)}
                      </p>
                    </div>

                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                        restriction.lifted_at
                          ? "bg-[var(--tp-success-soft)] text-[var(--tp-success)]"
                          : "bg-[var(--tp-danger-soft)] text-[var(--tp-danger)]"
                      }`}
                    >
                      {restriction.lifted_at ? "Lifted" : "Active"}
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-[var(--tp-ink-soft)]">
                    {restriction.reason}
                  </p>

                  {restriction.lifted_at && (
                    <div className="mt-4 rounded-xl bg-[var(--tp-bg-soft)] p-4 text-sm text-[var(--tp-ink-soft)]">
                      <p>
                        Lifted {formatDateTime(restriction.lifted_at)}
                      </p>
                      {restriction.lift_reason && (
                        <p className="mt-2">
                          {restriction.lift_reason}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}



