"use client";

import {
  useState,
  type FormEvent,
} from "react";

import {
  useFormStatus,
} from "react-dom";

import {
  liftOrganizationRestriction,
  restrictOrganization,
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
  organizationId: string;
  organizationLabel: string;
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
          ? "Restrict Organization"
          : "Lift Restriction"}
    </button>
  );
}

export default function OrganizationRestrictionSection({
  reportId,
  organizationId,
  organizationLabel,
  reportStatus,
  restriction,
}: Props) {
  const [
    restrictionType,
    setRestrictionType,
  ] = useState(
    "full_organization"
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
        `Restrict "${organizationLabel}"?\n\nRestriction type: ${friendlyText(
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
        `Lift the active restriction on "${organizationLabel}"?`
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
            Active Organization Restriction
          </p>

          <h2 className="mt-2 text-xl font-black tracking-tight text-red-950">
            Organization Restricted
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-red-800">
            Threeple is actively enforcing
            restrictions against this
            organization.
          </p>
        </div>

        <div className="px-6 py-6 md:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
                Restriction Type
              </p>

              <p className="mt-2 text-sm font-semibold">
                {friendlyText(
                  restriction.restriction_type
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
                Imposed
              </p>

              <p className="mt-2 text-sm font-semibold">
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

          <div className="mt-6 rounded-2xl border bg-[var(--tp-bg-soft)] p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
              Reason
            </p>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--tp-ink-soft)]">
              {restriction.reason}
            </p>
          </div>

          <form
            action={
              liftOrganizationRestriction
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
              name="organization_id"
              value={organizationId}
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

            <label className="mt-4 flex items-start gap-3 text-sm text-[var(--tp-ink-soft)]">
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
                affected organization capabilities.
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
        Organization Enforcement
      </p>

      <h2 className="mt-2 text-xl font-black tracking-tight">
        Restrict Organization
      </h2>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--tp-ink-soft)]">
        Apply a scoped platform
        restriction to {organizationLabel}.
      </p>

      <form
        action={restrictOrganization}
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
          name="organization_id"
          value={organizationId}
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
          <option value="new_collection_block">
            New Collection Block
          </option>

          <option value="organizer_changes_block">
            Organizer Changes Block
          </option>

          <option value="full_organization">
            Full Organization
          </option>
        </select>

        <div className="mt-4 rounded-2xl border bg-[var(--tp-bg-soft)] p-4 text-sm leading-6 text-[var(--tp-ink-soft)]">
          <strong>
            New Collection Block:
          </strong>{" "}
          blocks creation of new Collections.
          <br />
          <strong>
            Organizer Changes Block:
          </strong>{" "}
          blocks management of existing Collections.
          <br />
          <strong>
            Full Organization:
          </strong>{" "}
          blocks creation, management and new participation.
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

        <label className="mt-4 flex items-start gap-3 text-sm text-[var(--tp-ink-soft)]">
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


