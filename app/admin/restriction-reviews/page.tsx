import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

import {
  submitRestrictionReviewRequest,
} from "./actions";

export const instant = false;

type PageProps = {
  searchParams: Promise<{
    scope?: string;
    subjectId?: string;
    type?: string;
    result?: string;
  }>;
};

function friendlyText(
  value:
    | string
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

function resultMessage(
  value:
    | string
    | undefined
) {
  switch (value) {
    case "restriction_not_active":
      return {
        type: "info",
        text:
          "This restriction is no longer active, so a new review request is not required.",
      };

    case "message_required":
      return {
        type: "error",
        text:
          "Tell us why you are requesting a review. Your explanation must be at least 20 characters.",
      };

    case "invalid_request":
      return {
        type: "error",
        text:
          "Threeple could not verify the restriction attached to this request.",
      };

    case "submit_failed":
      return {
        type: "error",
        text:
          "Threeple could not submit your review request. Please try again.",
      };

    default:
      return null;
  }
}

export default async function RestrictionReviewPage({
  searchParams,
}: PageProps) {
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

  const message =
    resultMessage(
      query.result
    );

  let verifiedScope =
    query.scope;

  let verifiedSubjectId =
    query.subjectId;

  let verifiedType =
    query.type;

  // Only auto-resolve to user scope when no explicit
  // restriction context was supplied.
  if (
    !verifiedScope ||
    !verifiedSubjectId ||
    !verifiedType
  ) {
    const {
      data:
        activeUserRestriction,
    } = await supabaseAdmin
      .from(
        "user_restrictions"
      )
      .select(`
        id,
        restriction_type
      `)
      .eq(
        "user_id",
        userId
      )
      .is(
        "lifted_at",
        null
      )
      .order(
        "imposed_at",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

    if (
      activeUserRestriction
    ) {
      verifiedScope =
        "user";

      verifiedSubjectId =
        userId;

      verifiedType =
        activeUserRestriction.restriction_type;
    }
  }

  let pendingRequest:
    | {
        id: string;
      }
    | null = null;

  if (
    verifiedScope &&
    verifiedSubjectId &&
    verifiedType
  ) {
    const {
      data,
    } = await supabaseAdmin
      .from(
        "restriction_review_requests"
      )
      .select("id")
      .eq(
        "requester_user_id",
        userId
      )
      .eq(
        "restriction_scope",
        verifiedScope
      )
      .eq(
        "restriction_subject_id",
        verifiedSubjectId
      )
      .eq(
        "restriction_type",
        verifiedType
      )
      .in(
        "status",
        [
          "submitted",
          "under_review",
        ]
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

    pendingRequest =
      data ?? null;
  }

  const hasContext =
    Boolean(
      verifiedScope &&
      verifiedSubjectId &&
      verifiedType
    );

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

          <div className="flex items-center gap-4">
            <Link
              href="/restriction-review/status"
              className="text-sm font-semibold text-neutral-600 hover:text-neutral-950"
            >
              Review Status
            </Link>

            <Link
              href="/dashboard"
              className="text-sm font-semibold text-neutral-600 hover:text-neutral-950"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <section className="rounded-3xl border bg-white p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
            Trust & Safety
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Request a Restriction Review
          </h1>

          <p className="mt-4 leading-7 text-neutral-600">
            Use this form if you believe an active Threeple restriction should be reviewed. Submitting a request does not automatically remove or change the restriction.
          </p>

          {message && (
            <div
              className={`mt-6 rounded-2xl border p-4 text-sm ${
                message.type ===
                "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-blue-200 bg-blue-50 text-blue-700"
              }`}
            >
              {message.text}
            </div>
          )}

          {pendingRequest ? (
            <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <p className="font-semibold text-blue-950">
                A review request for this restriction is already in progress.
              </p>

              <p className="mt-2 text-sm leading-6 text-blue-800">
                Threeple will not create a duplicate review for the same active restriction.
              </p>

              <Link
                href={`/restriction-review/status?requestId=${pendingRequest.id}`}
                className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white"
              >
                View Review Status
              </Link>
            </div>
          ) : hasContext ? (
            <form
              action={
                submitRestrictionReviewRequest
              }
              className="mt-8"
            >
              <input
                type="hidden"
                name="restriction_scope"
                value={
                  verifiedScope
                }
              />

              <input
                type="hidden"
                name="restriction_subject_id"
                value={
                  verifiedSubjectId
                }
              />

              <input
                type="hidden"
                name="restriction_type"
                value={
                  verifiedType
                }
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-neutral-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                    Scope
                  </p>

                  <p className="mt-2 font-semibold">
                    {friendlyText(
                      verifiedScope
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-neutral-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                    Restriction
                  </p>

                  <p className="mt-2 font-semibold">
                    {friendlyText(
                      verifiedType
                    )}
                  </p>
                </div>
              </div>

              <label className="mt-6 block">
                <span className="text-sm font-semibold">
                  Why should this restriction be reviewed?
                </span>

                <textarea
                  name="message"
                  required
                  minLength={20}
                  rows={7}
                  placeholder="Explain the relevant context clearly. Do not include passwords, card details or other sensitive credentials."
                  className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 text-sm leading-6 outline-none focus:border-neutral-950"
                />
              </label>

              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                The active restriction remains in force while your request is reviewed.
              </div>

              <button
                type="submit"
                className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-semibold text-white hover:bg-neutral-800"
              >
                Submit Review Request
              </button>
            </form>
          ) : (
            <div className="mt-8 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
              <p className="font-semibold">
                No restriction context could be verified.
              </p>

              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Open this page from a Threeple restriction notice so the correct restriction can be reviewed.
              </p>

              <Link
                href="/restriction-review/status"
                className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-black px-4 text-sm font-semibold text-white"
              >
                View Review Status
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
