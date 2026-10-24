"use client";

import {
  useState,
  type FormEvent,
} from "react";

import {
  useFormStatus,
} from "react-dom";

import {
  liftUserRestriction,
  restrictUser,
} from "./actions";

type Restriction = {
  id: string;
  restriction_type: string;
  reason: string;
  imposed_at: string;
  imposed_by: string;
};

type Props = {
  reportId: string;
  userId: string;
  userLabel: string;
  reportStatus: string;
  restriction:
    | Restriction
    | null;
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

function SubmitButton({
  mode,
}: {
  mode:
    | "restrict"
    | "lift";
}) {
  const {
    pending,
  } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
        mode === "restrict"
          ? "bg-red-700 hover:bg-red-800"
          : "bg-green-700 hover:bg-green-800"
      }`}
    >
      {pending
        ? mode === "restrict"
          ? "Applying Restriction..."
          : "Lifting Restriction..."
        : mode === "restrict"
          ? "Restrict User"
          : "Lift Restriction"}
    </button>
  );
}

export default function UserRestrictionSection({
  reportId,
  userId,
  userLabel,
  reportStatus,
  restriction,
}: Props) {
  const [
    restrictionType,
    setRestrictionType,
  ] = useState(
    "full_platform"
  );

  const [
    restrictReason,
    setRestrictReason,
  ] = useState("");

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

  function handleRestrict(
    event:
      FormEvent<HTMLFormElement>
  ) {
    if (
      restrictReason.trim()
        .length < 10
    ) {
      event.preventDefault();

      window.alert(
        "Enter a restriction reason of at least 10 characters."
      );

      return;
    }

    if (
      !restrictConfirmed
    ) {
      event.preventDefault();

      window.alert(
        "Confirm that you understand the effect of this user restriction."
      );

      return;
    }

    if (
      !window.confirm(
        `Restrict "${userLabel}"?\n\nRestriction type: ${friendlyText(
          restrictionType
        )}\n\nThis enforcement action will be permanently recorded.`
      )
    ) {
      event.preventDefault();
    }
  }

  function handleLift(
    event:
      FormEvent<HTMLFormElement>
  ) {
    if (
      liftReason.trim()
        .length < 10
    ) {
      event.preventDefault();

      window.alert(
        "Enter a lift reason of at least 10 characters."
      );

      return;
    }

    if (
      !liftConfirmed
    ) {
      event.preventDefault();

      window.alert(
        "Confirm that you understand the effect of lifting this restriction."
      );

      return;
    }

    if (
      !window.confirm(
        `Lift the active restriction on "${userLabel}"?`
      )
    ) {
      event.preventDefault();
    }
  }

  if (restriction) {
    return (
      <section className="mt-8 overflow-hidden rounded-3xl border border-red-200 bg-white">
        <div className="border-b border-red-100 bg-red-50 px-6 py-6 md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-red-700">
            Active User Restriction
          </p>

          <h2 className="mt-2 text-xl font-semibold text-red-950">
            Account Restricted
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-red-800">
            Threeple is actively enforcing
            restrictions against this user
            account.
          </p>
        </div>

        <div className="px-6 py-6 md:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Restriction Type
              </p>

              <p className="mt-2 text-sm font-semibold">
                {friendlyText(
                  restriction.restriction_type
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Imposed
              </p>

              <p className="mt-2 text-sm font-semibold">
                {formatDateTime(
                  restriction.imposed_at
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Restriction ID
              </p>

              <p className="mt-2 break-all font-mono text-xs text-neutral-500">
                {restriction.id}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border bg-neutral-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Reason
            </p>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-700">
              {restriction.reason}
            </p>
          </div>

          <form
            action={
              liftUserRestriction
            }
            onSubmit={
              handleLift
            }
            className="mt-8 border-t pt-8"
          >
            <input
              type="hidden"
              name="report_id"
              value={reportId}
            />

            <input
              type="hidden"
              name="user_id"
              value={userId}
            />

            <label className="text-sm font-semibold">
              Reason for lifting
            </label>

            <textarea
              name="reason"
              value={liftReason}
              onChange={(
                event
              ) =>
                setLiftReason(
                  event.target.value
                )
              }
              minLength={10}
              required
              className="mt-2 min-h-28 w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-neutral-500"
            />

            <label className="mt-4 flex items-start gap-3 text-sm text-neutral-700">
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
                className="mt-1"
              />

              <span>
                I have reviewed the case and
                understand that lifting this
                restriction restores the
                affected account capabilities.
              </span>
            </label>

            <div className="mt-5">
              <SubmitButton mode="lift" />
            </div>
          </form>
        </div>
      </section>
    );
  }

  if (
    reportStatus !==
    "action_required"
  ) {
    return null;
  }

  return (
    <section className="mt-8 rounded-3xl border border-red-200 bg-white p-6 md:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-red-700">
        User Enforcement
      </p>

      <h2 className="mt-2 text-xl font-semibold">
        Restrict User Account
      </h2>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
        Apply a scoped platform
        restriction to {userLabel}.
      </p>

      <form
        action={restrictUser}
        onSubmit={
          handleRestrict
        }
        className="mt-6"
      >
        <input
          type="hidden"
          name="report_id"
          value={reportId}
        />

        <input
          type="hidden"
          name="user_id"
          value={userId}
        />

        <label className="text-sm font-semibold">
          Restriction type
        </label>

        <select
          name="restriction_type"
          value={restrictionType}
          onChange={(
            event
          ) =>
            setRestrictionType(
              event.target.value
            )
          }
          className="mt-2 h-11 w-full rounded-xl border px-3 text-sm"
        >
          <option value="participation_block">
            Participation Block
          </option>

          <option value="organizer_block">
            Organizer Block
          </option>

          <option value="full_platform">
            Full Platform
          </option>
        </select>

        <div className="mt-4 rounded-2xl border bg-neutral-50 p-4 text-sm leading-6 text-neutral-600">
          <strong>
            Participation Block:
          </strong>{" "}
          blocks new participation.
          <br />
          <strong>
            Organizer Block:
          </strong>{" "}
          blocks Collection creation and
          management.
          <br />
          <strong>
            Full Platform:
          </strong>{" "}
          applies both controls.
        </div>

        <label className="mt-5 block text-sm font-semibold">
          Enforcement reason
        </label>

        <textarea
          name="reason"
          value={restrictReason}
          onChange={(
            event
          ) =>
            setRestrictReason(
              event.target.value
            )
          }
          minLength={10}
          required
          className="mt-2 min-h-28 w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-neutral-500"
        />

        <label className="mt-4 flex items-start gap-3 text-sm text-neutral-700">
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
            className="mt-1"
          />

          <span>
            I understand this is an
            administrative enforcement
            action and will be permanently
            recorded in the audit history.
          </span>
        </label>

        <div className="mt-5">
          <SubmitButton mode="restrict" />
        </div>
      </form>
    </section>
  );
}
