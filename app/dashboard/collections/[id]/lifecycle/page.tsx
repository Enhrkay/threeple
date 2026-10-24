import Link from "next/link";
import {
  notFound,
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
  ThreepleAlert,
  ThreepleBadge,
  ThreepleDangerZone,
  ThreepleStat,
} from "@/components/threeple/design-system";

import {
  archiveFromLifecycle,
  deleteCollectionSafely,
  restoreFromLifecycle,
} from "./actions";

export const instant = false;

type PageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams?: Promise<{
    result?: string;
  }>;
};

function resultMessage(
  result?: string
) {
  switch (result) {
    case "archived":
      return {
        tone:
          "success" as const,
        text:
          "Collection archived. Its history remains intact.",
      };

    case "restored":
      return {
        tone:
          "success" as const,
        text:
          "Collection restored to the organizer workspace.",
      };

    case "deleted":
      return {
        tone:
          "success" as const,
        text:
          "The empty collection has been removed from normal product use. No financial history was deleted.",
      };

    case "preserved_history":
      return {
        tone:
          "warning" as const,
        text:
          "This collection contains participant or payment history, so Threeple preserved it as a historical record instead of deleting the ledger.",
      };

    case "reason_required":
      return {
        tone:
          "danger" as const,
        text:
          "Enter a reason of at least 10 characters.",
      };

    case "confirmation_required":
      return {
        tone:
          "danger" as const,
        text:
          'Type "DELETE COLLECTION" exactly to confirm.',
      };

    case "restore_not_allowed":
      return {
        tone:
          "danger" as const,
        text:
          "A deleted or historical-locked collection cannot be restored through the normal archive workflow.",
      };

    case "archive_failed":
    case "restore_failed":
    case "delete_failed":
    case "audit_failed":
      return {
        tone:
          "danger" as const,
        text:
          "Threeple could not complete the lifecycle action. Review the server error before retrying.",
      };

    default:
      return null;
  }
}

export default async function CollectionLifecyclePage({
  params,
  searchParams,
}: PageProps) {
  const {
    id,
  } = await params;

  const query =
    await searchParams;

  const supabase =
    await createClient();

  const {
    data:
      claimsData,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    redirect(
      `/auth/login?next=${encodeURIComponent(
        `/dashboard/collections/${id}/lifecycle`
      )}`
    );
  }

  const {
    data: collection,
  } = await supabaseAdmin
    .from("collections")
    .select(`
      id,
      title,
      organization_id,
      status,
      archived_at
    `)
    .eq(
      "id",
      id
    )
    .maybeSingle();

  if (!collection) {
    notFound();
  }

  const {
    data: organization,
  } = await supabaseAdmin
    .from("organizations")
    .select(`
      id,
      owner_id
    `)
    .eq(
      "id",
      collection.organization_id
    )
    .maybeSingle();

  if (!organization) {
    notFound();
  }

  let canManage =
    organization.owner_id ===
    userId;

  if (!canManage) {
    const {
      data: membership,
    } = await supabaseAdmin
      .from(
        "organization_members"
      )
      .select("role")
      .eq(
        "organization_id",
        organization.id
      )
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
      )
      .maybeSingle();

    canManage =
      Boolean(
        membership
      );
  }

  if (!canManage) {
    notFound();
  }

  const [
    paymentCountResult,
    participantCountResult,
    lifecycleResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("payments")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "collection_id",
        id
      ),

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
        "collection_id",
        id
      ),

    supabaseAdmin
      .from(
        "collection_lifecycle"
      )
      .select(`
        lifecycle_status,
        reason,
        archived_at,
        restored_at,
        soft_deleted_at,
        historical_locked_at,
        updated_at
      `)
      .eq(
        "collection_id",
        id
      )
      .maybeSingle(),
  ]);

  const paymentCount =
    paymentCountResult.count ??
    0;

  const participantCount =
    participantCountResult.count ??
    0;

  const hasHistory =
    paymentCount > 0 ||
    participantCount > 0;

  const lifecycle =
    lifecycleResult.data;

  const lifecycleStatus =
    lifecycle?.lifecycle_status ??
    (collection.archived_at
      ? "archived"
      : "active");

  const archived =
    Boolean(
      collection.archived_at
    );

  const message =
    resultMessage(
      query?.result
    );

  return (
    <ThreepleAppShell
      title="Collection Lifecycle"
      subtitle={collection.title}
      status={
        <ThreepleBadge
          tone={
            lifecycleStatus ===
              "active"
              ? "success"
              : lifecycleStatus ===
                  "archived"
                ? "warning"
                : "danger"
          }
        >
          {lifecycleStatus
            .replaceAll(
              "_",
              " "
            )}
        </ThreepleBadge>
      }
    >
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/dashboard/collections/${id}`}
          className="text-sm font-black text-[var(--tp-primary)]"
        >
          Back to collection
        </Link>

        <section className="tp-card mt-5 p-6 sm:p-8">
          <p className="tp-kicker">
            Collection lifecycle
          </p>

          <h1 className="tp-heading mt-2 text-3xl">
            {collection.title}
          </h1>

          <p className="tp-body mt-3 max-w-2xl text-sm">
            Archive is reversible. Delete removes a collection from normal product use, but Threeple never destroys participant or financial history simply to make a screen disappear.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <ThreepleStat
              label="Participants"
              value={
                participantCount
              }
              helper="All participant records."
            />

            <ThreepleStat
              label="Payments"
              value={
                paymentCount
              }
              helper="Payment records linked to this collection."
              tone={
                paymentCount >
                0
                  ? "warning"
                  : "neutral"
              }
            />

            <ThreepleStat
              label="Deletion rule"
              value={
                hasHistory
                  ? "Preserve"
                  : "Empty"
              }
              helper={
                hasHistory
                  ? "History prevents destructive deletion."
                  : "No participant/payment history detected."
              }
              tone={
                hasHistory
                  ? "warning"
                  : "success"
              }
            />
          </div>

          {lifecycle?.reason && (
            <div className="mt-6 rounded-2xl bg-[var(--tp-bg-soft)] p-5">
              <p className="tp-kicker">
                Latest reason
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

        {!archived &&
          lifecycleStatus ===
            "active" && (
          <section className="tp-card mt-6 p-6 sm:p-8">
            <p className="tp-kicker">
              Reversible
            </p>

            <h2 className="tp-heading mt-2 text-xl">
              Archive collection
            </h2>

            <p className="tp-body mt-2 text-sm">
              Removes the collection from normal active views while keeping all records available for later restoration.
            </p>

            <form
              action={
                archiveFromLifecycle
              }
              className="mt-5"
            >
              <input
                type="hidden"
                name="collection_id"
                value={id}
              />

              <textarea
                name="reason"
                required
                minLength={10}
                rows={3}
                className="tp-textarea"
                placeholder="Why are you archiving this collection?"
              />

              <button
                type="submit"
                className="tp-btn tp-btn-secondary mt-4"
              >
                Archive collection
              </button>
            </form>
          </section>
        )}

        {archived &&
          lifecycleStatus ===
            "archived" && (
          <section className="tp-card mt-6 p-6 sm:p-8">
            <p className="tp-kicker">
              Reversible
            </p>

            <h2 className="tp-heading mt-2 text-xl">
              Restore collection
            </h2>

            <p className="tp-body mt-2 text-sm">
              Return this archived collection to the organizer workspace.
            </p>

            <form
              action={
                restoreFromLifecycle
              }
              className="mt-5"
            >
              <input
                type="hidden"
                name="collection_id"
                value={id}
              />

              <textarea
                name="reason"
                required
                minLength={10}
                rows={3}
                className="tp-textarea"
                placeholder="Why are you restoring this collection?"
              />

              <button
                type="submit"
                className="tp-btn tp-btn-primary mt-4"
              >
                Restore collection
              </button>
            </form>
          </section>
        )}

        {![
          "soft_deleted",
          "historical_locked",
        ].includes(
          lifecycleStatus
        ) && (
          <ThreepleDangerZone
            className="mt-6"
            title={
              hasHistory
                ? "Remove collection and preserve history"
                : "Delete empty collection"
            }
            description={
              hasHistory
                ? "This collection has participant or payment history. Threeple will cancel and archive it permanently from normal use, but the historical ledger will remain."
                : "No participant or payment records are linked. Threeple will mark the collection deleted and remove it from normal use while retaining the collection row for audit safety."
            }
          >
            <form
              action={
                deleteCollectionSafely
              }
              className="max-w-2xl"
            >
              <input
                type="hidden"
                name="collection_id"
                value={id}
              />

              <label
                htmlFor="delete_reason"
                className="mb-2 block text-sm font-black text-[var(--tp-danger)]"
              >
                Reason
              </label>

              <textarea
                id="delete_reason"
                name="reason"
                required
                minLength={10}
                rows={3}
                className="tp-textarea"
                placeholder="Explain why this collection should be removed."
              />

              <label
                htmlFor="confirmation"
                className="mb-2 mt-4 block text-sm font-black text-[var(--tp-danger)]"
              >
                Type DELETE COLLECTION
              </label>

              <input
                id="confirmation"
                name="confirmation"
                required
                autoComplete="off"
                className="tp-input"
                placeholder="DELETE COLLECTION"
              />

              <button
                type="submit"
                className="tp-btn tp-btn-danger mt-4"
              >
                {hasHistory
                  ? "Remove and preserve history"
                  : "Delete collection"}
              </button>
            </form>
          </ThreepleDangerZone>
        )}

        {lifecycleStatus ===
          "historical_locked" && (
          <ThreepleAlert
            tone="warning"
            className="mt-6"
          >
            This collection is permanently preserved as a historical record because participant or payment history exists.
          </ThreepleAlert>
        )}

        {lifecycleStatus ===
          "soft_deleted" && (
          <ThreepleAlert
            tone="danger"
            className="mt-6"
          >
            This empty collection has been soft-deleted and removed from normal product use.
          </ThreepleAlert>
        )}
      </div>
    </ThreepleAppShell>
  );
}
