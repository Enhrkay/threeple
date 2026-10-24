import {
  startTrustSafetyReview,
} from "./actions";

type Props = {
  reportId: string;
  currentPriority: string;
};

export default function ReviewControls({
  reportId,
  currentPriority,
}: Props) {
  return (
    <section className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6 md:p-8">

      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
        Investigation Control
      </p>

      <h2 className="mt-2 text-xl font-semibold text-amber-950">
        Start Review
      </h2>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-800">
        Starting a review assigns
        this case to you and moves
        it from Open to Under
        Review. The reason and
        priority will be recorded
        in the platform audit log.
      </p>

      <form
        action={
          startTrustSafetyReview
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
            htmlFor="priority"
            className="mb-2 block text-sm font-semibold text-amber-950"
          >
            Case Priority
          </label>

          <select
            id="priority"
            name="priority"
            required
            defaultValue={
              currentPriority
            }
            className="h-12 w-full rounded-xl border border-amber-300 bg-white px-4 outline-none focus:border-black md:max-w-sm"
          >
            <option value="low">
              Low
            </option>

            <option value="normal">
              Normal
            </option>

            <option value="high">
              High
            </option>

            <option value="urgent">
              Urgent
            </option>
          </select>

        </div>

        <div>

          <label
            htmlFor="reason"
            className="mb-2 block text-sm font-semibold text-amber-950"
          >
            Reason for Starting Review
          </label>

          <textarea
            id="reason"
            name="reason"
            required
            minLength={10}
            maxLength={2000}
            rows={5}
            placeholder="Explain why this case requires investigation..."
            className="w-full rounded-xl border border-amber-300 bg-white px-4 py-3 outline-none focus:border-black"
          />

          <p className="mt-2 text-xs leading-5 text-amber-700">
            This reason becomes part
            of the permanent admin
            audit history.
          </p>

        </div>

        <details>

          <summary className="cursor-pointer text-sm font-semibold text-amber-900">
            Continue to confirmation
          </summary>

          <div className="mt-4 rounded-2xl border border-amber-300 bg-white p-5">

            <p className="text-sm leading-6 text-neutral-700">
              This will assign the
              case to your admin
              account and change its
              status to{" "}
              <strong>
                Under Review
              </strong>.
            </p>

            <button
              type="submit"
              className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              Start Review
            </button>

          </div>

        </details>

      </form>

    </section>
  );
}