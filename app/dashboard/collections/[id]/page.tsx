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
    <main className="min-h-screen bg-[#f6f3fb] text-[#20172a]">
      <header className="border-b border-[#eadff4] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <Link
              href="/dashboard"
              className="text-2xl font-black tracking-tight text-[#4d2267]"
            >
              Threeple
            </Link>

            <p className="mt-1 text-sm text-[#8b7799]">
              Together, clearly.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-full border border-[#e7daef] bg-white px-4 py-2 text-sm font-bold text-[#5e496d] transition hover:bg-[#f6f3fb]"
          >
            Back to dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {message && (
          <div
            className={`mb-6 rounded-2xl border p-4 text-sm font-medium ${messageStyle(
              message.type
            )}`}
          >
            {message.text}
          </div>
        )}

        {isArchived && (
          <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold">
                  This collection is archived
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Its history is safe. Restore it when you are ready to continue managing contributions.
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
                  className="h-11 rounded-full bg-[#4d2267] px-5 text-sm font-bold text-white transition hover:opacity-90"
                >
                  Restore collection
                </button>
              </form>
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-[#4d2267] via-[#6b358b] to-[#8b4dab] text-white shadow-[0_24px_70px_rgba(77,34,103,0.18)]">
          <div className="p-7 md:p-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyle(
                      collection.status
                    )}`}
                  >
                    {friendlyText(
                      collection.status
                    )}
                  </span>

                  <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-bold text-white/80">
                    {friendlyText(
                      collection.collection_type
                    )}
                  </span>

                  <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-bold text-white/80">
                    {isGoalBased
                      ? "Goal contribution"
                      : isFixed
                        ? "Fixed contribution"
                        : friendlyText(
                            collection.collection_mode
                          )}
                  </span>
                </div>

                <h1 className="mt-5 text-4xl font-black tracking-[-0.04em] md:text-5xl">
                  {collection.title}
                </h1>

                {collection.description && (
                  <p className="mt-4 max-w-2xl text-base leading-7 text-white/70">
                    {collection.description}
                  </p>
                )}

                <div className="mt-7 flex flex-wrap gap-3 text-sm text-white/70">
                  <span>
                    {participantCount ??
                      0}{" "}
                    participant
                    {(participantCount ??
                      0) === 1
                      ? ""
                      : "s"}
                  </span>

                  <span className="text-white/30">
                    â€¢
                  </span>

                  <span>
                    Deadline:{" "}
                    {formatDate(
                      collection.deadline
                    )}
                  </span>

                  <span className="text-white/30">
                    â€¢
                  </span>

                  <span>
                    {organization.name}
                  </span>
                </div>
              </div>

              {!isArchived && (
                <Link
                  href={`/dashboard/collections/${collection.id}/edit`}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-black text-[#4d2267] transition hover:bg-white/90"
                >
                  Edit collection
                </Link>
              )}
            </div>

            {isGoalBased &&
              targetAmount !== null && (
                <div className="mt-10 rounded-[1.75rem] bg-white/10 p-5 backdrop-blur md:p-6">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                        Goal progress
                      </p>

                      <p className="mt-2 text-3xl font-black md:text-4xl">
                        {formatMoney(
                          amountRaised,
                          collection.currency
                        )}
                      </p>

                      <p className="mt-1 text-sm text-white/55">
                        of{" "}
                        {formatMoney(
                          targetAmount,
                          collection.currency
                        )}{" "}
                        raised
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-4xl font-black">
                        {progressPercent ??
                          0}
                        %
                      </p>

                      <p className="mt-1 text-sm text-white/55">
                        {outstandingAmount !==
                        null
                          ? `${formatMoney(
                              outstandingAmount,
                              collection.currency
                            )} to go`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-[#ffd166] transition-all"
                      style={{
                        width:
                          `${progressPercent ?? 0}%`,
                      }}
                    />
                  </div>
                </div>
              )}

            {isFixed &&
              defaultAmount !== null && (
                <div className="mt-10 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-[1.5rem] bg-white/10 p-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-white/45">
                      Each person contributes
                    </p>

                    <p className="mt-2 text-2xl font-black">
                      {formatMoney(
                        defaultAmount,
                        collection.currency
                      )}
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] bg-white/10 p-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-white/45">
                      Verified contributions
                    </p>

                    <p className="mt-2 text-2xl font-black">
                      {verifiedPaymentCount}
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] bg-white/10 p-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-white/45">
                      Total recorded
                    </p>

                    <p className="mt-2 text-2xl font-black">
                      {formatMoney(
                        amountRaised,
                        collection.currency
                      )}
                    </p>
                  </div>
                </div>
              )}
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[1.75rem] border border-[#eadff4] bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#a38caf]">
              People together
            </p>

            <p className="mt-3 text-3xl font-black text-[#3f2450]">
              {participantCount ?? 0}
            </p>

            <p className="mt-2 text-xs leading-5 text-[#8f7a9c]">
              Active participants currently part of this collection.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-[#eadff4] bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#a38caf]">
              Verified collected
            </p>

            <p className="mt-3 text-2xl font-black text-[#3f2450]">
              {formatMoney(
                amountRaised,
                collection.currency
              )}
            </p>

            <p className="mt-2 text-xs leading-5 text-[#8f7a9c]">
              Contribution value currently verified in Threeple.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-[#eadff4] bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#a38caf]">
              Verified contributors
            </p>

            <p className="mt-3 text-3xl font-black text-[#3f2450]">
              {verifiedPaymentCount}
            </p>

            <p className="mt-2 text-xs leading-5 text-[#8f7a9c]">
              Contributions confirmed through the payment ledger.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-[#d9eadf] bg-[#effaf3] p-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#4f8c68]">
              Organizer net
            </p>

            <p className="mt-3 text-2xl font-black text-[#214f34]">
              {formatMoney(
                organizerNet,
                collection.currency
              )}
            </p>

            <p className="mt-2 text-xs leading-5 text-[#5e8c70]">
              Net position after recorded platform and processor fees.
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-8 xl:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-[2rem] border border-[#eadff4] bg-white p-6 md:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a38caf]">
                  Transparency
                </p>

                <h2 className="mt-2 text-2xl font-black text-[#3f2450]">
                  Everyone should know where things stand.
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#806f8c]">
                  Threeple keeps contribution progress visible while respecting the privacy choices you selected.
                </p>
              </div>

              <Link
                href={`/dashboard/collections/${collection.id}/participants`}
                className="h-10 rounded-full border border-[#e7daef] px-4 py-2 text-sm font-bold text-[#5b3d68] transition hover:bg-[#f6f3fb]"
              >
                View people
              </Link>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#f8f5fb] p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-[#9a83a7]">
                  Participant names
                </p>

                <p className="mt-2 text-lg font-black text-[#432854]">
                  {collection.show_participant_names
                    ? "Visible"
                    : "Private"}
                </p>

                <p className="mt-2 text-xs leading-5 text-[#8a7595]">
                  {collection.show_participant_names
                    ? "Members can see who else is participating."
                    : "Other participant names remain hidden."}
                </p>
              </div>

              <div className="rounded-2xl bg-[#f8f5fb] p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-[#9a83a7]">
                  Contribution amounts
                </p>

                <p className="mt-2 text-lg font-black text-[#432854]">
                  {collection.show_payment_amounts
                    ? "Visible"
                    : "Private"}
                </p>

                <p className="mt-2 text-xs leading-5 text-[#8a7595]">
                  {collection.show_payment_amounts
                    ? "Members can see contribution amounts in the shared ledger."
                    : "Other participants' amounts remain hidden."}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#f3e5ba] bg-[#fff9e9] p-5">
              <p className="font-bold text-[#755f1e]">
                Shared contribution principle
              </p>

              <p className="mt-2 text-sm leading-6 text-[#8b793e]">
                Participants always see their own contribution status and the overall collection progress. Privacy settings only control what they see about other people.
              </p>
            </div>
          </div>

          <div className="rounded-[2rem] bg-[#fff7dc] p-6 md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9b7a1e]">
              Invite people
            </p>

            <h2 className="mt-2 text-2xl font-black text-[#59450f]">
              Your Threeple Code
            </h2>

            <div className="mt-6 rounded-2xl bg-white/80 p-5 text-center">
              <p className="font-mono text-3xl font-black tracking-[0.18em] text-[#4d2267]">
                {collection.join_code}
              </p>
            </div>

            <p className="mt-4 text-sm leading-6 text-[#826c30]">
              Share the code or invite link with the people you want to bring into this collection.
            </p>

            {collection.status ===
              "active" &&
              !isArchived && (
                <div className="mt-6 grid gap-3">
                  <Link
                    href={`/dashboard/collections/${collection.id}/invite`}
                    className="inline-flex h-11 items-center justify-center rounded-full bg-[#4d2267] px-5 text-sm font-black text-white transition hover:opacity-90"
                  >
                    Share collection
                  </Link>

                  <Link
                    href={`/join?code=${encodeURIComponent(
                      collection.join_code
                    )}`}
                    target="_blank"
                    className="inline-flex h-11 items-center justify-center rounded-full border border-[#e6d496] bg-white px-5 text-sm font-bold text-[#705a1b] transition hover:bg-[#fffdf6]"
                  >
                    Preview join page
                  </Link>
                </div>
              )}
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-[2rem] border border-[#eadff4] bg-white">
          <div className="border-b border-[#eee4f4] px-6 py-5 md:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a38caf]">
              Financial picture
            </p>

            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-black text-[#3f2450]">
                  Where the money stands
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#806f8c]">
                  Verified contribution volume, refunds, fees and the organizer position.
                </p>
              </div>

              <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                Verified ledger
              </span>
            </div>
          </div>

          <div className="grid gap-px bg-[#eee4f4] sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white p-6">
              <p className="text-xs font-bold uppercase tracking-wide text-[#9d88a8]">
                Gross processed
              </p>

              <p className="mt-3 text-2xl font-black text-[#3f2450]">
                {formatMoney(
                  grossProcessed,
                  collection.currency
                )}
              </p>
            </div>

            <div className="bg-white p-6">
              <p className="text-xs font-bold uppercase tracking-wide text-[#9d88a8]">
                Refunded
              </p>

              <p className="mt-3 text-2xl font-black text-[#3f2450]">
                {formatMoney(
                  refundedAmount,
                  collection.currency
                )}
              </p>
            </div>

            <div className="bg-white p-6">
              <p className="text-xs font-bold uppercase tracking-wide text-[#9d88a8]">
                Threeple fee
              </p>

              <p className="mt-3 text-2xl font-black text-[#3f2450]">
                {formatMoney(
                  platformRevenue,
                  collection.currency
                )}
              </p>
            </div>

            <div className="bg-white p-6">
              <p className="text-xs font-bold uppercase tracking-wide text-[#9d88a8]">
                Processor fees
              </p>

              <p className="mt-3 text-2xl font-black text-[#3f2450]">
                {formatMoney(
                  processorFees,
                  collection.currency
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a38caf]">
            Organizer tools
          </p>

          <h2 className="mt-2 text-2xl font-black text-[#3f2450]">
            Keep the collection moving
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link
              href={`/dashboard/collections/${collection.id}/participants`}
              className="group rounded-[1.75rem] border border-[#eadff4] bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#efe5f5] font-black text-[#4d2267]">
                P
              </div>

              <h3 className="mt-5 font-black text-[#3f2450]">
                People
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#806f8c]">
                Review participants, approvals and contribution status.
              </p>

              <p className="mt-5 text-sm font-bold text-[#4d2267]">
                Manage people
              </p>
            </Link>

            {!isArchived ? (
              <Link
                href={`/dashboard/collections/${collection.id}/edit`}
                className="group rounded-[1.75rem] border border-[#eadff4] bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e9f5ed] font-black text-[#2e6b47]">
                  S
                </div>

                <h3 className="mt-5 font-black text-[#3f2450]">
                  Settings
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#806f8c]">
                  Update the deadline, visibility and participation rules.
                </p>

                <p className="mt-5 text-sm font-bold text-[#4d2267]">
                  Open settings
                </p>
              </Link>
            ) : (
              <div className="rounded-[1.75rem] border border-[#eadff4] bg-white p-6 opacity-50">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eee] font-black">
                  S
                </div>

                <h3 className="mt-5 font-black">
                  Settings
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#806f8c]">
                  Restore the collection before editing its settings.
                </p>
              </div>
            )}

            <Link
              href={`/dashboard/collections/${collection.id}/reports`}
              className="group rounded-[1.75rem] border border-[#eadff4] bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff1d6] font-black text-[#996815]">
                R
              </div>

              <h3 className="mt-5 font-black text-[#3f2450]">
                Reports
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#806f8c]">
                Review contribution, participation and collection performance.
              </p>

              <p className="mt-5 text-sm font-bold text-[#4d2267]">
                View reports
              </p>
            </Link>

            <Link
              href={`/dashboard/collections/${collection.id}/activity`}
              className="group rounded-[1.75rem] border border-[#eadff4] bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8f1ff] font-black text-[#3a6390]">
                A
              </div>

              <h3 className="mt-5 font-black text-[#3f2450]">
                Activity
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#806f8c]">
                See joins, approvals, changes and other collection events.
              </p>

              <p className="mt-5 text-sm font-bold text-[#4d2267]">
                View activity
              </p>
            </Link>

            {collection.status ===
              "active" &&
            !isArchived ? (
              <Link
                href={`/dashboard/collections/${collection.id}/invite`}
                className="group rounded-[1.75rem] border border-[#eadff4] bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff7dc] font-black text-[#8d6d12]">
                  I
                </div>

                <h3 className="mt-5 font-black text-[#3f2450]">
                  Invite
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#806f8c]">
                  Share your code, link and QR code with participants.
                </p>

                <p className="mt-5 text-sm font-bold text-[#4d2267]">
                  Invite people
                </p>
              </Link>
            ) : (
              <div className="rounded-[1.75rem] border border-[#eadff4] bg-white p-6 opacity-50">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eee] font-black">
                  I
                </div>

                <h3 className="mt-5 font-black">
                  Invite
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#806f8c]">
                  Activate and restore the collection before sharing invitations.
                </p>
              </div>
            )}

            <div className="rounded-[1.75rem] border border-[#d9eadf] bg-[#effaf3] p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white font-black text-[#2e6b47]">
                â‚¦
              </div>

              <h3 className="mt-5 font-black text-[#214f34]">
                Settlement snapshot
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#5f806c]">
                Your current organizer net position from verified payment records.
              </p>

              <p className="mt-5 text-lg font-black text-[#214f34]">
                {formatMoney(
                  organizerNet,
                  collection.currency
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-[#eadff4] bg-white p-6 md:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a38caf]">
            Collection setup
          </p>

          <h2 className="mt-2 text-xl font-black text-[#3f2450]">
            Rules everyone is contributing under
          </h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl bg-[#f8f5fb] p-4">
              <p className="text-xs text-[#9d88a8]">
                Contribution model
              </p>

              <p className="mt-1 font-bold">
                {isGoalBased
                  ? "Goal contribution"
                  : isFixed
                    ? "Fixed contribution"
                    : friendlyText(
                        collection.collection_mode
                      )}
              </p>
            </div>

            <div className="rounded-2xl bg-[#f8f5fb] p-4">
              <p className="text-xs text-[#9d88a8]">
                Visibility
              </p>

              <p className="mt-1 font-bold">
                {friendlyText(
                  collection.visibility
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-[#f8f5fb] p-4">
              <p className="text-xs text-[#9d88a8]">
                Join approval
              </p>

              <p className="mt-1 font-bold">
                {collection.requires_approval
                  ? "Organizer approval required"
                  : "Automatic"}
              </p>
            </div>

            <div className="rounded-2xl bg-[#f8f5fb] p-4">
              <p className="text-xs text-[#9d88a8]">
                Deadline
              </p>

              <p className="mt-1 font-bold">
                {formatDate(
                  collection.deadline
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-[#f8f5fb] p-4">
              <p className="text-xs text-[#9d88a8]">
                Partial payments
              </p>

              <p className="mt-1 font-bold">
                {collection.allow_partial_payments
                  ? "Allowed"
                  : "Not allowed"}
              </p>
            </div>

            <div className="rounded-2xl bg-[#f8f5fb] p-4">
              <p className="text-xs text-[#9d88a8]">
                Custom amounts
              </p>

              <p className="mt-1 font-bold">
                {collection.allow_custom_amount
                  ? "Allowed"
                  : "Not allowed"}
              </p>
            </div>
          </div>
        </section>

        {collection.status ===
          "draft" &&
        !isArchived && (
          <section className="mt-8 rounded-[2rem] border border-amber-200 bg-amber-50 p-6 md:p-8">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
              Draft collection
            </p>

            <h2 className="mt-2 text-xl font-black text-amber-950">
              Ready to bring people in?
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-800">
              Review the contribution rules and transparency settings first. Once active, participants can start joining.
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
                className="h-11 rounded-full bg-[#4d2267] px-5 text-sm font-black text-white transition hover:opacity-90"
              >
                Activate collection
              </button>
            </form>
          </section>
        )}

        {!isArchived &&
          collection.status !==
            "draft" && (
            <section className="mt-8 rounded-[2rem] border border-[#eadff4] bg-white p-6 md:p-8">
              <p className="text-xs font-bold uppercase tracking-wide text-[#a38caf]">
                Collection lifecycle
              </p>

              <h2 className="mt-2 text-xl font-black text-[#3f2450]">
                Manage collection status
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#806f8c]">
                Closing stops normal joining. Closed collections can be reopened or archived without losing history.
              </p>

              {collection.status ===
                "active" && (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <h3 className="font-black text-amber-950">
                    Close collection
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-amber-800">
                    Use this when you no longer want new participants joining.
                  </p>

                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-bold text-amber-900">
                      Close collection
                    </summary>

                    <div className="mt-4 rounded-xl border border-amber-200 bg-white p-4">
                      <p className="text-sm text-slate-700">
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
                          className="h-10 rounded-full bg-amber-700 px-4 text-sm font-bold text-white hover:bg-amber-800"
                        >
                          Yes, close collection
                        </button>
                      </form>
                    </div>
                  </details>
                </div>
              )}

              {collection.status ===
                "closed" && (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                    <h3 className="font-black text-emerald-950">
                      Reopen collection
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-emerald-800">
                      Allow participants to join again.
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
                        className="h-10 rounded-full bg-[#4d2267] px-4 text-sm font-bold text-white"
                      >
                        Reopen collection
                      </button>
                    </form>
                  </div>

                  <div className="rounded-2xl border bg-slate-50 p-5">
                    <h3 className="font-black">
                      Archive collection
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Move it out of normal operations while preserving its history.
                    </p>

                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-bold">
                        Archive collection
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
                            className="h-10 rounded-full bg-slate-900 px-4 text-sm font-bold text-white"
                          >
                            Yes, archive collection
                          </button>
                        </form>
                      </div>
                    </details>
                  </div>
                </div>
              )}

              {collection.status ===
                "cancelled" && (
                <div className="mt-6 rounded-2xl border bg-slate-50 p-5">
                  <h3 className="font-black">
                    Archive cancelled collection
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Preserve the historical record while removing it from normal operations.
                  </p>

                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-bold">
                      Archive collection
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
                        className="h-10 rounded-full bg-slate-900 px-4 text-sm font-bold text-white"
                      >
                        Yes, archive collection
                      </button>
                    </form>
                  </details>
                </div>
              )}
            </section>
          )}
      </div>
    
        <section className="mt-8 rounded-[2rem] border border-[var(--tp-danger-border)] bg-[var(--tp-danger-soft)] p-6 md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-danger)]">
            Collection lifecycle
          </p>
          <h2 className="mt-2 text-xl font-black text-[var(--tp-danger)]">
            Archive or remove this collection
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--tp-danger)]/80">
            Threeple protects participant and financial history when a collection is removed.
          </p>
          <a
            href={`/dashboard/collections/${collection.id}/lifecycle`}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--tp-danger)] px-5 text-sm font-black text-white"
          >
            Manage collection lifecycle
          </a>
        </section>
</main>
  );
}

