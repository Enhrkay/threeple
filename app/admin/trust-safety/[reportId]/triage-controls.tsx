import {
  triageTrustSafetyCase,
} from "./actions";

type Props = {
  reportId: string;
};

export default function TriageControls({
  reportId,
}: Props) {
  return (
    <section className="mt-8 rounded-3xl border border-blue-200 bg-blue-50 p-6 md:p-8">

      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
        Investigation Outcome
      </p>

      <h2 className="mt-2 text-xl font-semibold text-blue-950">
        Triage Case
      </h2>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-800">
        Record the outcome of the
        investigation. Every change
        is written to the Threeple
        administrative audit trail.
      </p>

      <form
        action={
          triageTrustSafetyCase
        }
        className="mt-6 space-y-5"
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
            htmlFor="new_status"
            className="mb-2 block text-sm font-semibold text-blue-950"
          >
            Investigation Outcome
          </label>

          <select
            id="new_status"
            name="new_status"
            required
            defaultValue=""
            className="h-12 w-full rounded-xl border border-blue-300 bg-white px-4 outline-none focus:border-black md:max-w-md"
          >

            <option
              value=""
              disabled
            >
              Select outcome
            </option>

            <option value="action_required">
              Action Required
            </option>

            <option value="resolved">
              Resolve Case
            </option>

            <option value="dismissed">
              Dismiss Case
            </option>

          </select>

        </div>

        <div>

          <label
            htmlFor="triage_reason"
            className="mb-2 block text-sm font-semibold text-blue-950"
          >
            Investigation Notes / Reason
          </label>

          <textarea
            id="triage_reason"
            name="reason"
            required
            minLength={10}
            maxLength={4000}
            rows={6}
            placeholder="Summarize the investigation findings and explain why this outcome is appropriate..."
            className="w-full rounded-xl border border-blue-300 bg-white px-4 py-3 outline-none focus:border-black"
          />

          <p className="mt-2 text-xs leading-5 text-blue-700">
            This becomes part of the
            permanent administrative
            audit history.
          </p>

        </div>

        <div className="rounded-2xl bg-white p-5">

          <p className="text-sm font-semibold">
            Outcome meanings
          </p>

          <div className="mt-3 space-y-3 text-sm leading-6 text-neutral-600">

            <p>
              <strong>
                Action Required:
              </strong>{" "}
              the investigation found
              an issue that may require
              a platform intervention.
            </p>

            <p>
              <strong>
                Resolved:
              </strong>{" "}
              the investigation is
              complete and no further
              platform intervention is
              required.
            </p>

            <p>
              <strong>
                Dismissed:
              </strong>{" "}
              the report is unsupported,
              mistaken or not actionable.
            </p>

          </div>

        </div>

        <details>

          <summary className="cursor-pointer text-sm font-semibold text-blue-900">
            Continue to confirmation
          </summary>

          <div className="mt-4 rounded-2xl border border-blue-300 bg-white p-5">

            <p className="text-sm leading-6 text-neutral-700">
              Confirm only after you
              have completed the case
              review. This action will
              be recorded in the
              Threeple admin audit log.
            </p>

            <button
              type="submit"
              className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              Record Outcome
            </button>

          </div>

        </details>

      </form>

    </section>
  );
}