"use client";

import {
  useState,
  type FormEvent,
} from "react";

import {
  useFormStatus,
} from "react-dom";

import {
  liftCollectionRestriction,
  restrictCollection,
} from "./actions";

// =========================================================
// TYPES
// =========================================================

type Restriction = {
  id: string;
  restriction_type: string;
  reason: string;
  imposed_at: string;
  imposed_by: string;
};

type RestrictionSectionProps = {
  reportId: string;
  collectionId: string;
  collectionTitle: string;
  reportStatus: string;
  restriction:
    | Restriction
    | null;
};

// =========================================================
// HELPERS
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
    .replaceAll(".", " ")
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

// =========================================================
// SUBMIT BUTTONS
// =========================================================

function RestrictCollectionButton() {
  const {
    pending,
  } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center rounded-xl bg-red-700 px-5 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending
        ? "Applying Restriction..."
        : "Restrict Collection"}
    </button>
  );
}

function LiftRestrictionButton() {
  const {
    pending,
  } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center rounded-xl bg-green-700 px-5 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending
        ? "Lifting Restriction..."
        : "Lift Restriction"}
    </button>
  );
}

// =========================================================
// COMPONENT
// =========================================================

export default function RestrictionSection({
  reportId,
  collectionId,
  collectionTitle,
  reportStatus,
  restriction,
}: RestrictionSectionProps) {
  const [
    restrictReason,
    setRestrictReason,
  ] = useState("");

  const [
    restrictionType,
    setRestrictionType,
  ] = useState(
    "full_collection"
  );

  const [
    restrictConfirmed,
    setRestrictConfirmed,
  ] = useState(false);

  const [
    liftReason,
    setLiftReason,
  ] = useState("");

  const [
    liftConfirmed,
    setLiftConfirmed,
  ] = useState(false);

  const hasActiveRestriction =
    Boolean(restriction);

  const canRestrict =
    reportStatus ===
      "action_required" &&
    !hasActiveRestriction;

  // =======================================================
  // APPLY RESTRICTION CONFIRMATION
  // =======================================================

  function handleRestrictSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    const cleanReason =
      restrictReason.trim();

    if (
      cleanReason.length <
      10
    ) {
      event.preventDefault();

      window.alert(
        "Enter a reason of at least 10 characters before restricting the Collection."
      );

      return;
    }

    if (
      !restrictionType
    ) {
      event.preventDefault();

      window.alert(
        "Select a restriction type."
      );

      return;
    }

    if (
      !restrictConfirmed
    ) {
      event.preventDefault();

      window.alert(
        "Please confirm that you understand the effect of restricting this Collection."
      );

      return;
    }

    const shouldContinue =
      window.confirm(
        `Restrict "${collectionTitle}"?\n\nRestriction type: ${friendlyText(
          restrictionType
        )}\n\nThis is a platform enforcement action and will be permanently recorded in the administrative audit history.`
      );

    if (!shouldContinue) {
      event.preventDefault();
    }
  }

  // =======================================================
  // LIFT RESTRICTION CONFIRMATION
  // =======================================================

  function handleLiftSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    const cleanReason =
      liftReason.trim();

    if (
      cleanReason.length <
      10
    ) {
      event.preventDefault();

      window.alert(
        "Enter a reason of at least 10 characters before lifting the restriction."
      );

      return;
    }

    if (
      !liftConfirmed
    ) {
      event.preventDefault();

      window.alert(
        "Please confirm that you have reviewed the case and understand the effect of lifting this restriction."
      );

      return;
    }

    const shouldContinue =
      window.confirm(
        `Lift the active restriction on "${collectionTitle}"?\n\nThis will remove the active administrative restriction from the Collection. The action will remain permanently recorded in the audit history.`
      );

    if (!shouldContinue) {
      event.preventDefault();
    }
  }

  // =======================================================
  // ACTIVE RESTRICTION
  // =======================================================

  if (
    restriction
  ) {
    return (
      <section className="mt-8 overflow-hidden rounded-3xl border border-red-200 bg-white">

        {/* =============================================== */}
        {/* RESTRICTION HEADER */}
        {/* =============================================== */}

        <div className="border-b border-red-100 bg-red-50 px-6 py-6 md:px-8">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

            <div>

              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-red-700">
                Active Platform Restriction
              </p>

              <h2 className="mt-2 text-xl font-black tracking-tight text-red-950">
                Collection Restricted
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-red-800">
                This Collection currently
                has an active Threeple
                administrative
                restriction. Restricted
                capabilities remain in
                effect until an
                authorized administrator
                explicitly lifts the
                restriction.
              </p>

            </div>

            <span className="inline-flex w-fit rounded-full bg-red-700 px-3 py-1 text-xs font-semibold text-white">
              Restricted
            </span>

          </div>

        </div>

        {/* =============================================== */}
        {/* RESTRICTION DETAILS */}
        {/* =============================================== */}

        <div className="px-6 py-6 md:px-8">

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
                Restriction Type
              </p>

              <p className="mt-2 text-sm font-semibold text-[var(--tp-ink)]">
                {friendlyText(
                  restriction.restriction_type
                )}
              </p>

            </div>

            <div>

              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
                Imposed
              </p>

              <p className="mt-2 text-sm font-semibold text-[var(--tp-ink)]">
                {formatDateTime(
                  restriction.imposed_at
                )}
              </p>

            </div>

            <div>

              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
                Restriction ID
              </p>

              <p className="mt-2 break-all font-mono text-xs text-[var(--tp-muted)]">
                {restriction.id}
              </p>

            </div>

          </div>

          {/* ============================================= */}
          {/* ORIGINAL REASON */}
          {/* ============================================= */}

          <div className="mt-6 rounded-2xl border bg-[var(--tp-bg-soft)] p-5">

            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
              Reason for Restriction
            </p>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--tp-ink-soft)]">
              {restriction.reason}
            </p>

          </div>

          {/* ============================================= */}
          {/* LIFT ACTION */}
          {/* ============================================= */}

          <div className="mt-8 border-t pt-8">

            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--tp-faint)]">
              Administrative Action
            </p>

            <h3 className="mt-2 text-lg font-semibold text-neutral-950">
              Lift Collection Restriction
            </h3>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--tp-ink-soft)]">
              Only lift this restriction
              after confirming that the
              underlying Trust & Safety
              concern has been addressed
              or that continued
              restriction is no longer
              justified.
            </p>

            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">

              <p className="text-sm font-semibold text-amber-900">
                Important
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-800">
                Lifting the restriction
                does not delete the
                original enforcement
                record. Threeple preserves
                the restriction and lift
                history for audit and
                investigation purposes.
              </p>

            </div>

            <form
              action={
                liftCollectionRestriction
              }
              onSubmit={
                handleLiftSubmit
              }
              className="mt-6"
            >

              <input
                type="hidden"
                name="report_id"
                value={
                  reportId
                }
              />

              <input
                type="hidden"
                name="collection_id"
                value={
                  collectionId
                }
              />

              <div>

                <label
                  htmlFor="lift-restriction-reason"
                  className="text-sm font-semibold text-[var(--tp-ink)]"
                >
                  Reason for lifting the restriction
                </label>

                <p className="mt-1 text-xs leading-5 text-[var(--tp-muted)]">
                  Required. State why the
                  Collection can safely
                  return to normal
                  operation.
                </p>

                <textarea
                  id="lift-restriction-reason"
                  name="reason"
                  value={
                    liftReason
                  }
                  onChange={(
                    event
                  ) =>
                    setLiftReason(
                      event.target.value
                    )
                  }
                  minLength={
                    10
                  }
                  maxLength={
                    2000
                  }
                  required
                  rows={
                    5
                  }
                  placeholder="Example: Investigation completed. The identified issue has been addressed and the Collection can safely resume normal operation."
                  className="mt-3 w-full resize-y rounded-2xl border border-[var(--tp-border-strong)] bg-white px-4 py-3 text-sm leading-6 text-[var(--tp-ink)] outline-none transition placeholder:text-[var(--tp-faint)] focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                />

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--tp-faint)]">

                  <span>
                    Minimum 10 characters
                  </span>

                  <span>
                    {liftReason.trim().length}
                    {" / "}
                    2000
                  </span>

                </div>

              </div>

              <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--tp-border)] bg-[var(--tp-bg-soft)] p-4">

                <input
                  type="checkbox"
                  checked={
                    liftConfirmed
                  }
                  onChange={(
                    event
                  ) =>
                    setLiftConfirmed(
                      event.target.checked
                    )
                  }
                  className="mt-1 h-4 w-4 shrink-0 accent-black"
                />

                <span>

                  <span className="block text-sm font-semibold text-[var(--tp-ink)]">
                    Confirm administrative decision
                  </span>

                  <span className="mt-1 block text-sm leading-6 text-[var(--tp-ink-soft)]">
                    I have reviewed this
                    Trust & Safety case and
                    understand that lifting
                    the restriction will
                    remove the active
                    administrative
                    restriction from this
                    Collection.
                  </span>

                </span>

              </label>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">

                <LiftRestrictionButton />

                <p className="text-xs leading-5 text-[var(--tp-faint)]">
                  This action is audited
                  and cannot erase the
                  original restriction
                  history.
                </p>

              </div>

            </form>

          </div>

        </div>

      </section>
    );
  }

  // =======================================================
  // NO ACTIVE RESTRICTION
  // =======================================================

  if (
    !canRestrict
  ) {
    return null;
  }

  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-amber-200 bg-white">

      {/* =============================================== */}
      {/* HEADER */}
      {/* =============================================== */}

      <div className="border-b border-amber-100 bg-amber-50 px-6 py-6 md:px-8">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

          <div>

            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-700">
              Platform Intervention
            </p>

            <h2 className="mt-2 text-xl font-black tracking-tight text-amber-950">
              Restrict Collection
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-800">
              This Trust & Safety case
              is marked Action required.
              An authorized administrator
              may now apply a temporary
              Collection restriction if
              platform intervention is
              justified.
            </p>

          </div>

          <span className="inline-flex w-fit rounded-full bg-amber-700 px-3 py-1 text-xs font-semibold text-white">
            Action required
          </span>

        </div>

      </div>

      {/* =============================================== */}
      {/* FORM */}
      {/* =============================================== */}

      <div className="px-6 py-6 md:px-8">

        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--tp-faint)]">
          Administrative Enforcement
        </p>

        <h3 className="mt-2 text-lg font-semibold text-neutral-950">
          Apply Collection Restriction
        </h3>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--tp-ink-soft)]">
          Choose the minimum restriction
          necessary to address the
          identified Trust & Safety
          concern. The action and reason
          will be permanently recorded in
          the administrative audit trail.
        </p>

        <form
          action={
            restrictCollection
          }
          onSubmit={
            handleRestrictSubmit
          }
          className="mt-6"
        >

          <input
            type="hidden"
            name="report_id"
            value={
              reportId
            }
          />

          <input
            type="hidden"
            name="collection_id"
            value={
              collectionId
            }
          />

          {/* ============================================= */}
          {/* RESTRICTION TYPE */}
          {/* ============================================= */}

          <div>

            <label
              htmlFor="restriction-type"
              className="text-sm font-semibold text-[var(--tp-ink)]"
            >
              Restriction Type
            </label>

            <p className="mt-1 text-xs leading-5 text-[var(--tp-muted)]">
              Select the scope of the
              platform intervention.
            </p>

            <select
              id="restriction-type"
              name="restriction_type"
              value={
                restrictionType
              }
              onChange={(
                event
              ) =>
                setRestrictionType(
                  event.target.value
                )
              }
              required
              className="mt-3 h-12 w-full rounded-xl border border-[var(--tp-border-strong)] bg-white px-4 text-sm font-medium text-[var(--tp-ink)] outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            >
              <option value="join_block">
                Join Block
              </option>

              <option value="organizer_changes_block">
                Organizer Changes Block
              </option>

              <option value="full_collection">
                Full Collection
              </option>
            </select>

          </div>

          {/* ============================================= */}
          {/* TYPE EXPLANATION */}
          {/* ============================================= */}

          <div className="mt-4 rounded-2xl border bg-[var(--tp-bg-soft)] p-5">

            {restrictionType ===
              "join_block" && (
              <>
                <p className="text-sm font-semibold text-[var(--tp-ink)]">
                  Join Block
                </p>

                <p className="mt-1 text-sm leading-6 text-[var(--tp-ink-soft)]">
                  Prevents new participants
                  from joining the
                  Collection while allowing
                  existing activity to
                  remain available.
                </p>
              </>
            )}

            {restrictionType ===
              "organizer_changes_block" && (
              <>
                <p className="text-sm font-semibold text-[var(--tp-ink)]">
                  Organizer Changes Block
                </p>

                <p className="mt-1 text-sm leading-6 text-[var(--tp-ink-soft)]">
                  Prevents organizer-side
                  administrative changes
                  while the investigation or
                  remediation continues.
                </p>
              </>
            )}

            {restrictionType ===
              "full_collection" && (
              <>
                <p className="text-sm font-semibold text-[var(--tp-ink)]">
                  Full Collection
                </p>

                <p className="mt-1 text-sm leading-6 text-[var(--tp-ink-soft)]">
                  Applies the strongest
                  Collection-level
                  restriction. Use only when
                  the identified risk
                  justifies broad platform
                  intervention.
                </p>
              </>
            )}

          </div>

          {/* ============================================= */}
          {/* REASON */}
          {/* ============================================= */}

          <div className="mt-6">

            <label
              htmlFor="restrict-collection-reason"
              className="text-sm font-semibold text-[var(--tp-ink)]"
            >
              Reason for restriction
            </label>

            <p className="mt-1 text-xs leading-5 text-[var(--tp-muted)]">
              Required. Explain why this
              specific restriction is
              justified by the Trust &
              Safety case.
            </p>

            <textarea
              id="restrict-collection-reason"
              name="reason"
              value={
                restrictReason
              }
              onChange={(
                event
              ) =>
                setRestrictReason(
                  event.target.value
                )
              }
              minLength={
                10
              }
              maxLength={
                2000
              }
              required
              rows={
                5
              }
              placeholder="Example: Investigation confirmed a material risk requiring a temporary Collection restriction while corrective action is completed."
              className="mt-3 w-full resize-y rounded-2xl border border-[var(--tp-border-strong)] bg-white px-4 py-3 text-sm leading-6 text-[var(--tp-ink)] outline-none transition placeholder:text-[var(--tp-faint)] focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--tp-faint)]">

              <span>
                Minimum 10 characters
              </span>

              <span>
                {restrictReason.trim().length}
                {" / "}
                2000
              </span>

            </div>

          </div>

          {/* ============================================= */}
          {/* WARNING */}
          {/* ============================================= */}

          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4">

            <p className="text-sm font-semibold text-red-900">
              Platform enforcement action
            </p>

            <p className="mt-1 text-sm leading-6 text-red-800">
              Restricting a Collection is
              separate from investigating
              the case. This action affects
              platform capabilities and is
              permanently audit logged.
            </p>

          </div>

          {/* ============================================= */}
          {/* CONFIRMATION */}
          {/* ============================================= */}

          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--tp-border)] bg-[var(--tp-bg-soft)] p-4">

            <input
              type="checkbox"
              checked={
                restrictConfirmed
              }
              onChange={(
                event
              ) =>
                setRestrictConfirmed(
                  event.target.checked
                )
              }
              className="mt-1 h-4 w-4 shrink-0 accent-black"
            />

            <span>

              <span className="block text-sm font-semibold text-[var(--tp-ink)]">
                Confirm enforcement decision
              </span>

              <span className="mt-1 block text-sm leading-6 text-[var(--tp-ink-soft)]">
                I have reviewed this
                Trust & Safety case,
                confirmed that platform
                intervention is justified,
                and understand the impact
                of the selected Collection
                restriction.
              </span>

            </span>

          </label>

          {/* ============================================= */}
          {/* ACTION */}
          {/* ============================================= */}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">

            <RestrictCollectionButton />

            <p className="text-xs leading-5 text-[var(--tp-faint)]">
              The restriction can later
              be lifted by an authorized
              administrator, but its audit
              history is permanent.
            </p>

          </div>

        </form>

      </div>

    </section>
  );
}

