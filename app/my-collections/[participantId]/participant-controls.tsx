import {
  leaveCollection,
  updateMyParticipantDetails,
} from "./actions";

type Props = {
  participantId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  participationStatus: string;
};

export default function ParticipantControls({
  participantId,
  fullName,
  phone,
  email,
  isActive,
  participationStatus,
}: Props) {
  return (
    <section className="mt-8 rounded-3xl border bg-white p-6 md:p-8">

      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
        Participant Settings
      </p>

      <h2 className="mt-2 text-xl font-semibold">
        Manage my participation
      </h2>

      <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
        Update the personal details
        associated with this
        Collection.
      </p>

      {/* DETAILS FORM */}

      <form
        action={
          updateMyParticipantDetails
        }
        className="mt-7 space-y-5"
      >

        <input
          type="hidden"
          name="participant_id"
          value={
            participantId
          }
        />

        <div>

          <label
            htmlFor="participant_name"
            className="mb-2 block text-sm font-medium"
          >
            Full name
          </label>

          <input
            id="participant_name"
            name="full_name"
            required
            defaultValue={
              fullName
            }
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
          />

        </div>

        <div>

          <label
            htmlFor="participant_phone"
            className="mb-2 block text-sm font-medium"
          >
            Phone number
          </label>

          <input
            id="participant_phone"
            name="phone"
            type="tel"
            defaultValue={
              phone ?? ""
            }
            placeholder="+234..."
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
          />

        </div>

        <div>

          <label className="mb-2 block text-sm font-medium">
            Account email
          </label>

          <div className="rounded-xl bg-neutral-100 px-4 py-3 text-sm text-neutral-600">
            {email ||
              "No email available"}
          </div>

          <p className="mt-2 text-xs leading-5 text-neutral-500">
            Your email cannot be
            changed from this
            Collection because it is
            used to securely link
            your participant record
            to your Threeple
            account.
          </p>

        </div>

        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          Save Changes
        </button>

      </form>

      {/* LEAVE */}

      {isActive &&
        participationStatus !==
          "declined" && (
          <div className="mt-8 border-t pt-7">

            <h3 className="font-semibold">
              Leave Collection
            </h3>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
              Leaving will deactivate
              your participation but
              will not delete your
              historical record.
            </p>

            <details className="mt-4">

              <summary className="cursor-pointer text-sm font-semibold text-red-700">
                Leave this Collection
              </summary>

              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-5">

                <p className="text-sm leading-6 text-red-800">
                  Your organizer will
                  be able to see that
                  you left. Any
                  existing historical
                  activity remains
                  preserved.
                </p>

                <form
                  action={
                    leaveCollection
                  }
                  className="mt-4"
                >

                  <input
                    type="hidden"
                    name="participant_id"
                    value={
                      participantId
                    }
                  />

                  <button
                    type="submit"
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800"
                  >
                    Yes, Leave
                    Collection
                  </button>

                </form>

              </div>

            </details>

          </div>
        )}

      {!isActive && (
        <div className="mt-8 rounded-2xl bg-neutral-100 p-5">

          <p className="font-medium">
            Participation inactive
          </p>

          <p className="mt-2 text-sm leading-6 text-neutral-500">
            Contact the Collection
            organizer if you need
            your participation
            restored.
          </p>

        </div>
      )}

    </section>
  );
}