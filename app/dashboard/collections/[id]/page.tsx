import Link from "next/link";

import {
  notFound,
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
  ThreepleProgress,
  ThreepleStat,
} from "@/components/threeple/design-system";

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
    return "â€”";
  }

  const numeric =
    Number(amount);

  if (
    Number.isNaN(numeric)
  ) {
    return "â€”";
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

function formatDate(
  value: string | null
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
      dateStyle: "medium",
    }
  );
}

function statusStyle(
  status: string
) {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-800";

    case "draft":
      return "bg-amber-100 text-amber-800";

    case "closed":
      return "bg-slate-200 text-slate-700";

    case "cancelled":
      return "bg-red-100 text-red-700";

    default:
      return "bg-slate-100 text-slate-600";
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
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (
    type === "error"
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-indigo-200 bg-indigo-50 text-indigo-700";
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
      gross_processed,
      refunded_amount,
      platform_revenue,
      processor_fees,
      organizer_net
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
      financialSummary?.gross_processed ??
        0
    );

  const refundedAmount =
    Number(
      financialSummary?.refunded_amount ??
        0
    );

  const platformRevenue =
    Number(
      financialSummary?.platform_revenue ??
        0
    );

  const processorFees =
    Number(
      financialSummary?.processor_fees ??
        0
    );

  const organizerNet =
    Number(
      financialSummary?.organizer_net ??
        0
    );

  const verifiedPaymentCount =
    Number(
      financialSummary?.verified_payment_count ??
        0
    );

  const amountRaised =
    Math.max(
      0,
      grossProcessed -
        refundedAmount
    );

  const targetAmount =
    collection.target_amount !==
      null
      ? Number(
          collection.target_amount
        )
      : null;

  const defaultAmount =
    collection.default_amount !==
      null
      ? Number(
          collection.default_amount
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

  const isGoalBased =
    collection.collection_mode ===
      "target" ||
    collection.collection_mode ===
      "flexible";

  const isFixed =
    collection.collection_mode ===
      "fixed_per_person" ||
    collection.collection_mode ===
      "event_fee";

  const message =
    resultMessage(
      query?.result
    );

  return (
    <ThreepleAppShell
      title={collection.title}
      subtitle={organization.name}
      status={
        <ThreepleBadge
          tone={
            collection.status === "active"
              ? "success"
              : collection.status === "draft"
                ? "warning"
                : collection.status === "cancelled"
                  ? "danger"
                  : "neutral"
          }
        >
          {friendlyText(collection.status)}
        </ThreepleBadge>
      }
      actions={
        !isArchived ? (
          <Link
            href={`/dashboard/collections/${collection.id}/edit`}
            className="tp-btn tp-btn-secondary hidden sm:inline-flex"
          >
            Settings
          </Link>
        ) : undefined
      }
    >
      <div className="mx-auto max-w-6xl">
        {message && (
          <div
            className={[
              "mb-6 rounded-2xl border px-4 py-3 text-sm",
              message.type === "success"
                ? "border-[var(--tp-success-border)] bg-[var(--tp-success-soft)] text-[var(--tp-success)]"
                : message.type === "error"
                  ? "border-[var(--tp-danger-border)] bg-[var(--tp-danger-soft)] text-[var(--tp-danger)]"
                  : "border-[var(--tp-primary-border)] bg-[var(--tp-primary-soft)] text-[var(--tp-primary)]",
            ].join(" ")}
          >
            {message.text}
          </div>
        )}

        {isArchived && (
          <section className="mb-6 rounded-[1.5rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-[var(--tp-ink)]">
                  This collection is archived
                </p>

                <p className="mt-1 text-sm leading-6 text-[var(--tp-muted)]">
                  Its contribution and financial history is preserved.
                </p>
              </div>

              <form action={restoreCollection}>
                <input
                  type="hidden"
                  name="collection_id"
                  value={collection.id}
                />

                <button
                  type="submit"
                  className="tp-btn tp-btn-primary"
                >
                  Restore collection
                </button>
              </form>
            </div>
          </section>
        )}

        {/* COLLECTION IDENTITY */}
        <section className="pb-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <ThreepleBadge
                  tone={
                    collection.status === "active"
                      ? "success"
                      : collection.status === "draft"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {friendlyText(collection.status)}
                </ThreepleBadge>

                <ThreepleBadge>
                  {friendlyText(collection.collection_type)}
                </ThreepleBadge>

                <ThreepleBadge tone="primary">
                  {isGoalBased
                    ? "Goal contribution"
                    : isFixed
                      ? "Fixed contribution"
                      : friendlyText(collection.collection_mode)}
                </ThreepleBadge>
              </div>

              <h1 className="mt-4 max-w-4xl text-3xl font-black tracking-[-0.045em] text-[var(--tp-ink)] sm:text-4xl">
                {collection.title}
              </h1>

              {collection.description && (
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--tp-muted)]">
                  {collection.description}
                </p>
              )}

              <p className="mt-4 text-sm text-[var(--tp-muted)]">
                {participantCount ?? 0} participants
                {" - "}
                {formatDate(collection.deadline)}
                {" - "}
                {organization.name}
              </p>
            </div>
          </div>
        </section>

        {/* PRIMARY METRICS */}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ThreepleStat
            label="Participants"
            value={participantCount ?? 0}
            helper="Active people in this collection."
          />

          <ThreepleStat
            label="Collected"
            value={formatMoney(
              amountRaised,
              collection.currency
            )}
            helper="Verified contribution value."
            tone="primary"
          />

          <ThreepleStat
            label="Contributions"
            value={verifiedPaymentCount}
            helper="Verified payment records."
          />

          <ThreepleStat
            label="Organizer net"
            value={formatMoney(
              organizerNet,
              collection.currency
            )}
            helper="After recorded fees."
            tone="success"
          />
        </section>

        {/* PROGRESS */}
        {isGoalBased &&
          targetAmount !== null && (
            <section className="mt-6 tp-card p-5 sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="tp-kicker">
                    Progress
                  </p>

                  <p className="mt-2 text-2xl font-black tracking-[-0.035em] text-[var(--tp-ink)]">
                    {formatMoney(
                      amountRaised,
                      collection.currency
                    )}
                  </p>

                  <p className="mt-1 text-sm text-[var(--tp-muted)]">
                    of{" "}
                    {formatMoney(
                      targetAmount,
                      collection.currency
                    )}
                  </p>
                </div>

                <div className="sm:text-right">
                  <p className="text-3xl font-black text-[var(--tp-primary)]">
                    {progressPercent ?? 0}%
                  </p>

                  {outstandingAmount !== null && (
                    <p className="mt-1 text-xs text-[var(--tp-muted)]">
                      {formatMoney(
                        outstandingAmount,
                        collection.currency
                      )}{" "}
                      remaining
                    </p>
                  )}
                </div>
              </div>

              <ThreepleProgress
                className="mt-5"
                value={progressPercent ?? 0}
              />
            </section>
          )}

        {/* SINGLE WORKSPACE NAVIGATION */}
        <section className="mt-8 border-y border-[var(--tp-border)] py-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Link
              href={`/dashboard/collections/${collection.id}/participants`}
              className="tp-btn tp-btn-secondary shrink-0"
            >
              Participants
            </Link>

            {collection.collection_mode === "rotating_pool" && (
              <Link
                href={`/dashboard/collections/${collection.id}/rotation`}
                className="tp-btn tp-btn-secondary shrink-0"
              >
                Ajo cycles
              </Link>
            )}

            {collection.collection_mode === "recurring_dues" && (
              <Link
                href={`/dashboard/collections/${collection.id}/recurring`}
                className="tp-btn tp-btn-secondary shrink-0"
              >
                Recurring dues
              </Link>
            )}

            <Link
              href={`/dashboard/collections/${collection.id}/activity`}
              className="tp-btn tp-btn-secondary shrink-0"
            >
              Activity
            </Link>

            <Link
              href={`/dashboard/collections/${collection.id}/reports`}
              className="tp-btn tp-btn-secondary shrink-0"
            >
              Reports
            </Link>

            {!isArchived && (
              <Link
                href={`/dashboard/collections/${collection.id}/edit`}
                className="tp-btn tp-btn-secondary shrink-0"
              >
                Settings
              </Link>
            )}

            {collection.status === "active" &&
              !isArchived && (
                <Link
                  href={`/dashboard/collections/${collection.id}/invite`}
                  className="tp-btn tp-btn-primary shrink-0"
                >
                  Invite people
                </Link>
              )}
          </div>
        </section>

        {/* DETAILS + INVITE */}
        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <div className="tp-card p-6 sm:p-7">
            <p className="tp-kicker">
              Collection details
            </p>

            <h2 className="tp-heading mt-2 text-2xl">
              How this collection works
            </h2>

            <div className="mt-6 divide-y divide-[var(--tp-border)]">
              <div className="flex items-center justify-between gap-5 py-4 first:pt-0">
                <span className="text-sm text-[var(--tp-muted)]">
                  Contribution model
                </span>

                <span className="text-right text-sm font-bold text-[var(--tp-ink)]">
                  {isGoalBased
                    ? "Goal contribution"
                    : isFixed
                      ? "Fixed contribution"
                      : friendlyText(collection.collection_mode)}
                </span>
              </div>

              {defaultAmount !== null && (
                <div className="flex items-center justify-between gap-5 py-4">
                  <span className="text-sm text-[var(--tp-muted)]">
                    Contribution amount
                  </span>

                  <span className="text-right text-sm font-bold text-[var(--tp-ink)]">
                    {formatMoney(
                      defaultAmount,
                      collection.currency
                    )}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between gap-5 py-4">
                <span className="text-sm text-[var(--tp-muted)]">
                  Visibility
                </span>

                <span className="text-right text-sm font-bold text-[var(--tp-ink)]">
                  {friendlyText(collection.visibility)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-5 py-4">
                <span className="text-sm text-[var(--tp-muted)]">
                  Join approval
                </span>

                <span className="text-right text-sm font-bold text-[var(--tp-ink)]">
                  {collection.requires_approval
                    ? "Required"
                    : "Automatic"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-5 py-4">
                <span className="text-sm text-[var(--tp-muted)]">
                  Partial payments
                </span>

                <span className="text-right text-sm font-bold text-[var(--tp-ink)]">
                  {collection.allow_partial_payments
                    ? "Allowed"
                    : "Not allowed"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-5 py-4 last:pb-0">
                <span className="text-sm text-[var(--tp-muted)]">
                  Deadline
                </span>

                <span className="text-right text-sm font-bold text-[var(--tp-ink)]">
                  {formatDate(collection.deadline)}
                </span>
              </div>
            </div>
          </div>

          <div className="tp-card p-6 sm:p-7">
            <p className="tp-kicker">
              Join code
            </p>

            <h2 className="tp-heading mt-2 text-2xl">
              Bring people in
            </h2>

            <p className="mt-2 text-sm leading-6 text-[var(--tp-muted)]">
              Share this code with the people who should join this collection.
            </p>

            <div className="mt-6 rounded-2xl border border-[var(--tp-primary-border)] bg-[var(--tp-primary-soft)] px-5 py-6 text-center">
              <p className="font-mono text-3xl font-black tracking-[0.16em] text-[var(--tp-primary)]">
                {collection.join_code}
              </p>
            </div>

            {collection.status === "active" &&
              !isArchived && (
                <div className="mt-5">
                  <Link
                    href={`/dashboard/collections/${collection.id}/invite`}
                    className="tp-btn tp-btn-primary w-full"
                  >
                    Share collection
                  </Link>
                </div>
              )}
          </div>
        </section>

        {/* FINANCIAL POSITION */}
        <section className="mt-8 tp-card overflow-hidden">
          <div className="border-b border-[var(--tp-border)] p-6 sm:p-7">
            <p className="tp-kicker">
              Financial position
            </p>

            <h2 className="tp-heading mt-2 text-2xl">
              Verified ledger
            </h2>

            <p className="mt-2 text-sm text-[var(--tp-muted)]">
              Contribution volume, refunds and fees recorded for this collection.
            </p>
          </div>

          <div className="grid divide-y divide-[var(--tp-border)] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            <div className="p-6">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--tp-muted)]">
                Gross processed
              </p>

              <p className="mt-3 text-xl font-black text-[var(--tp-ink)]">
                {formatMoney(
                  grossProcessed,
                  collection.currency
                )}
              </p>
            </div>

            <div className="p-6">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--tp-muted)]">
                Refunded
              </p>

              <p className="mt-3 text-xl font-black text-[var(--tp-ink)]">
                {formatMoney(
                  refundedAmount,
                  collection.currency
                )}
              </p>
            </div>

            <div className="p-6">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--tp-muted)]">
                Threeple fee
              </p>

              <p className="mt-3 text-xl font-black text-[var(--tp-ink)]">
                {formatMoney(
                  platformRevenue,
                  collection.currency
                )}
              </p>
            </div>

            <div className="p-6">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--tp-muted)]">
                Processor fees
              </p>

              <p className="mt-3 text-xl font-black text-[var(--tp-ink)]">
                {formatMoney(
                  processorFees,
                  collection.currency
                )}
              </p>
            </div>
          </div>
        </section>

        {/* DRAFT ACTIVATION */}
        {collection.status === "draft" &&
          !isArchived && (
            <section className="mt-8 rounded-[1.5rem] border border-[var(--tp-primary-border)] bg-[var(--tp-primary-soft)] p-6 sm:p-7">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--tp-primary)]">
                Draft
              </p>

              <h2 className="mt-2 text-xl font-black text-[var(--tp-ink)]">
                Ready to start?
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--tp-muted)]">
                Review the collection rules first. Once activated, participants can begin joining.
              </p>

              <form
                action={activateCollection}
                className="mt-5"
              >
                <input
                  type="hidden"
                  name="collection_id"
                  value={collection.id}
                />

                <button
                  type="submit"
                  className="tp-btn tp-btn-primary"
                >
                  Activate collection
                </button>
              </form>
            </section>
          )}

        {/* LIFECYCLE */}
        {!isArchived &&
          collection.status !== "draft" && (
            <section className="mt-8 border-t border-[var(--tp-border)] pt-7">
              <p className="tp-kicker">
                Lifecycle
              </p>

              <h2 className="tp-heading mt-2 text-xl">
                Collection status
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--tp-muted)]">
                Closing or archiving changes availability without removing the collection's financial history.
              </p>

              {collection.status === "active" && (
                <details className="mt-5 rounded-2xl border border-[var(--tp-border)] bg-[var(--tp-surface)] p-5">
                  <summary className="cursor-pointer text-sm font-bold text-[var(--tp-ink)]">
                    Close collection
                  </summary>

                  <div className="mt-4">
                    <p className="text-sm text-[var(--tp-muted)]">
                      This stops normal joining. The collection can be reopened later.
                    </p>

                    <form
                      action={closeCollection}
                      className="mt-4"
                    >
                      <input
                        type="hidden"
                        name="collection_id"
                        value={collection.id}
                      />

                      <button
                        type="submit"
                        className="tp-btn tp-btn-secondary"
                      >
                        Confirm close
                      </button>
                    </form>
                  </div>
                </details>
              )}

              {collection.status === "closed" && (
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <form action={reopenCollection}>
                    <input
                      type="hidden"
                      name="collection_id"
                      value={collection.id}
                    />

                    <button
                      type="submit"
                      className="tp-btn tp-btn-primary"
                    >
                      Reopen collection
                    </button>
                  </form>

                  <details className="rounded-xl border border-[var(--tp-border)] bg-[var(--tp-surface)] px-4 py-3">
                    <summary className="cursor-pointer text-sm font-bold">
                      Archive
                    </summary>

                    <form
                      action={archiveCollection}
                      className="mt-4"
                    >
                      <input
                        type="hidden"
                        name="collection_id"
                        value={collection.id}
                      />

                      <button
                        type="submit"
                        className="tp-btn tp-btn-secondary"
                      >
                        Confirm archive
                      </button>
                    </form>
                  </details>
                </div>
              )}

              {collection.status === "cancelled" && (
                <details className="mt-5 rounded-2xl border border-[var(--tp-border)] bg-[var(--tp-surface)] p-5">
                  <summary className="cursor-pointer text-sm font-bold">
                    Archive cancelled collection
                  </summary>

                  <form
                    action={archiveCollection}
                    className="mt-4"
                  >
                    <input
                      type="hidden"
                      name="collection_id"
                      value={collection.id}
                    />

                    <button
                      type="submit"
                      className="tp-btn tp-btn-secondary"
                    >
                      Confirm archive
                    </button>
                  </form>
                </details>
              )}
            </section>
          )}

        <section className="mt-8 border-t border-[var(--tp-border)] pt-7">
          <Link
            href={`/dashboard/collections/${collection.id}/lifecycle`}
            className="text-sm font-bold text-[var(--tp-danger)]"
          >
            Advanced lifecycle controls
          </Link>
        </section>
      </div>
    </ThreepleAppShell>
  );
}