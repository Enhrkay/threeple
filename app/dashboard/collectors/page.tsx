import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { ThreepleAppShell } from "@/components/threeple/app-shell";
import {
  ThreepleAlert,
  ThreepleBadge,
  ThreepleEmptyState,
} from "@/components/threeple/design-system";

import {
  assignCollector,
  revokeCollector,
} from "./actions";

export const instant = false;

type PageProps = {
  searchParams?: Promise<{
    result?: string;
  }>;
};

function resultMessage(result?: string) {
  switch (result) {
    case "collector_assigned":
      return {
        tone: "success" as const,
        text: "Collector access granted.",
      };
    case "collector_revoked":
      return {
        tone: "success" as const,
        text: "Collector access revoked.",
      };
    case "user_not_found":
      return {
        tone: "danger" as const,
        text: "No Threeple account was found for that email address.",
      };
    case "missing_fields":
      return {
        tone: "danger" as const,
        text: "Choose an organization and enter the collector’s email.",
      };
    case "lookup_failed":
    case "assign_failed":
    case "revoke_failed":
      return {
        tone: "danger" as const,
        text: "Threeple could not complete the collector access change.",
      };
    default:
      return null;
  }
}

export default async function CollectorsPage({
  searchParams,
}: PageProps) {
  const query = await searchParams;

  const supabase = await createClient();

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect(
      `/auth/login?next=${encodeURIComponent("/dashboard/collectors")}`
    );
  }

  const { data: ownedOrganizations } =
    await supabaseAdmin
      .from("organizations")
      .select("id, name, owner_id")
      .eq("owner_id", userId);

  const { data: adminMemberships } =
    await supabaseAdmin
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", userId)
      .eq("role", "admin");

  const adminOrgIds =
    (adminMemberships ?? []).map(
      (row) => row.organization_id
    );

  const { data: adminOrganizations } =
    adminOrgIds.length > 0
      ? await supabaseAdmin
          .from("organizations")
          .select("id, name, owner_id")
          .in("id", adminOrgIds)
      : { data: [] };

  const organizations = Array.from(
    new Map(
      [
        ...(ownedOrganizations ?? []),
        ...(adminOrganizations ?? []),
      ].map((organization) => [
        organization.id,
        organization,
      ])
    ).values()
  );

  const organizationIds =
    organizations.map((organization) => organization.id);

  const { data: assignments } =
    organizationIds.length > 0
      ? await supabaseAdmin
          .from("organization_collectors")
          .select(`
            id,
            organization_id,
            user_id,
            assigned_at,
            is_active,
            revoked_at
          `)
          .in("organization_id", organizationIds)
          .eq("is_active", true)
          .is("revoked_at", null)
          .order("assigned_at", { ascending: false })
      : { data: [] };

  const userIds =
    Array.from(
      new Set(
        (assignments ?? []).map(
          (assignment) => assignment.user_id
        )
      )
    );

  const userEmailMap = new Map<string, string>();

  if (userIds.length > 0) {
    let pageNumber = 1;

    while (
      pageNumber <= 10 &&
      userEmailMap.size < userIds.length
    ) {
      const { data } =
        await supabaseAdmin.auth.admin.listUsers({
          page: pageNumber,
          perPage: 100,
        });

      for (const user of data.users) {
        if (
          userIds.includes(user.id) &&
          user.email
        ) {
          userEmailMap.set(
            user.id,
            user.email
          );
        }
      }

      if (data.users.length < 100) {
        break;
      }

      pageNumber += 1;
    }
  }

  const organizationMap =
    new Map(
      organizations.map((organization) => [
        organization.id,
        organization.name,
      ])
    );

  const message =
    resultMessage(query?.result);

  return (
    <ThreepleAppShell
      title="Collectors"
      subtitle="Field-only organization access"
      status={
        <ThreepleBadge tone="primary">
          Access Control
        </ThreepleBadge>
      }
    >
      <div className="mx-auto max-w-5xl">
        {message && (
          <ThreepleAlert
            tone={message.tone}
          >
            {message.text}
          </ThreepleAlert>
        )}

        <ThreepleAlert
          tone="info"
          className="mt-5"
        >
          Collector access is separate from Admin and Treasurer access. A collector can use field collection tools without receiving organizer configuration or treasury privileges.
        </ThreepleAlert>

        <section className="tp-card mt-6 p-6 sm:p-8">
          <p className="tp-kicker">
            Grant access
          </p>

          <h1 className="tp-heading mt-2 text-2xl">
            Add a field collector.
          </h1>

          <p className="tp-body mt-2 text-sm">
            The collector must already have a Threeple account.
          </p>

          <form
            action={assignCollector}
            className="mt-6 grid gap-4 sm:grid-cols-2"
          >
            <div>
              <label
                htmlFor="organization_id"
                className="text-sm font-black"
              >
                Organization
              </label>

              <select
                id="organization_id"
                name="organization_id"
                required
                className="tp-input mt-2 w-full"
              >
                <option value="">
                  Choose organization
                </option>

                {organizations.map((organization) => (
                  <option
                    key={organization.id}
                    value={organization.id}
                  >
                    {organization.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="email"
                className="text-sm font-black"
              >
                Collector email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="collector@example.com"
                className="tp-input mt-2 w-full"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="tp-btn tp-btn-primary"
              >
                Grant Collector Access
              </button>
            </div>
          </form>
        </section>

        <section className="mt-8">
          <p className="tp-kicker">
            Active collectors
          </p>

          {(assignments ?? []).length === 0 ? (
            <ThreepleEmptyState
              className="mt-4"
              title="No dedicated collectors yet"
              description="Grant Collector Access above to add a field worker without giving them admin or treasury permissions."
            />
          ) : (
            <div className="mt-4 space-y-3">
              {(assignments ?? []).map((assignment) => (
                <article
                  key={assignment.id}
                  className="tp-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-black">
                      {userEmailMap.get(assignment.user_id) ??
                        assignment.user_id}
                    </p>

                    <p className="mt-1 text-sm text-[var(--tp-muted)]">
                      {organizationMap.get(
                        assignment.organization_id
                      ) ?? "Organization"}
                    </p>

                    <p className="mt-1 text-xs text-[var(--tp-muted)]">
                      Collector · field access only
                    </p>
                  </div>

                  <form action={revokeCollector}>
                    <input
                      type="hidden"
                      name="assignment_id"
                      value={assignment.id}
                    />

                    <input
                      type="hidden"
                      name="organization_id"
                      value={assignment.organization_id}
                    />

                    <button
                      type="submit"
                      className="tp-btn tp-btn-secondary"
                    >
                      Revoke
                    </button>
                  </form>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </ThreepleAppShell>
  );
}

