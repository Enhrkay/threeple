import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  activateCollection,
  archiveCollection,
  closeCollection,
  reopenCollection,
  restoreCollection,
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

function formatMoney(
  amount: number | string | null | undefined,
  currency: string
) {
  if (
    amount === null ||
    amount === undefined
  ) {
    return "—";
  }

  const numeric =
    Number(amount);

  if (
    Number.isNaN(numeric)
  ) {
    return "—";
  }

  try {
    return new Intl.NumberFormat(
      "en-NG",
      {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    ).format(numeric);
  } catch {
    return `${currency} ${numeric.toLocaleString()}`;
  }
}

function friendlyText(
  value: string
) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

function statusStyle(
  status: string
) {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-700";

    case "draft":
      return "bg-amber-100 text-amber-700";

    case "closed":
      return "bg-neutral-200 text-neutral-700";

    case "cancelled":
      return "bg-red-100 text-red-700";

    default:
      return "bg-neutral-100 text-neutral-600";
  }
}

function resultMessage(
  result?: string
) {
  switch (result) {
    case "activated":
      return {
        type: "success",
        text:
          "Collection activated successfully.",
      };

    case "closed":
      return {
        type: "success",
        text:
          "Collection closed successfully.",
      };

    case "reopened":
      return {
        type: "success",
        text:
          "Collection reopened successfully.",
      };

    case "archived":
      return {
        type: "success",
        text:
          "Collection archived successfully.",
      };

    case "restored":
      return {
        type: "success",
        text:
          "Collection restored from archive.",
      };

    case "already_activated":
      return {
        type: "info",
        text:
          "This Collection is already active.",
      };

    case "close_not_allowed":
      return {
        type: "error",
        text:
          "Only an active Collection can be closed.",
      };

    case "reopen_not_allowed":
      return {
        type: "error",
        text:
          "Only a closed Collection can be reopened.",
      };

    case "archive_not_allowed":
      return {
        type: "error",
        text:
          "Only closed or cancelled Collections can be archived.",
      };

    case "already_archived":
      return {
        type: "info",
        text:
          "This Collection is already archived.",
      };

    case "restore_before_reopening":
      return {
        type: "error",
        text:
          "Restore this Collection from archive before reopening it.",
      };

    case "restore_before_activation":
    case "restore_before_closing":
      return {
        type: "error",
        text:
          "Restore this Collection from archive before changing its lifecycle.",
      };

    case "activate_failed":
    case "close_failed":
    case "reopen_failed":
    case "archive_failed":
    case "restore_failed":
      return {
        type: "error",
        text:
          "Threeple could not complete the Collection action.",
      };

    default:
      return null;
  }
}

function messageStyle(
  type: string
) {
  if (
    type === "success"
  ) {
    return "border-green-200 bg-green-50 text-green-800";
  }

  if (
    type === "error"
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-blue-200 bg-blue-50 text-blue-700";
}

export default async function CollectionPage({
  params,
  searchParams,
}: PageProps) {
  const { id } =
    await params;

  const query =
    await searchParams;

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
    redirect("/auth/login");
  }

  const {
    data: collection,
    error: collectionError,
  } = await supabase
    .from("collections")
    .select(`
      id,
      organization_id,
      title,
      description,
      collection_type,
      collection_mode,
      currency,
      target_amount,
      default_amount,
      allow_partial_payments,
      allow_custom_amount,
      deadline,
      join_code,
      public_slug,
      visibility,
      show_participant_names,
      show_payment_amounts,
      requires_approval,
      access_mode,
      status,
      closed_at,
      archived_at,
      created_at
    `)
    .eq(
      "id",
      id
    )
    .maybeSingle();

  if (
    collectionError ||
    !collection
  ) {
    notFound();
  }

  const {
    data: organization,
  } = await supabase
    .from("organizations")
    .select(`
      id,
      name,
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
    } = await supabase
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
      Boolean(membership);
  }

  if (!canManage) {
    notFound();
  }

  const {
    count: participantCount,
  } = await supabase
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
      collection.id
    )
    .eq(
      "is_active",
      true
    );

  const {
    data: financialSummary,
    error: financialSummaryError,
  } = await supabase
    .from(
      "collection_financial_summary"
    )
    .select(`
      verified_payment_count,
      effective_gross_amount,
      platform_fee_amount,
      processor_fee_amount,
      organizer_net_amount
    `)
    .eq(
      "collection_id",
      collection.id
    )
    .maybeSingle();

  if (
    financialSummaryError
  ) {
    console.error(
      "COLLECTION_FINANCIAL_SUMMARY_FAILED",
      financialSummaryError
    );
  }

  const grossProcessed =
    Number(
      financialSummary?.effective_gross_amount ??
        0
    );
  const refundedAmount = 0;

const platformRevenue =
    Number(
      financialSummary?.platform_fee_amount ??
        0
    );

  const processorFees =
    Number(
      financialSummary?.processor_fee_amount ??
        0
    );

  const organizerNet =
    Number(
      financialSummary?.organizer_net_amount ??
        0
    );

  const verifiedPaymentCount =
    Number(
      financialSummary?.verified_payment_count ??
        0
    );

  const amountRaised = Math.max(0, grossProcessed);

  const targetAmount =
    collection.target_amount !==
      null
      ? Number(
          collection.target_amount
        )
      : null;

  const outstandingAmount =
    targetAmount !== null
      ? Math.max(
          0,
          targetAmount -
            amountRaised
        )
      : null;

  const progressPercent =
    targetAmount &&
    targetAmount > 0
      ? Math.min(
          100,
          Math.round(
            (
              amountRaised /
              targetAmount
            ) * 100
          )
        )
      : null;

  const isArchived =
    Boolean(
      collection.archived_at
    );

  const message =
    resultMessage(
      query?.result
    );

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <Link
              href="/dashboard"
              className="text-2xl font-bold tracking-tight"
            >
              Threeple
            </Link>

            <p className="text-sm text-neutral-500">
              Collect. Coordinate. Track.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="text-sm font-medium text-neutral-600 hover:text-black"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {message && (
          <div
            className={`mb-6 rounded-2xl border p-4 text-sm ${messageStyle(
              message.type
            )}`}
          >
            {message.text}
          </div>
        )}

        {isArchived && (
          <section className="mb-6 rounded-2xl border border-neutral-300 bg-neutral-100 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">
                  This Collection is archived
                </p>

                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  Historical records remain available, but new participation should remain paused until the Collection is restored.
                </p>
              </div>

              <form
                action={
                  restoreCollection
                }
              >
                <input
                  type="hidden"
                  name="collection_id"
                  value={
                    collection.id
                  }
                />

                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-semibold text-white hover:bg-neutral-800"
                >
                  Restore Collection
                </button>
              </form>
            </div>
          </section>
        )}

        <section className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(
                  collection.status
                )}`}
              >
                {friendlyText(
                  collection.status
                )}
              </span>

              {isArchived && (
                <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold text-white">
                  Archived
                </span>
              )}

              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
                {friendlyText(
                  collection.collection_type
                )}
              </span>

              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
                {friendlyText(
                  collection.collection_mode
                )}
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              {collection.title}
            </h1>

            {collection.description && (
              <p className="mt-4 max-w-2xl leading-7 text-neutral-600">
                {collection.description}
              </p>
            )}
          </div>

          {!isArchived && (
            <Link
              href={`/dashboard/collections/${collection.id}/edit`}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-neutral-300 bg-white px-5 text-sm font-semibold hover:bg-neutral-50"
            >
              Edit Collection
            </Link>
          )}
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Participants
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {participantCount ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Net Collected
            </p>

            <p className="mt-3 text-2xl font-semibold">
              {formatMoney(
                amountRaised,
                collection.currency
              )}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Target
            </p>

            <p className="mt-3 text-2xl font-semibold">
              {targetAmount !==
              null
                ? formatMoney(
                    targetAmount,
                    collection.currency
                  )
                : "—"}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Progress
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {progressPercent !==
              null
                ? `${progressPercent}%`
                : "—"}
            </p>
          </div>
        </section>

        {progressPercent !==
          null && (
          <section className="mt-4 rounded-2xl border bg-white p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                Collection progress
              </span>

              <span className="text-neutral-500">
                {progressPercent}%
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-black"
                style={{
                  width:
                    `${progressPercent}%`,
                }}
              />
            </div>
          </section>
        )}

        <section className="mt-8 overflow-hidden rounded-3xl border bg-white">
          <div className="border-b px-6 py-5 md:px-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Monetization
            </p>

            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">
                  Financial Overview
                </h2>

                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  Verified payment volume, refunds, Threeple fees and the organizer settlement position for this Collection.
                </p>
              </div>

              <span className="w-fit rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                Live
              </span>
            </div>
          </div>

          <div className="grid gap-px bg-neutral-200 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Gross Processed
              </p>

              <p className="mt-3 text-2xl font-semibold">
                {formatMoney(
                  grossProcessed,
                  collection.currency
                )}
              </p>
            </div>

            <div className="bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Refunded
              </p>

              <p className="mt-3 text-2xl font-semibold">
                {formatMoney(
                  refundedAmount,
                  collection.currency
                )}
              </p>
            </div>

            <div className="bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Verified Payments
              </p>

              <p className="mt-3 text-2xl font-semibold">
                {verifiedPaymentCount}
              </p>
            </div>

            <div className="bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Outstanding
              </p>

              <p className="mt-3 text-2xl font-semibold">
                {outstandingAmount !==
                null
                  ? formatMoney(
                      outstandingAmount,
                      collection.currency
                    )
                  : "—"}
              </p>
            </div>
          </div>

          <div className="border-t bg-neutral-50 p-6 md:p-8">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Threeple Fee
                </p>

                <p className="mt-3 text-2xl font-semibold">
                  {formatMoney(
                    platformRevenue,
                    collection.currency
                  )}
                </p>

                <p className="mt-2 text-xs leading-5 text-neutral-500">
                  Revenue retained by Threeple from verified transactions.
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Processor Fees
                </p>

                <p className="mt-3 text-2xl font-semibold">
                  {formatMoney(
                    processorFees,
                    collection.currency
                  )}
                </p>

                <p className="mt-2 text-xs leading-5 text-neutral-500">
                  Payment-provider charges recorded against verified transactions.
                </p>
              </div>

              <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                  Organizer Net
                </p>

                <p className="mt-3 text-2xl font-semibold text-green-950">
                  {formatMoney(
                    organizerNet,
                    collection.currency
                  )}
                </p>

                <p className="mt-2 text-xs leading-5 text-green-800">
                  Gross after refunds, Threeple fees and recorded processor fees.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border bg-white p-6 md:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Threeple Code
              </p>

              <p className="mt-2 font-mono text-3xl font-bold tracking-[0.15em]">
                {collection.join_code}
              </p>

              <p className="mt-3 text-sm text-neutral-500">
                Share this code with people you want to invite to the Collection.
              </p>
            </div>

            {collection.status ===
              "active" &&
              !isArchived && (
                <Link
                  href={`/join?code=${encodeURIComponent(
                    collection.join_code
                  )}`}
                  target="_blank"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-semibold text-white hover:bg-neutral-800"
                >
                  Open Join Page
                </Link>
              )}
          </div>
        </section>

        <section className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Organizer Tools
          </p>

          <h2 className="mt-2 text-2xl font-semibold">
            Collection Control Center
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link
              href={`/dashboard/collections/${collection.id}/participants`}
              className="rounded-2xl border bg-white p-6 transition hover:border-neutral-400 hover:shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-lg">
                👥
              </div>

              <h3 className="mt-5 font-semibold">
                Participants
              </h3>

              <p className="mt-2 text-sm leading-6 text-neutral-500">
                Add, review and manage everyone participating in this Collection.
              </p>

              <p className="mt-5 text-sm font-medium">
                Manage participants â†’
              </p>
            </Link>

            {!isArchived ? (
              <Link
                href={`/dashboard/collections/${collection.id}/edit`}
                className="rounded-2xl border bg-white p-6 transition hover:border-neutral-400 hover:shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-lg">
                  ✎
                </div>

                <h3 className="mt-5 font-semibold">
                  Collection Settings
                </h3>

                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  Update information, deadline, privacy and participation settings.
                </p>

                <p className="mt-5 text-sm font-medium">
                  Edit Collection â†’
                </p>
              </Link>
            ) : (
              <div className="rounded-2xl border bg-white p-6 opacity-50">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-lg">
                  ✎
                </div>

                <h3 className="mt-5 font-semibold">
                  Collection Settings
                </h3>

                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  Restore the Collection before editing its settings.
                </p>
              </div>
            )}

            {collection.status ===
              "active" &&
            !isArchived ? (
              <Link
                href={`/dashboard/collections/${collection.id}/invite`}
                className="rounded-2xl border bg-white p-6 transition hover:border-neutral-400 hover:shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-lg">
                  ↗
                </div>

                <h3 className="mt-5 font-semibold">
                  Invite & Join
                </h3>

                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  Share the Threeple Code, join link and QR code.
                </p>

                <p className="mt-5 text-sm font-medium">
                  Invite people â†’
                </p>
              </Link>
            ) : (
              <div className="rounded-2xl border bg-white p-6 opacity-50">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-lg">
                  ↗
                </div>

                <h3 className="mt-5 font-semibold">
                  Invite & Join
                </h3>

                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  This Collection must be active and unarchived before invitations can be shared.
                </p>
              </div>
            )}

            {collection.collection_mode ===
              "rotating_pool" && (
              <Link
                href={`/dashboard/collections/${collection.id}/rotation`}
                className="rounded-2xl border border-blue-200 bg-blue-50 p-6 transition hover:border-blue-400 hover:shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-lg">
                  â†»
                </div>

                <h3 className="mt-5 font-semibold text-blue-950">
                  Rotation Workspace
                </h3>

                <p className="mt-2 text-sm leading-6 text-blue-800">
                  Manage member order, recipient sequence, cycles and contribution obligations.
                </p>

                <p className="mt-5 text-sm font-medium text-blue-950">
                  Manage rotation â†’
                </p>
              </Link>
            )}
            <Link
              href={`/dashboard/collections/${collection.id}/reports`}
              className="rounded-2xl border bg-white p-6 transition hover:border-neutral-400 hover:shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-lg">
                ▤
              </div>

              <h3 className="mt-5 font-semibold">
                Reports
              </h3>

              <p className="mt-2 text-sm leading-6 text-neutral-500">
                Review participant, approval and Collection performance data.
              </p>

              <p className="mt-5 text-sm font-medium">
                View reports â†’
              </p>
            </Link>

            <Link
              href={`/dashboard/collections/${collection.id}/activity`}
              className="rounded-2xl border bg-white p-6 transition hover:border-neutral-400 hover:shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-lg">
                ◷
              </div>

              <h3 className="mt-5 font-semibold">
                Activity
              </h3>

              <p className="mt-2 text-sm leading-6 text-neutral-500">
                Review joins, approvals, participant changes and Collection events.
              </p>

              <p className="mt-5 text-sm font-medium">
                View activity â†’
              </p>
            </Link>

            <div className="rounded-2xl border bg-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-lg">
                  ₦
                </div>

                <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                  Live
                </span>
              </div>

              <h3 className="mt-5 font-semibold">
                Payments & Settlement
              </h3>

              <p className="mt-2 text-sm leading-6 text-neutral-500">
                Financial totals are now calculated from verified Threeple payment records.
              </p>

              <p className="mt-5 text-sm font-medium">
                Organizer net:{" "}
                {formatMoney(
                  organizerNet,
                  collection.currency
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border bg-white p-6 md:p-8">
          <h2 className="text-lg font-semibold">
            Collection Details
          </h2>

          <div className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <div>
              <p className="text-xs text-neutral-400">
                Type
              </p>

              <p className="mt-1 text-sm font-medium">
                {friendlyText(
                  collection.collection_type
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-neutral-400">
                Mode
              </p>

              <p className="mt-1 text-sm font-medium">
                {friendlyText(
                  collection.collection_mode
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-neutral-400">
                Visibility
              </p>

              <p className="mt-1 text-sm font-medium">
                {friendlyText(
                  collection.visibility
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-neutral-400">
                Access
              </p>

              <p className="mt-1 text-sm font-medium">
                {friendlyText(
                  collection.access_mode
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-neutral-400">
                Deadline
              </p>

              <p className="mt-1 text-sm font-medium">
                {collection.deadline
                  ? new Date(
                      collection.deadline
                    ).toLocaleString(
                      "en-NG"
                    )
                  : "No deadline"}
              </p>
            </div>

            <div>
              <p className="text-xs text-neutral-400">
                Approval
              </p>

              <p className="mt-1 text-sm font-medium">
                {collection.requires_approval
                  ? "Required"
                  : "Not required"}
              </p>
            </div>

            {collection.closed_at && (
              <div>
                <p className="text-xs text-neutral-400">
                  Closed
                </p>

                <p className="mt-1 text-sm font-medium">
                  {new Date(
                    collection.closed_at
                  ).toLocaleString(
                    "en-NG"
                  )}
                </p>
              </div>
            )}

            {collection.archived_at && (
              <div>
                <p className="text-xs text-neutral-400">
                  Archived
                </p>

                <p className="mt-1 text-sm font-medium">
                  {new Date(
                    collection.archived_at
                  ).toLocaleString(
                    "en-NG"
                  )}
                </p>
              </div>
            )}
          </div>
        </section>

        {collection.status ===
          "draft" &&
        !isArchived && (
          <section className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Draft Collection
            </p>

            <h2 className="mt-2 text-xl font-semibold text-amber-950">
              Ready to start collecting?
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-800">
              Review the Collection settings before activation. Once active, its core structure becomes locked.
            </p>

            <form
              action={
                activateCollection
              }
              className="mt-5"
            >
              <input
                type="hidden"
                name="collection_id"
                value={
                  collection.id
                }
              />

              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-semibold text-white hover:bg-neutral-800"
              >
                Activate Collection
              </button>
            </form>
          </section>
        )}

        {!isArchived &&
          collection.status !==
            "draft" && (
            <section className="mt-8 rounded-3xl border bg-white p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Collection Lifecycle
              </p>

              <h2 className="mt-2 text-xl font-semibold">
                Manage Collection Status
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                Closing a Collection stops normal joining. Closed Collections can be reopened or archived without deleting history.
              </p>

              {collection.status ===
                "active" && (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <h3 className="font-semibold text-amber-950">
                    Close Collection
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-amber-800">
                    Close this Collection when you no longer want new participants joining.
                  </p>

                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-semibold text-amber-900">
                      Close Collection
                    </summary>

                    <div className="mt-4 rounded-xl border border-amber-200 bg-white p-4">
                      <p className="text-sm text-neutral-700">
                        Confirm that you want to close{" "}
                        <strong>
                          {collection.title}
                        </strong>
                        .
                      </p>

                      <form
                        action={
                          closeCollection
                        }
                        className="mt-4"
                      >
                        <input
                          type="hidden"
                          name="collection_id"
                          value={
                            collection.id
                          }
                        />

                        <button
                          type="submit"
                          className="inline-flex h-10 items-center justify-center rounded-lg bg-amber-700 px-4 text-sm font-semibold text-white hover:bg-amber-800"
                        >
                          Yes, Close Collection
                        </button>
                      </form>
                    </div>
                  </details>
                </div>
              )}

              {collection.status ===
                "closed" && (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
                    <h3 className="font-semibold text-green-950">
                      Reopen Collection
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-green-800">
                      Reopen this Collection to allow normal participation again.
                    </p>

                    <form
                      action={
                        reopenCollection
                      }
                      className="mt-4"
                    >
                      <input
                        type="hidden"
                        name="collection_id"
                        value={
                          collection.id
                        }
                      />

                      <button
                        type="submit"
                        className="inline-flex h-10 items-center justify-center rounded-lg bg-black px-4 text-sm font-semibold text-white"
                      >
                        Reopen Collection
                      </button>
                    </form>
                  </div>

                  <div className="rounded-2xl border bg-neutral-50 p-5">
                    <h3 className="font-semibold">
                      Archive Collection
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                      Move this Collection out of normal operations while preserving its history.
                    </p>

                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-semibold">
                        Archive Collection
                      </summary>

                      <div className="mt-4 rounded-xl border bg-white p-4">
                        <form
                          action={
                            archiveCollection
                          }
                        >
                          <input
                            type="hidden"
                            name="collection_id"
                            value={
                              collection.id
                            }
                          />

                          <button
                            type="submit"
                            className="inline-flex h-10 items-center justify-center rounded-lg bg-neutral-900 px-4 text-sm font-semibold text-white"
                          >
                            Yes, Archive Collection
                          </button>
                        </form>
                      </div>
                    </details>
                  </div>
                </div>
              )}

              {collection.status ===
                "cancelled" && (
                <div className="mt-6 rounded-2xl border bg-neutral-50 p-5">
                  <h3 className="font-semibold">
                    Archive Cancelled Collection
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    Preserve the historical record while removing the Collection from normal operations.
                  </p>

                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-semibold">
                      Archive Collection
                    </summary>

                    <form
                      action={
                        archiveCollection
                      }
                      className="mt-4"
                    >
                      <input
                        type="hidden"
                        name="collection_id"
                        value={
                          collection.id
                        }
                      />

                      <button
                        type="submit"
                        className="inline-flex h-10 items-center justify-center rounded-lg bg-neutral-900 px-4 text-sm font-semibold text-white"
                      >
                        Yes, Archive Collection
                      </button>
                    </form>
                  </details>
                </div>
              )}
            </section>
          )}
      </div>
    </main>
  );
}


