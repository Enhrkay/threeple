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

import {
  ThreepleAppShell,
} from "@/components/threeple/app-shell";

import {
  ThreepleAlert,
  ThreepleBadge,
  ThreepleDangerZone,
} from "@/components/threeple/design-system";

import {
  deactivateUserAccount,
  deleteUserAccount,
  restoreUserAccount,
} from "./actions";

export const instant = false;

type PageProps = {
  params: Promise<{
    userId: string;
  }>;

  searchParams?: Promise<{
    result?: string;
  }>;
};

function resultMessage(
  result?: string
) {
  switch (result) {
    case "deactivated":
      return {
        tone:
          "warning" as const,
        text:
          "The account has been deactivated. Existing Threeple history remains preserved.",
      };

    case "restored":
      return {
        tone:
          "success" as const,
        text:
          "Account access has been restored.",
      };

    case "deleted":
      return {
        tone:
          "success" as const,
        text:
          "The Auth account has been soft-deleted. Threeple financial and audit history remains preserved.",
      };

    case "reason_required":
      return {
        tone:
          "danger" as const,
        text:
          "Enter an administrative reason of at least 10 characters.",
      };

    case "confirmation_required":
      return {
        tone:
          "danger" as const,
        text:
          'Type "DELETE ACCOUNT" exactly to confirm deletion.',
      };

    case "cannot_manage_self":
      return {
        tone:
          "danger" as const,
        text:
          "You cannot deactivate or delete your own administrator account from this screen.",
      };

    case "admin_account_protected":
      return {
        tone:
          "danger" as const,
        text:
          "Active platform administrator accounts are protected from this workflow.",
      };

    case "not_authorized":
      return {
        tone:
          "danger" as const,
        text:
          "Your administrator role is not authorized to change account lifecycle state.",
      };

    case "deactivate_failed":
    case "restore_failed":
    case "delete_failed":
    case "audit_failed":
      return {
        tone:
          "danger" as const,
        text:
          "Threeple could not complete the account lifecycle action. No further action should be taken until the error is reviewed.",
      };

    default:
      return null;
  }
}

function friendlyText(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "Active";
  }

  return value
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
}

export default async function AdminUserLifecyclePage({
  params,
  searchParams,
}: PageProps) {
  const admin =
    await requirePlatformAdmin();

  const {
    userId,
  } = await params;

  const query =
    await searchParams;

  const message =
    resultMessage(
      query?.result
    );

  const [
    profileResult,
    lifecycleResult,
    adminResult,
    participantCountResult,
    ownedOrganizationCountResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select(`
        id,
        full_name,
        phone
      `)
      .eq(
        "id",
        userId
      )
      .maybeSingle(),

    supabaseAdmin
      .from(
        "user_account_lifecycle"
      )
      .select(`
        user_id,
        status,
        reason,
        changed_by,
        deactivated_at,
        restored_at,
        deleted_at,
        updated_at
      `)
      .eq(
        "user_id",
        userId
      )
      .maybeSingle(),

    supabaseAdmin
      .from(
        "platform_admins"
      )
      .select(`
        id,
        role,
        is_active
      `)
      .eq(
        "user_id",
        userId
      )
      .eq(
        "is_active",
        true
      )
      .maybeSingle(),

    supabaseAdmin
      .from("participants")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "user_id",
        userId
      ),

    supabaseAdmin
      .from("organizations")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "owner_id",
        userId
      ),
  ]);

  if (
    profileResult.error ||
    !profileResult.data
  ) {
    notFound();
  }

  const profile =
    profileResult.data;

  const lifecycle =
    lifecycleResult.data;

  const currentStatus =
    lifecycle?.status ??
    "active";

  const protectedAdmin =
    Boolean(
      adminResult.data
    );

  const self =
    admin.userId ===
    userId;

  const canOperate =
    [
      "super_admin",
      "admin",
    ].includes(
      admin.role
    ) &&
    !protectedAdmin &&
    !self &&
    currentStatus !==
      "deleted";

  return (
    <ThreepleAppShell
      mode="admin"
      title="Account Lifecycle"
      subtitle={
        profile.full_name ??
        "Threeple user"
      }
      status={
        <ThreepleBadge
          tone={
            currentStatus ===
            "active"
              ? "success"
              : currentStatus ===
                  "deactivated"
                ? "warning"
                : "danger"
          }
        >
          {friendlyText(
            currentStatus
          )}
        </ThreepleBadge>
      }
    >
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/admin/users/${userId}`}
          className="text-sm font-black text-[var(--tp-primary)]"
        >
          Back to user overview
        </Link>

        <section className="tp-card mt-5 p-6 sm:p-8">
          <p className="tp-kicker">
            Account access
          </p>

          <h1 className="tp-heading mt-2 text-3xl">
            {profile.full_name ??
              "Threeple user"}
          </h1>

          <p className="tp-body mt-3 text-sm">
            Account lifecycle controls affect authentication access. They do not remove contribution, collection, payment, Trust & Safety or audit history.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-[var(--tp-bg-soft)] p-5">
              <p className="tp-kicker">
                Status
              </p>

              <p className="mt-2 font-black">
                {friendlyText(
                  currentStatus
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-[var(--tp-bg-soft)] p-5">
              <p className="tp-kicker">
                Joined records
              </p>

              <p className="mt-2 text-xl font-black">
                {participantCountResult.count ??
                  0}
              </p>
            </div>

            <div className="rounded-2xl bg-[var(--tp-bg-soft)] p-5">
              <p className="tp-kicker">
                Owned workspaces
              </p>

              <p className="mt-2 text-xl font-black">
                {ownedOrganizationCountResult.count ??
                  0}
              </p>
            </div>
          </div>

          {lifecycle?.reason && (
            <div className="mt-6 rounded-2xl border border-[var(--tp-border)] bg-[var(--tp-bg-soft)] p-5">
              <p className="tp-kicker">
                Latest admin reason
              </p>

              <p className="mt-2 text-sm leading-6 text-[var(--tp-ink-soft)]">
                {lifecycle.reason}
              </p>
            </div>
          )}
        </section>

        {message && (
          <ThreepleAlert
            tone={
              message.tone
            }
            className="mt-6"
          >
            {message.text}
          </ThreepleAlert>
        )}

        {(self ||
          protectedAdmin) && (
          <ThreepleAlert
            tone="warning"
            className="mt-6"
          >
            {self
              ? "This is your own administrator account. Lifecycle actions are disabled here."
              : "This user is an active platform administrator. Remove or transfer administrator privileges through the appropriate admin-governance process before changing account lifecycle state."}
          </ThreepleAlert>
        )}

        {currentStatus ===
          "active" &&
          canOperate && (
          <section className="tp-card mt-6 p-6 sm:p-8">
            <p className="tp-kicker">
              Reversible action
            </p>

            <h2 className="tp-heading mt-2 text-xl">
              Deactivate account
            </h2>

            <p className="tp-body mt-2 text-sm">
              Blocks new sign-ins while preserving the account and all Threeple history. This can be restored later.
            </p>

            <form
              action={
                deactivateUserAccount
              }
              className="mt-5"
            >
              <input
                type="hidden"
                name="user_id"
                value={
                  userId
                }
              />

              <label
                htmlFor="deactivate_reason"
                className="mb-2 block text-sm font-black"
              >
                Administrative reason
              </label>

              <textarea
                id="deactivate_reason"
                name="reason"
                required
                minLength={10}
                rows={3}
                className="tp-textarea"
                placeholder="Explain why this account is being deactivated."
              />

              <button
                type="submit"
                className="tp-btn tp-btn-danger mt-4"
              >
                Deactivate account
              </button>
            </form>
          </section>
        )}

        {currentStatus ===
          "deactivated" &&
          !self &&
          !protectedAdmin &&
          [
            "super_admin",
            "admin",
          ].includes(
            admin.role
          ) && (
          <section className="tp-card mt-6 p-6 sm:p-8">
            <p className="tp-kicker">
              Reversible action
            </p>

            <h2 className="tp-heading mt-2 text-xl">
              Restore account access
            </h2>

            <p className="tp-body mt-2 text-sm">
              Removes the authentication ban and allows the user to sign in again.
            </p>

            <form
              action={
                restoreUserAccount
              }
              className="mt-5"
            >
              <input
                type="hidden"
                name="user_id"
                value={
                  userId
                }
              />

              <label
                htmlFor="restore_reason"
                className="mb-2 block text-sm font-black"
              >
                Administrative reason
              </label>

              <textarea
                id="restore_reason"
                name="reason"
                required
                minLength={10}
                rows={3}
                className="tp-textarea"
                placeholder="Explain why access is being restored."
              />

              <button
                type="submit"
                className="tp-btn tp-btn-primary mt-4"
              >
                Restore access
              </button>
            </form>
          </section>
        )}

        {currentStatus !==
          "deleted" &&
          !self &&
          !protectedAdmin &&
          [
            "super_admin",
            "admin",
          ].includes(
            admin.role
          ) && (
          <ThreepleDangerZone
            className="mt-6"
            title="Delete account access"
            description="This soft-deletes the Supabase Auth account and is not treated as a normal reversible suspension. Threeple domain records remain preserved for financial and audit continuity."
          >
            <form
              action={
                deleteUserAccount
              }
              className="max-w-2xl"
            >
              <input
                type="hidden"
                name="user_id"
                value={
                  userId
                }
              />

              <label
                htmlFor="delete_reason"
                className="mb-2 block text-sm font-black text-[var(--tp-danger)]"
              >
                Reason for deletion
              </label>

              <textarea
                id="delete_reason"
                name="reason"
                required
                minLength={10}
                rows={3}
                className="tp-textarea"
                placeholder="Explain why this account should be deleted."
              />

              <label
                htmlFor="confirmation"
                className="mb-2 mt-4 block text-sm font-black text-[var(--tp-danger)]"
              >
                Type DELETE ACCOUNT
              </label>

              <input
                id="confirmation"
                name="confirmation"
                required
                autoComplete="off"
                className="tp-input"
                placeholder="DELETE ACCOUNT"
              />

              <button
                type="submit"
                className="tp-btn tp-btn-danger mt-4"
              >
                Delete account
              </button>
            </form>
          </ThreepleDangerZone>
        )}

        {currentStatus ===
          "deleted" && (
          <ThreepleAlert
            tone="danger"
            className="mt-6"
          >
            This Auth account has been soft-deleted. Its Threeple domain history remains preserved and should be treated as historical data.
          </ThreepleAlert>
        )}
      </div>
    </ThreepleAppShell>
  );
}
