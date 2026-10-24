"use client";

import {
  useState,
} from "react";

import {
  resolveTrustSafetyCase,
} from "./actions";

type ResolutionControlsProps = {
  reportId: string;
  reportStatus: string;
  hasActiveRestriction: boolean;
};

export default function ResolutionControls({
  reportId,
  reportStatus,
  hasActiveRestriction,
}: ResolutionControlsProps) {
  const [
    resolutionNotes,
    setResolutionNotes,
  ] = useState("");

  const [
    confirmed,
    setConfirmed,
  ] = useState(false);

  // =======================================================
  // ONLY ACTION REQUIRED CASES CAN BE RESOLVED HERE
  // =======================================================

  if (
    reportStatus !==
    "action_required"
  ) {
    return null;
  }

  // =======================================================
  // ACTIVE RESTRICTION
  // =======================================================

  if (
    hasActiveRestriction
  ) {
    return (
      <section className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6 md:p-8">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">
          Case Resolution
        </p>

        <h2 className="mt-2 text-xl font-black tracking-tight text-amber-950">
          Resolution temporarily unavailable
        </h2>

        <p className="mt-3 text-sm leading-6 text-amber-900">
          This Trust & Safety case still has
          an active Collection restriction.
          Lift the active restriction before
          closing the investigation.
        </p>
      </section>
    );
  }

  // =======================================================
  // RESOLUTION FORM
  // =======================================================

  const canSubmit =
    resolutionNotes.trim().length >=
      10 &&
    confirmed;

  return (
    <section className="mt-8 rounded-[2rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] shadow-[var(--tp-shadow-sm)] p-6 md:p-8">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
          Case Resolution
        </p>

        <h2 className="mt-2 text-xl font-black tracking-tight">
          Resolve Trust & Safety Case
        </h2>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--tp-ink-soft)]">
          Close this investigation only
          after the required platform
          intervention, remediation and
          verification have been completed.
          Resolution permanently records
          the final administrative outcome.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5">
        <p className="font-semibold text-green-900">
          Ready for resolution
        </p>

        <p className="mt-2 text-sm leading-6 text-green-800">
          There is no active Collection
          restriction preventing this case
          from being resolved.
        </p>
      </div>

      <form
        action={
          resolveTrustSafetyCase
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

        <div>
          <label
            htmlFor="resolution_notes"
            className="text-sm font-semibold text-[var(--tp-ink)]"
          >
            Final resolution notes
          </label>

          <p className="mt-1 text-xs leading-5 text-[var(--tp-muted)]">
            Summarize what was investigated,
            what intervention was performed,
            and why the case can now be
            considered complete.
          </p>

          <textarea
            id="resolution_notes"
            name="resolution_notes"
            value={
              resolutionNotes
            }
            onChange={(
              event
            ) =>
              setResolutionNotes(
                event.target.value
              )
            }
            minLength={
              10
            }
            maxLength={
              4000
            }
            required
            rows={
              6
            }
            placeholder="Example: Investigation and remediation completed. Required Collection restrictions were applied, verified and subsequently lifted. Normal Collection operations have been restored and no active enforcement action remains."
            className="mt-3 w-full resize-y rounded-2xl border border-[var(--tp-border-strong)] bg-white px-4 py-3 text-sm leading-6 text-[var(--tp-ink)] outline-none transition placeholder:text-[var(--tp-faint)] focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          />

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--tp-faint)]">
            <span>
              Minimum 10 characters
            </span>

            <span>
              {
                resolutionNotes
                  .trim()
                  .length
              }{" "}
              / 4000
            </span>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border bg-[var(--tp-bg-soft)] p-5">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={
                confirmed
              }
              onChange={(
                event
              ) =>
                setConfirmed(
                  event.target
                    .checked
                )
              }
              required
              className="mt-1 h-4 w-4"
            />

            <span>
              <span className="block text-sm font-semibold text-[var(--tp-ink)]">
                Confirm final resolution
              </span>

              <span className="mt-1 block text-sm leading-6 text-[var(--tp-ink-soft)]">
                I have reviewed the case,
                confirmed that required
                intervention and remediation
                are complete, and understand
                that resolving this case will
                permanently record the final
                administrative decision.
              </span>
            </span>
          </label>
        </div>

        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-semibold text-red-900">
            Final case action
          </p>

          <p className="mt-2 text-sm leading-6 text-red-800">
            Resolving this case closes the
            active Trust & Safety
            investigation. Historical
            enforcement actions and audit
            records will remain permanently
            available.
          </p>
        </div>

        <button
          type="submit"
          disabled={
            !canSubmit
          }
          className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[var(--tp-primary)] px-6 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300 md:w-auto"
        >
          Resolve case
        </button>
      </form>
    </section>
  );
}
