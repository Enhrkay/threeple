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
  updateCollection,
} from "./actions";

export const instant = false;

type PageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams?: Promise<{
    error?: string;
  }>;
};

// =========================================================
// ERROR MESSAGE
// =========================================================

function errorMessage(
  error?: string
) {
  switch (error) {
    case "title_required":
      return "Collection title is required.";

    case "target_required":
      return "Enter a valid target amount.";

    case "default_required":
      return "Enter a valid amount per participant.";

    case "not_allowed":
      return "You do not have permission to edit this Collection.";

    case "platform_restricted":
      return "Collection settings are temporarily unavailable because this Collection has an active Threeple restriction.";

    case "update_failed":
      return "Threeple could not save the changes.";

    default:
      return null;
  }
}

// =========================================================
// DATE INPUT
// =========================================================

function dateInputValue(
  date: string | null
) {
  if (!date) {
    return "";
  }

  const parsed =
    new Date(date);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return "";
  }

  return parsed
    .toISOString()
    .slice(0, 16);
}

// =========================================================
// FRIENDLY TEXT
// =========================================================

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

// =========================================================
// PAGE
// =========================================================

export default async function EditCollectionPage({
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

  // =======================================================
  // AUTHENTICATION
  // =======================================================

  const {
    data: claimsData,
    error: claimsError,
  } =
    await supabase.auth.getClaims();

  if (
    claimsError ||
    !claimsData?.claims?.sub
  ) {
    redirect(
      "/auth/login"
    );
  }

  // =======================================================
  // COLLECTION
  // =======================================================

  const {
    data: collection,
    error,
  } = await supabase
    .from("collections")
    .select(`
      id,
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
      visibility,
      show_participant_names,
      show_payment_amounts,
      requires_approval,
      access_mode,
      status
    `)
    .eq(
      "id",
      id
    )
    .maybeSingle();

  if (
    error ||
    !collection
  ) {
    notFound();
  }

  // =======================================================
  // ACTIVE PLATFORM RESTRICTION
  // =======================================================

  const {
    data: activeRestriction,
    error:
      restrictionError,
  } = await supabaseAdmin
    .from(
      "collection_restrictions"
    )
    .select(`
      id,
      restriction_type,
      imposed_at
    `)
    .eq(
      "collection_id",
      collection.id
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
    restrictionError
  ) {
    console.error(
      "Edit Collection restriction lookup failed:",
      restrictionError
    );
  }

  const organizerChangesBlocked =
    activeRestriction &&
    [
      "organizer_changes_block",
      "full_collection",
    ].includes(
      activeRestriction.restriction_type
    );

  // =======================================================
  // DIRECT URL RESTRICTION GUARD
  // =======================================================

  if (
    organizerChangesBlocked
  ) {
    return (
      <main className="min-h-screen bg-neutral-50 text-neutral-900">

        <header className="border-b bg-white">

          <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">

            <div>

              <Link
                href="/dashboard"
                className="text-2xl font-bold"
              >
                Threeple
              </Link>

              <p className="text-sm text-neutral-500">
                Collect. Coordinate.
                Track.
              </p>

            </div>

            <Link
              href={`/dashboard/collections/${collection.id}`}
              className="text-sm font-medium text-neutral-600"
            >
              ← Back
            </Link>

          </div>

        </header>

        <div className="mx-auto max-w-3xl px-6 py-10">

          <section className="rounded-3xl border border-red-200 bg-white p-6 md:p-8">

            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
              Threeple Restriction
            </p>

            <h1 className="mt-3 text-3xl font-semibold text-neutral-950">
              Collection settings are temporarily unavailable
            </h1>

            <p className="mt-4 max-w-2xl leading-7 text-neutral-600">
              This Collection currently
              has an active Threeple
              platform restriction.
              Organizer settings and
              Collection changes cannot
              be accessed while this
              restriction remains active.
            </p>

            <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-5">

              <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                Restriction Type
              </p>

              <p className="mt-2 font-semibold text-red-950">
                {friendlyText(
                  activeRestriction.restriction_type
                )}
              </p>

            </div>

            <div className="mt-6">

              <Link
                href={`/dashboard/collections/${collection.id}`}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-semibold text-white hover:bg-neutral-800"
              >
                Return to Collection
              </Link>

            </div>

          </section>

        </div>

      </main>
    );
  }

  // =======================================================
  // NORMAL EDIT PAGE
  // =======================================================

  const isDraft =
    collection.status ===
    "draft";

  const message =
    errorMessage(
      query?.error
    );

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">

      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <header className="border-b bg-white">

        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">

          <div>

            <Link
              href="/dashboard"
              className="text-2xl font-bold"
            >
              Threeple
            </Link>

            <p className="text-sm text-neutral-500">
              Collect. Coordinate.
              Track.
            </p>

          </div>

          <Link
            href={`/dashboard/collections/${collection.id}`}
            className="text-sm font-medium text-neutral-600"
          >
            ← Back
          </Link>

        </div>

      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">

        {/* ================================================= */}
        {/* PAGE TITLE */}
        {/* ================================================= */}

        <div>

          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Collection settings
          </p>

          <h1 className="mt-2 text-3xl font-semibold">
            Edit Collection
          </h1>

          <p className="mt-3 text-neutral-600">
            Update the information
            and participation rules
            for this Collection.
          </p>

        </div>

        {/* ================================================= */}
        {/* STRUCTURE LOCK */}
        {/* ================================================= */}

        {!isDraft && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">

            <p className="font-medium text-amber-900">
              Collection structure
              is locked
            </p>

            <p className="mt-2 text-sm leading-6 text-amber-800">
              This Collection is
              already active.
              Type, payment mode,
              currency and core
              amount settings can
              no longer be changed.
            </p>

          </div>
        )}

        {/* ================================================= */}
        {/* ERROR */}
        {/* ================================================= */}

        {message && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {message}
          </div>
        )}

        {/* ================================================= */}
        {/* FORM */}
        {/* ================================================= */}

        <form
          action={
            updateCollection
          }
          className="mt-8 space-y-7 rounded-3xl border bg-white p-6 md:p-8"
        >

          <input
            type="hidden"
            name="collection_id"
            value={
              collection.id
            }
          />

          {/* ================================================= */}
          {/* BASIC INFORMATION */}
          {/* ================================================= */}

          <section>

            <h2 className="text-lg font-semibold">
              Basic information
            </h2>

            <div className="mt-5 space-y-5">

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Collection title
                </label>

                <input
                  name="title"
                  required
                  defaultValue={
                    collection.title
                  }
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Description
                </label>

                <textarea
                  name="description"
                  rows={
                    4
                  }
                  defaultValue={
                    collection.description ??
                    ""
                  }
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                />

              </div>

            </div>

          </section>

          {/* ================================================= */}
          {/* STRUCTURE */}
          {/* ================================================= */}

          <section className="border-t pt-7">

            <h2 className="text-lg font-semibold">
              Collection structure
            </h2>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">

              {/* TYPE */}

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Type
                </label>

                {isDraft ? (
                  <select
                    name="collection_type"
                    defaultValue={
                      collection.collection_type
                    }
                    className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3"
                  >

                    <option value="wedding">
                      Wedding
                    </option>

                    <option value="event">
                      Event
                    </option>

                    <option value="society_dues">
                      Society dues
                    </option>

                    <option value="association_dues">
                      Association dues
                    </option>

                    <option value="group_contribution">
                      Group contribution
                    </option>

                    <option value="project_fund">
                      Project fund
                    </option>

                    <option value="trip">
                      Trip
                    </option>

                    <option value="shared_gift">
                      Shared gift
                    </option>

                    <option value="levy">
                      Levy
                    </option>

                    <option value="community_fund">
                      Community fund
                    </option>

                    <option value="other">
                      Other
                    </option>

                  </select>
                ) : (
                  <div className="rounded-xl bg-neutral-100 px-4 py-3 text-sm capitalize">
                    {collection.collection_type.replaceAll(
                      "_",
                      " "
                    )}
                  </div>
                )}

              </div>

              {/* MODE */}

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Mode
                </label>

                {isDraft ? (
                  <select
                    name="collection_mode"
                    defaultValue={
                      collection.collection_mode
                    }
                    className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3"
                  >

                    <option value="target">
                      Target
                    </option>

                    <option value="fixed_per_person">
                      Fixed per person
                    </option>

                    <option value="flexible">
                      Flexible
                    </option>

                    <option value="event_fee">
                      Event fee
                    </option>

                    <option value="recurring_dues">
                      Recurring dues
                    </option>

                    <option value="rotating_pool">
                      Rotating pool
                    </option>

                  </select>
                ) : (
                  <div className="rounded-xl bg-neutral-100 px-4 py-3 text-sm capitalize">
                    {collection.collection_mode.replaceAll(
                      "_",
                      " "
                    )}
                  </div>
                )}

              </div>

              {/* DRAFT-ONLY MONEY SETTINGS */}

              {isDraft && (
                <>

                  <div>

                    <label className="mb-2 block text-sm font-medium">
                      Currency
                    </label>

                    <input
                      name="currency"
                      maxLength={
                        3
                      }
                      defaultValue={
                        collection.currency
                      }
                      className="w-full rounded-xl border border-neutral-300 px-4 py-3 uppercase"
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-sm font-medium">
                      Target amount
                    </label>

                    <input
                      name="target_amount"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={
                        collection.target_amount ??
                        ""
                      }
                      className="w-full rounded-xl border border-neutral-300 px-4 py-3"
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-sm font-medium">
                      Default amount
                    </label>

                    <input
                      name="default_amount"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={
                        collection.default_amount ??
                        ""
                      }
                      className="w-full rounded-xl border border-neutral-300 px-4 py-3"
                    />

                  </div>

                </>
              )}

            </div>

            {/* DRAFT-ONLY PAYMENT RULES */}

            {isDraft && (
              <div className="mt-5 space-y-3">

                <label className="flex items-center gap-3 text-sm">

                  <input
                    type="checkbox"
                    name="allow_partial_payments"
                    defaultChecked={
                      collection.allow_partial_payments
                    }
                  />

                  Allow partial payments

                </label>

                <label className="flex items-center gap-3 text-sm">

                  <input
                    type="checkbox"
                    name="allow_custom_amount"
                    defaultChecked={
                      collection.allow_custom_amount
                    }
                  />

                  Allow participants to choose their amount

                </label>

              </div>
            )}

          </section>

          {/* ================================================= */}
          {/* PARTICIPATION */}
          {/* ================================================= */}

          <section className="border-t pt-7">

            <h2 className="text-lg font-semibold">
              Participation
            </h2>

            <div className="mt-5 space-y-5">

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Deadline
                </label>

                <input
                  name="deadline"
                  type="datetime-local"
                  defaultValue={
                    dateInputValue(
                      collection.deadline
                    )
                  }
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Access mode
                </label>

                <select
                  name="access_mode"
                  defaultValue={
                    collection.access_mode
                  }
                  className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3"
                >

                  <option value="none">
                    No special access
                  </option>

                  <option value="approval">
                    Approval
                  </option>

                  <option value="seat">
                    Seat
                  </option>

                  <option value="ticket">
                    Ticket
                  </option>

                </select>

              </div>

              <label className="flex items-center gap-3 text-sm">

                <input
                  type="checkbox"
                  name="requires_approval"
                  defaultChecked={
                    collection.requires_approval
                  }
                />

                New participants require approval

              </label>

            </div>

          </section>

          {/* ================================================= */}
          {/* PRIVACY */}
          {/* ================================================= */}

          <section className="border-t pt-7">

            <h2 className="text-lg font-semibold">
              Privacy & visibility
            </h2>

            <div className="mt-5 space-y-5">

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Visibility
                </label>

                <select
                  name="visibility"
                  defaultValue={
                    collection.visibility
                  }
                  className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3"
                >

                  <option value="private">
                    Private
                  </option>

                  <option value="summary">
                    Public summary
                  </option>

                  <option value="public">
                    Public
                  </option>

                </select>

              </div>

              <label className="flex items-center gap-3 text-sm">

                <input
                  type="checkbox"
                  name="show_participant_names"
                  defaultChecked={
                    collection.show_participant_names
                  }
                />

                Show participant names publicly

              </label>

              <label className="flex items-center gap-3 text-sm">

                <input
                  type="checkbox"
                  name="show_payment_amounts"
                  defaultChecked={
                    collection.show_payment_amounts
                  }
                />

                Show contribution amounts publicly

              </label>

            </div>

          </section>

          {/* ================================================= */}
          {/* SAVE */}
          {/* ================================================= */}

          <div className="border-t pt-7">

            <button
              type="submit"
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-black px-6 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              Save Changes
            </button>

          </div>

        </form>

      </div>

    </main>
  );
}
