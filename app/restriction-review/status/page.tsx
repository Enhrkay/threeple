import Link from "next/link";

import {
  connection,
} from "next/server";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

export const instant = false;

type PageProps = {
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

function statusStyle(
  value: string
) {
  switch (value) {
    case "submitted":
      return {
        badge:
          "bg-blue-100 text-blue-700",
        panel:
          "border-blue-200 bg-blue-50",
        title:
          "Your review request has been submitted",
        description:
          "Threeple has received your request. Your current restriction remains active until an administrator completes the review.",
      };

    case "under_review":
      return {
        badge:
          "bg-amber-100 text-amber-700",
        panel:
          "border-amber-200 bg-amber-50",
        title:
          "Your request is under review",
        description:
          "A Threeple administrator is reviewing your request. The restriction remains active while the review is in progress.",
      };

    case "approved":
      return {
        badge:
          "bg-green-100 text-green-700",
        panel:
          "border-green-200 bg-green-50",
        title:
          "Your review request was approved",
        description:
          "The restriction linked to this review has been lifted. You can return to your dashboard and continue using the affected features.",
      };

    case "declined":
      return {
        badge:
          "bg-red-100 text-red-700",
        panel:
          "border-red-200 bg-red-50",
        title:
          "Your review request was declined",
        description:
          "The restriction remains active. This decision reflects the outcome of the Trust & Safety review.",
      };

    case "closed":
      return {
        badge:
          "bg-neutral-100 text-neutral-700",
        panel:
          "border-neutral-200 bg-neutral-50",
        title:
          "This review request is closed",
        description:
          "No further action is currently pending on this review request.",
      };

    default:
      return {
        badge:
          "bg-neutral-100 text-neutral-700",
        panel:
          "border-neutral-200 bg-neutral-50",
        title:
          "Review status",
        description:
          "Threeple is tracking this restriction review request.",
      };
  }
}

export default async function RestrictionReviewStatusPage({
  searchParams,
}: PageProps) {
  await connection();

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
    redirect(
      "/auth/login"
    );
  }

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
      created_at,
      reviewed_at,
      updated_at
    `)
    .eq(
      "requester_user_id",
      userId
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "RESTRICTION_REVIEW_STATUS_LOOKUP_FAILED",
      error
    );

    throw new Error(
      "Threeple could not load your restriction review status."
    );
  }

  const justSubmitted =
    query.result ===
    "submitted";

  const alreadySubmitted =
    query.result ===
    "already_submitted";

  const presentation =
    request
      ? statusStyle(
          request.status
        )
      : null;

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link
            href="/dashboard"
            className="text-2xl font-bold"
          >
            Threeple
          </Link>

          <Link
            href="/dashboard"
            className="text-sm font-semibold text-neutral-600 hover:text-neutral-950"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
            Trust & Safety
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Restriction Review Status
          </h1>

          <p className="mt-3 leading-7 text-neutral-600">
            Track the latest review request associated with your account.
          </p>
        </div>

        {justSubmitted && (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Your restriction review request was submitted successfully.
          </div>
        )}

        {alreadySubmitted && (
          <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            You already have a pending review request for this restriction, so Threeple did not create a duplicate.
          </div>
        )}

        {!request ? (
          <section className="mt-8 rounded-3xl border bg-white p-6 md:p-8">
            <h2 className="text-xl font-semibold">
              No review request found
            </h2>

            <p className="mt-3 text-sm leading-6 text-neutral-600">
              There is currently no restriction review request associated with this account.
            </p>

            <Link
              href="/dashboard"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-semibold text-white"
            >
              Return to Dashboard
            </Link>
          </section>
        ) : (
          <>
            <section
              className={`mt-8 rounded-3xl border p-6 md:p-8 ${presentation!.panel}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
                    Current Status
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold">
                    {presentation!.title}
                  </h2>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${presentation!.badge}`}
                >
                  {friendlyText(
                    request.status
                  )}
                </span>
              </div>

              <p className="mt-4 max-w-2xl text-sm leading-7 opacity-80">
                {presentation!.description}
              </p>
            </section>

            <section className="mt-6 rounded-3xl border bg-white p-6 md:p-8">
              <div className="grid gap-6 sm:grid-cols-2">
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

                <div>
                  <p className="text-xs text-neutral-400">
                    Decision Date
                  </p>

                  <p className="mt-1 font-semibold">
                    {request.reviewed_at
                      ? formatDateTime(
                          request.reviewed_at
                        )
                      : "Pending"}
                  </p>
                </div>
              </div>

              <div className="mt-7">
                <p className="text-xs text-neutral-400">
                  Your Review Request
                </p>

                <p className="mt-2 whitespace-pre-wrap rounded-2xl bg-neutral-50 p-5 text-sm leading-7 text-neutral-700">
                  {request.message}
                </p>
              </div>

              <div className="mt-7 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                <p className="text-sm font-semibold">
                  About the decision
                </p>

                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  Threeple does not display internal Trust & Safety notes or investigation details on this page. Only the final review status is shown.
                </p>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-semibold text-white"
                >
                  Return to Dashboard
                </Link>

                <Link
                  href="/restriction-review/status"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-700"
                >
                  Refresh Status
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
