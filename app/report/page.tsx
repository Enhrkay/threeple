import Link from "next/link";

import {
  submitTrustSafetyReport,
} from "./actions";

export const instant = false;

type PageProps = {
  searchParams: Promise<{
    code?: string;
    error?: string;
    submitted?: string;
    success?: string;
  }>;
};

export default async function ReportConcernPage({
  searchParams,
}: PageProps) {
  const query =
    await searchParams;

  const joinCode =
    query.code?.trim() ??
    "";

  const submitted =
    query.submitted?.trim();

  const genericSuccess =
    query.success === "1";

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">

      {/* HEADER */}

      <header className="border-b bg-white">

        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">

          <Link href="/">

            <div className="text-2xl font-bold tracking-tight">
              Threeple
            </div>

            <p className="text-sm text-neutral-500">
              Collect. Coordinate.
              Track.
            </p>

          </Link>

          <Link
            href="/"
            className="text-sm font-medium text-neutral-500 hover:text-black"
          >
            Home
          </Link>

        </div>

      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">

        {(submitted ||
          genericSuccess) ? (

          /* =============================================== */
          /* SUCCESS */
          /* =============================================== */

          <section className="rounded-3xl border bg-white p-7 text-center shadow-sm md:p-10">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl font-bold text-green-700">
              ✓
            </div>

            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
              Trust & Safety
            </p>

            <h1 className="mt-2 text-3xl font-semibold">
              Report received
            </h1>

            <p className="mx-auto mt-4 max-w-xl leading-7 text-neutral-600">
              Thank you for reporting
              your concern. Threeple
              has recorded the
              information for review.
            </p>

            {submitted && (
              <div className="mx-auto mt-7 max-w-md rounded-2xl bg-neutral-50 p-5">

                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Case Reference
                </p>

                <p className="mt-2 font-mono text-lg font-semibold">
                  {submitted}
                </p>

                <p className="mt-3 text-xs leading-5 text-neutral-500">
                  Keep this reference
                  if you need to
                  identify the report
                  later.
                </p>

              </div>
            )}

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">

              <Link
                href="/"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-semibold text-white"
              >
                Return Home
              </Link>

              <Link
                href="/report"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-neutral-300 px-5 text-sm font-semibold hover:bg-neutral-50"
              >
                Report Another Concern
              </Link>

            </div>

          </section>

        ) : (

          /* =============================================== */
          /* REPORT FORM */
          /* =============================================== */

          <>

            <section>

              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
                Trust & Safety
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
                Report a Concern
              </h1>

              <p className="mt-4 max-w-2xl leading-7 text-neutral-600">
                Tell Threeple about a
                Collection that may
                involve fraud,
                impersonation,
                misleading information,
                harassment, privacy
                concerns or other
                inappropriate activity.
              </p>

            </section>

            {query.error && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {query.error}
              </div>
            )}

            <section className="mt-8 rounded-3xl border bg-white p-6 md:p-8">

              <form
                action={
                  submitTrustSafetyReport
                }
                className="space-y-6"
              >

                {/* HONEYPOT */}

                <div
                  className="hidden"
                  aria-hidden="true"
                >
                  <label htmlFor="website">
                    Website
                  </label>

                  <input
                    id="website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                {/* THREEPLE CODE */}

                <div>

                  <label
                    htmlFor="join_code"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Threeple Code
                  </label>

                  <input
                    id="join_code"
                    name="join_code"
                    required
                    defaultValue={
                      joinCode
                    }
                    placeholder="Enter the Collection code"
                    className="h-12 w-full rounded-xl border border-neutral-300 px-4 font-mono uppercase outline-none focus:border-black"
                  />

                  <p className="mt-2 text-xs leading-5 text-neutral-500">
                    This identifies the
                    Collection you are
                    reporting.
                  </p>

                </div>

                {/* CATEGORY */}

                <div>

                  <label
                    htmlFor="category"
                    className="mb-2 block text-sm font-semibold"
                  >
                    What is the concern?
                  </label>

                  <select
                    id="category"
                    name="category"
                    required
                    defaultValue=""
                    className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 outline-none focus:border-black"
                  >
                    <option
                      value=""
                      disabled
                    >
                      Select a category
                    </option>

                    <option value="fraud_suspicion">
                      Suspected fraud
                    </option>

                    <option value="misleading_collection">
                      Misleading Collection
                    </option>

                    <option value="unauthorized_collection">
                      Unauthorized Collection
                    </option>

                    <option value="impersonation">
                      Impersonation
                    </option>

                    <option value="harassment">
                      Harassment
                    </option>

                    <option value="abusive_content">
                      Abusive content
                    </option>

                    <option value="privacy_concern">
                      Privacy concern
                    </option>

                    <option value="spam">
                      Spam
                    </option>

                    <option value="other">
                      Other
                    </option>

                  </select>

                </div>

                {/* DESCRIPTION */}

                <div>

                  <label
                    htmlFor="description"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Describe what happened
                  </label>

                  <textarea
                    id="description"
                    name="description"
                    required
                    minLength={20}
                    maxLength={4000}
                    rows={7}
                    placeholder="Explain the concern and include the most useful factual details you have..."
                    className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                  />

                  <p className="mt-2 text-xs leading-5 text-neutral-500">
                    Do not include
                    passwords, PINs,
                    card details or other
                    sensitive financial
                    credentials.
                  </p>

                </div>

                {/* OPTIONAL CONTACT */}

                <div className="border-t pt-6">

                  <h2 className="font-semibold">
                    Your contact details
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    Optional for guests.
                    If you are signed in,
                    Threeple will
                    associate the report
                    with your account.
                  </p>

                  <div className="mt-5 grid gap-5 sm:grid-cols-2">

                    <div>

                      <label
                        htmlFor="reporter_name"
                        className="mb-2 block text-sm font-medium"
                      >
                        Name
                      </label>

                      <input
                        id="reporter_name"
                        name="reporter_name"
                        className="h-11 w-full rounded-xl border border-neutral-300 px-4 outline-none focus:border-black"
                      />

                    </div>

                    <div>

                      <label
                        htmlFor="reporter_email"
                        className="mb-2 block text-sm font-medium"
                      >
                        Email
                      </label>

                      <input
                        id="reporter_email"
                        name="reporter_email"
                        type="email"
                        className="h-11 w-full rounded-xl border border-neutral-300 px-4 outline-none focus:border-black"
                      />

                    </div>

                  </div>

                </div>

                {/* NOTICE */}

                <div className="rounded-2xl bg-neutral-50 p-5">

                  <p className="text-sm font-semibold">
                    What happens next?
                  </p>

                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    Your report creates a
                    Trust & Safety case
                    for Threeple review.
                    Filing a report does
                    not automatically
                    suspend a user or
                    Collection.
                  </p>

                </div>

                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-black px-6 text-sm font-semibold text-white hover:bg-neutral-800"
                >
                  Submit Report
                </button>

              </form>

            </section>

          </>

        )}

      </div>

    </main>
  );
}