import Link from "next/link";

import {
  connection,
} from "next/server";

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
  approveRestrictionReview,
  declineRestrictionReview,
  startRestrictionReview,
} from "./actions";

export const instant = false;

type PageProps = {
  params: Promise<{
    requestId: string;
  }>;

  searchParams: Promise<{
    result?: string;
  }>;
};

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
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

function formatDateTime(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-NG",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone:
        "Africa/Lagos",
    }
  ).format(
    new Date(value)
  );
}

function resultMessage(
  value:
    | string
    | undefined
) {
  switch (value) {
    case "review_started":
      return {
        type: "success",
        text:
          "The review request is now marked Under Review.",
      };

    case "approved":
      return {
        type: "success",
        text:
          "The review request was approved. If the restriction was still active, it has been lifted.",
      };

    case "declined":
      return {
        type: "success",
        text:
          "The review request was declined. Any still-active restriction remains in force.",
      };

    case "notes_required":
      return {
        type: "error",
        text:
          "Enter admin notes of at least 10 characters before making a decision.",
      };

    case "already_decided":
      return {
        type: "info",
        text:
          "This review request has already received a final decision.",
      };

    case "already_started":
      return {
        type: "info",
        text:
          "This review request is no longer in Submitted status.",
      };

    case "restriction_missing":
      return {
        type: "error",
        text:
          "Threeple could not find the restriction record linked to this request.",
      };

    case "request_missing":
      return {
        type: "error",
        text:
          "The restriction review request could not be found.",
      };

    case "start_failed":
    case "decision_failed":
      return {
        type: "error",
        text:
          "Threeple could not complete this review action.",
      };

    default:
      return null;
  }
}

function statusStyle(
  value: string
) {
  switch (value) {
    case "submitted":
      return "bg-blue-100 text-blue-700";

    case "under_review":
      return "bg-amber-100 text-amber-700";

    case "approved":
      return "bg-green-100 text-green-700";

    case "declined":
      return "bg-red-100 text-red-700";

    default:
      return "bg-neutral-100 text-neutral-600";
  }
}

export default async function RestrictionReviewDetailPage({
  params,
  searchParams,
}: PageProps) {
  await connection();

  await requirePlatformAdmin();

  const {
    requestId,
  } = await params;

  const query =
    await searchParams;

  const {
    data: request,
    error,
  } = await supabaseAdmin
    .from(
      "restriction_review_requests"
    )
    .select(`
      id,
      requester_user_id,
      restriction_scope,
      restriction_subject_id,
      restriction_type,
      message,
      status,
      reviewed_by,
      admin_notes,
      reviewed_at,
      created_at,
      updated_at
    `)
    .eq(
      "id",
      requestId
    )
    .maybeSingle();

  if (
    error ||
    !request
  ) {
    notFound();
  }

  const {
    data: requesterProfile,
  } = await supabaseAdmin
    .from("profiles")
    .select(`
      full_name,
      phone
    `)
    .eq(
      "id",
      request.requester_user_id
    )
    .maybeSingle();

  const {
    data: requesterAuth,
  } =
    await supabaseAdmin.auth.admin.getUserById(
      request.requester_user_id
    );

  let restrictionRecord:
    | {
        id: string;
        restriction_type: string;
        reason: string;
        imposed_at: string;
        lifted_at:
          | string
          | null;
        trust_safety_report_id:
          | string
          | null;
      }
    | null = null;

  if (
    request.restriction_scope ===
    "user"
  ) {
    const {
      data,
    } = await supabaseAdmin
      .from(
        "user_restrictions"
      )
      .select(`
        id,
        restriction_type,
        reason,
        imposed_at,
        lifted_at,
        trust_safety_report_id
      `)
      .eq(
        "user_id",
        request.restriction_subject_id
      )
      .eq(
        "restriction_type",
        request.restriction_type
      )
      .order(
        "imposed_at",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

    restrictionRecord =
      data ?? null;
  }

  if (
    request.restriction_scope ===
    "organization"
  ) {
    const {
      data,
    } = await supabaseAdmin
      .from(
        "organization_restrictions"
      )
      .select(`
        id,
        restriction_type,
        reason,
        imposed_at,
        lifted_at,
        trust_safety_report_id
      `)
      .eq(
        "organization_id",
        request.restriction_subject_id
      )
      .eq(
        "restriction_type",
        request.restriction_type
      )
      .order(
        "imposed_at",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

    restrictionRecord =
      data ?? null;
  }

  if (
    request.restriction_scope ===
    "collection"
  ) {
    const {
      data,
    } = await supabaseAdmin
      .from(
        "collection_restrictions"
      )
      .select(`
        id,
        restriction_type,
        reason,
        imposed_at,
        lifted_at,
        trust_safety_report_id
      `)
      .eq(
        "collection_id",
        request.restriction_subject_id
      )
      .eq(
        "restriction_type",
        request.restriction_type
      )
      .order(
        "imposed_at",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

    restrictionRecord =
      data ?? null;
  }

  const activeRestriction =
    restrictionRecord &&
    !restrictionRecord.lifted_at
      ? restrictionRecord
      : null;

  const message =
    resultMessage(
      query.result
    );

  const canStart =
    request.status ===
    "submitted";

  const canDecide =
    [
      "submitted",
      "under_review",
    ].includes(
      request.status
    );

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <header className="border-b bg-neutral-950 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div>
            <Link
              href="/admin"
              className="text-2xl font-bold"
            >
              Threeple
            </Link>

            <p className="text-xs text-neutral-400">
              Platform Administration
            </p>
          </div>

          <Link
            href="/admin/restriction-reviews"
            className="text-sm font-semibold text-neutral-300 hover:text-white"
          >
            Review Queue
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Restriction Review
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Review Request
            </h1>

            <p className="mt-2 font-mono text-xs text-neutral-400">
              {request.id}
            </p>
          </div>

          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(
              request.status
            )}`}
          >
            {friendlyText(
              request.status
            )}
          </span>
        </div>

        {message && (
          <div
            className={`mt-6 rounded-2xl border p-4 text-sm ${
              message.type ===
              "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : message.type ===
                    "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-blue-200 bg-blue-50 text-blue-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <section className="mt-8 rounded-3xl border bg-white p-6 md:p-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-neutral-400">
                Requester
              </p>

              <Link
                href={`/admin/users/${request.requester_user_id}`}
                className="mt-1 block font-semibold hover:underline"
              >
                {requesterProfile?.full_name ||
                  "Threeple User"}
              </Link>

              <p className="mt-1 text-xs text-neutral-500">
                {requesterAuth.user?.email ??
                  "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-neutral-400">
                Scope
              </p>

              <p className="mt-1 font-semibold">
                {friendlyText(
                  request.restriction_scope
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-neutral-400">
                Restriction
              </p>

              <p className="mt-1 font-semibold">
                {friendlyText(
                  request.restriction_type
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-neutral-400">
                Submitted
              </p>

              <p className="mt-1 font-semibold">
                {formatDateTime(
                  request.created_at
                )}
              </p>
            </div>
          </div>

          <div className="mt-7">
            <p className="text-xs text-neutral-400">
              User Request
            </p>

            <p className="mt-2 whitespace-pre-wrap rounded-2xl bg-neutral-50 p-5 text-sm leading-7 text-neutral-700">
              {request.message}
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border bg-white p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Enforcement
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            Restriction Record
          </h2>

          {activeRestriction ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold text-red-950">
                  {friendlyText(
                    activeRestriction.restriction_type
                  )}
                </p>

                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                  Active
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-red-800">
                {activeRestriction.reason}
              </p>

              <p className="mt-3 text-xs text-red-700">
                Imposed{" "}
                {formatDateTime(
                  activeRestriction.imposed_at
                )}
              </p>

              {activeRestriction.trust_safety_report_id && (
                <Link
                  href={`/admin/trust-safety/${activeRestriction.trust_safety_report_id}`}
                  className="mt-4 inline-flex text-sm font-semibold text-red-900 hover:underline"
                >
                  Open Trust & Safety Case →
                </Link>
              )}
            </div>
          ) : restrictionRecord ? (
            <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold text-green-950">
                  {friendlyText(
                    restrictionRecord.restriction_type
                  )}
                </p>

                <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                  Already Lifted
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-green-800">
                The restriction linked to this review was lifted before the review reached its final decision. You can still approve or decline the review request to close the review record correctly.
              </p>

              <p className="mt-3 text-xs text-green-700">
                Lifted{" "}
                {formatDateTime(
                  restrictionRecord.lifted_at
                )}
              </p>

              {restrictionRecord.trust_safety_report_id && (
                <Link
                  href={`/admin/trust-safety/${restrictionRecord.trust_safety_report_id}`}
                  className="mt-4 inline-flex text-sm font-semibold text-green-900 hover:underline"
                >
                  Open Trust & Safety Case →
                </Link>
              )}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="font-semibold text-amber-950">
                Restriction record not found
              </p>

              <p className="mt-2 text-sm text-amber-800">
                Threeple could not locate a matching enforcement record for this review request.
              </p>
            </div>
          )}
        </section>

        {canStart && (
          <section className="mt-8 rounded-3xl border bg-white p-6 md:p-8">
            <h2 className="text-xl font-semibold">
              Start Review
            </h2>

            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Mark this request as Under Review before making a final decision.
            </p>

            <form
              action={
                startRestrictionReview
              }
              className="mt-5"
            >
              <input
                type="hidden"
                name="request_id"
                value={
                  request.id
                }
              />

              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-semibold text-white"
              >
                Start Review
              </button>
            </form>
          </section>
        )}

        {canDecide && (
          <section className="mt-8 rounded-3xl border bg-white p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Final Decision
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Decide Review Request
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
              Approving accepts the review request and lifts the restriction if it is still active. Declining closes the review without lifting an active restriction.
            </p>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <form
                action={
                  approveRestrictionReview
                }
                className="rounded-2xl border border-green-200 bg-green-50 p-5"
              >
                <input
                  type="hidden"
                  name="request_id"
                  value={
                    request.id
                  }
                />

                <h3 className="font-semibold text-green-950">
                  Approve Review
                </h3>

                <p className="mt-2 text-sm leading-6 text-green-800">
                  Accept this review request. If the restriction is still active, Threeple will lift it. If it was already lifted, the review will simply be closed as approved.
                </p>

                <textarea
                  name="admin_notes"
                  required
                  minLength={10}
                  rows={5}
                  placeholder="Explain why this review is being approved..."
                  className="mt-4 w-full rounded-xl border border-green-300 bg-white px-4 py-3 text-sm outline-none"
                />

                <button
                  type="submit"
                  className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-green-700 px-5 text-sm font-semibold text-white"
                >
                  Approve Review
                </button>
              </form>

              <form
                action={
                  declineRestrictionReview
                }
                className="rounded-2xl border border-red-200 bg-red-50 p-5"
              >
                <input
                  type="hidden"
                  name="request_id"
                  value={
                    request.id
                  }
                />

                <h3 className="font-semibold text-red-950">
                  Decline Review
                </h3>

                <p className="mt-2 text-sm leading-6 text-red-800">
                  Reject the review request. Any restriction that is still active will remain active.
                </p>

                <textarea
                  name="admin_notes"
                  required
                  minLength={10}
                  rows={5}
                  placeholder="Explain why this review is being declined..."
                  className="mt-4 w-full rounded-xl border border-red-300 bg-white px-4 py-3 text-sm outline-none"
                />

                <button
                  type="submit"
                  className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-red-700 px-5 text-sm font-semibold text-white"
                >
                  Decline Review
                </button>
              </form>
            </div>
          </section>
        )}

        {!canDecide && (
          <section className="mt-8 rounded-3xl border bg-white p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Decision Record
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              {friendlyText(
                request.status
              )}
            </h2>

            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-neutral-700">
              {request.admin_notes ||
                "No admin notes recorded."}
            </p>

            <p className="mt-4 text-xs text-neutral-400">
              Reviewed{" "}
              {formatDateTime(
                request.reviewed_at
              )}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}


