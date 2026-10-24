import Link from "next/link";
import { createCollection } from "./actions";

export default function NewCollectionPage() {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
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
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Page heading */}
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
            New Collection
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            What are you collecting for?
          </h1>

          <p className="mt-3 text-neutral-600">
            Set up the basics now. You can configure participants,
            recurring schedules, payment settings and other details
            afterwards.
          </p>
        </div>

        <form
          action={createCollection}
          className="space-y-8 rounded-3xl border bg-white p-6 md:p-8"
        >
          {/* ===================================================== */}
          {/* BASIC INFORMATION */}
          {/* ===================================================== */}

          <section>
            <h2 className="text-lg font-semibold">
              Basic information
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Tell people what this Collection is for.
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="title"
                  className="mb-2 block text-sm font-medium"
                >
                  Collection name
                </label>

                <input
                  id="title"
                  name="title"
                  type="text"
                  required
                  minLength={3}
                  placeholder="e.g. Mike & Sarah's Wedding"
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none transition focus:border-black"
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="mb-2 block text-sm font-medium"
                >
                  Description
                </label>

                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  placeholder="Tell participants what this Collection is about..."
                  className="w-full resize-none rounded-xl border border-neutral-300 px-4 py-3 outline-none transition focus:border-black"
                />
              </div>
            </div>
          </section>

          <hr className="border-neutral-200" />

          {/* ===================================================== */}
          {/* COLLECTION PURPOSE */}
          {/* ===================================================== */}

          <section>
            <h2 className="text-lg font-semibold">
              Collection purpose
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Choose the option that best describes what you're
              organising.
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="collection_type"
                  className="mb-2 block text-sm font-medium"
                >
                  Collection type
                </label>

                <select
                  id="collection_type"
                  name="collection_type"
                  required
                  defaultValue=""
                  className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
                >
                  <option value="" disabled>
                    Select a purpose
                  </option>

                  <option value="wedding">
                    Wedding
                  </option>

                  <option value="event">
                    Event
                  </option>

                  <option value="society_dues">
                    Society Dues
                  </option>

                  <option value="association_dues">
                    Association Dues
                  </option>

                  <option value="group_contribution">
                    Group Contribution
                  </option>

                  <option value="project_fund">
                    Project Fund
                  </option>

                  <option value="trip">
                    Trip
                  </option>

                  <option value="shared_gift">
                    Shared Gift
                  </option>

                  <option value="levy">
                    Levy
                  </option>

                  <option value="community_fund">
                    Community Fund
                  </option>

                  <option value="other">
                    Other
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="collection_mode"
                  className="mb-2 block text-sm font-medium"
                >
                  How will people contribute?
                </label>

                <select
                  id="collection_mode"
                  name="collection_mode"
                  required
                  defaultValue=""
                  className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
                >
                  <option value="" disabled>
                    Select contribution method
                  </option>

                  <option value="target">
                    Raise towards a target
                  </option>

                  <option value="fixed_per_person">
                    Fixed amount per person
                  </option>

                  <option value="flexible">
                    Everyone chooses their amount
                  </option>

                  <option value="event_fee">
                    Event registration fee
                  </option>

                  <option value="recurring_dues">
                    Recurring dues
                  </option>

                  <option value="rotating_pool">
                    Rotating contribution
                  </option>
                </select>
              </div>
            </div>
          </section>

          <hr className="border-neutral-200" />

          {/* ===================================================== */}
          {/* AMOUNT */}
          {/* ===================================================== */}

          <section>
            <h2 className="text-lg font-semibold">
              Amount
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Enter the relevant amount for this Collection.
              Fields that do not apply can be left empty.
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              <div>
                <label
                  htmlFor="currency"
                  className="mb-2 block text-sm font-medium"
                >
                  Currency
                </label>

                <select
                  id="currency"
                  name="currency"
                  defaultValue="NGN"
                  className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
                >
                  <option value="NGN">
                    NGN — Nigerian Naira
                  </option>

                  <option value="GBP">
                    GBP — British Pound
                  </option>

                  <option value="USD">
                    USD — US Dollar
                  </option>

                  <option value="EUR">
                    EUR — Euro
                  </option>

                  <option value="CAD">
                    CAD — Canadian Dollar
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="target_amount"
                  className="mb-2 block text-sm font-medium"
                >
                  Target amount
                </label>

                <input
                  id="target_amount"
                  name="target_amount"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="e.g. 3000000"
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                />

                <p className="mt-2 text-xs text-neutral-500">
                  For target-based Collections.
                </p>
              </div>

              <div>
                <label
                  htmlFor="default_amount"
                  className="mb-2 block text-sm font-medium"
                >
                  Amount per person
                </label>

                <input
                  id="default_amount"
                  name="default_amount"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="e.g. 5000"
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                />

                <p className="mt-2 text-xs text-neutral-500">
                  For fixed fees, dues or contributions.
                </p>
              </div>
            </div>
          </section>

          <hr className="border-neutral-200" />

          {/* ===================================================== */}
          {/* TIMING & PRIVACY */}
          {/* ===================================================== */}

          <section>
            <h2 className="text-lg font-semibold">
              Timing & privacy
            </h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="deadline"
                  className="mb-2 block text-sm font-medium"
                >
                  Deadline
                </label>

                <input
                  id="deadline"
                  name="deadline"
                  type="date"
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              <div>
                <label
                  htmlFor="visibility"
                  className="mb-2 block text-sm font-medium"
                >
                  Visibility
                </label>

                <select
                  id="visibility"
                  name="visibility"
                  defaultValue="private"
                  className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
                >
                  <option value="private">
                    Private
                  </option>

                  <option value="summary">
                    Show summary only
                  </option>

                  <option value="public">
                    Public
                  </option>
                </select>
              </div>
            </div>
          </section>

          <hr className="border-neutral-200" />

          {/* ===================================================== */}
          {/* OPTIONS */}
          {/* ===================================================== */}

          <section>
            <h2 className="text-lg font-semibold">
              Collection options
            </h2>

            <div className="mt-5 space-y-4">
              <label className="flex cursor-pointer gap-3 rounded-xl border p-4">
                <input
                  type="checkbox"
                  name="allow_partial_payments"
                  className="mt-1 h-4 w-4"
                />

                <div>
                  <p className="font-medium">
                    Allow partial payments
                  </p>

                  <p className="mt-1 text-sm text-neutral-500">
                    Participants can pay their required amount in
                    multiple instalments.
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer gap-3 rounded-xl border p-4">
                <input
                  type="checkbox"
                  name="allow_custom_amount"
                  className="mt-1 h-4 w-4"
                />

                <div>
                  <p className="font-medium">
                    Allow custom contribution amounts
                  </p>

                  <p className="mt-1 text-sm text-neutral-500">
                    Participants may choose how much they want to
                    contribute.
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer gap-3 rounded-xl border p-4">
                <input
                  type="checkbox"
                  name="requires_approval"
                  className="mt-1 h-4 w-4"
                />

                <div>
                  <p className="font-medium">
                    Require approval
                  </p>

                  <p className="mt-1 text-sm text-neutral-500">
                    Useful when joining or payment should lead to
                    organizer approval.
                  </p>
                </div>
              </label>
            </div>
          </section>

          {/* ===================================================== */}
          {/* ACTIONS */}
          {/* ===================================================== */}

          <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
            <Link
              href="/dashboard"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-neutral-300 px-6 text-sm font-medium"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-black px-6 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              Create Collection
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}