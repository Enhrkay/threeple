"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";

import {
  createCollection,
} from "./actions";

import {
  ThreepleAppShell,
} from "@/components/threeple/app-shell";
type CollectionMode =
  | ""
  | "target"
  | "fixed_per_person"
  | "flexible"
  | "event_fee"
  | "recurring_dues"
  | "rotating_pool";

const modeOptions: Array<{
  value: Exclude<
    CollectionMode,
    ""
  >;
  title: string;
  short: string;
  description: string;
  tone: string;
}> = [
  {
    value: "target",
    title: "Shared target",
    short: "Equal share",
    description:
      "Set one goal and planned group size. Threeple calculates the same required contribution for everyone.",
    tone:
      "border-[var(--tp-primary-border)] bg-[var(--tp-primary-soft)]",
  },
  {
    value:
      "fixed_per_person",
    title: "Fixed per person",
    short: "Same amount",
    description:
      "Set exactly what each participant is expected to contribute.",
    tone:
      "border-[var(--tp-success-border)] bg-[var(--tp-success-soft)]",
  },
  {
    value: "flexible",
    title: "Flexible goal",
    short: "Different amounts",
    description:
      "Set a shared target while allowing people to contribute different amounts.",
    tone:
      "border-[var(--tp-info-border)] bg-[var(--tp-info-soft)]",
  },
  {
    value: "rotating_pool",
    title: "Ajo / Esusu",
    short: "Rotational",
    description:
      "Members contribute by cycle and recipients receive in an agreed order.",
    tone:
      "border-[var(--tp-warning-border)] bg-[var(--tp-warning-soft)]",
  },
  {
    value: "recurring_dues",
    title: "Recurring dues",
    short: "Weekly / monthly",
    description:
      "Collect the same recurring contribution from a group on a schedule.",
    tone:
      "border-[var(--tp-border)] bg-[var(--tp-bg-soft)]",
  },
  {
    value: "event_fee",
    title: "Event fee",
    short: "Attendance fee",
    description:
      "Set a fixed amount each attendee must contribute toward an event.",
    tone:
      "border-[var(--tp-border)] bg-[var(--tp-bg-soft)]",
  },
];

function money(
  value: number,
  currency: string
) {
  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return "â€”";
  }

  return new Intl.NumberFormat(
    "en-NG",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }
  ).format(value);
}

export default function NewCollectionPage() {
  const [
    mode,
    setMode,
  ] =
    useState<CollectionMode>(
      ""
    );

  const [
    currency,
    setCurrency,
  ] =
    useState("NGN");

  const [
    targetAmount,
    setTargetAmount,
  ] =
    useState("");

  const [
    expectedCount,
    setExpectedCount,
  ] =
    useState("");

  const [
    defaultAmount,
    setDefaultAmount,
  ] =
    useState("");

  const calculatedShare =
    useMemo(() => {
      const target =
        Number(
          targetAmount
        );

      const count =
        Number(
          expectedCount
        );

      if (
        mode !== "target" ||
        !Number.isFinite(
          target
        ) ||
        !Number.isFinite(
          count
        ) ||
        target <= 0 ||
        count <= 0
      ) {
        return 0;
      }

      return (
        Math.round(
          (
            target /
            count
          ) *
            100
        ) / 100
      );
    }, [
      mode,
      targetAmount,
      expectedCount,
    ]);

  const policy =
    mode === "target"
      ? "calculated_equal_share"
      : mode ===
            "fixed_per_person" ||
          mode ===
            "event_fee"
        ? "fixed_per_person"
        : mode ===
            "flexible"
          ? "flexible"
          : mode ===
                "recurring_dues" ||
              mode ===
                "rotating_pool"
            ? "schedule_based"
            : "";

  return (
    <ThreepleAppShell
      title="Create Collection"
      subtitle="Set the contribution rules"
    >
      <div className="mx-auto max-w-5xl">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--tp-primary-border)] bg-[var(--tp-primary)] p-6 text-white shadow-[var(--tp-shadow-md)] sm:p-8 lg:p-10">
          <Link
            href="/dashboard"
            className="text-sm font-black text-white/65 transition hover:text-white"
          >
            Back to dashboard
          </Link>

          <p className="mt-7 text-xs font-black uppercase tracking-[0.16em] text-white/45">
            New collection
          </p>

          <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">
            Set the rules once.
            <br />
            Keep everyone aligned.
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
            Choose how people will contribute, define the amount or goal, and decide how transparent the collection should be.
          </p>
        </section>

        <form
          action={
            createCollection
          }
          className="mt-6 space-y-6"
        >
          <input
            type="hidden"
            name="contribution_amount_policy"
            value={policy}
          />

          <input
            type="hidden"
            name="collection_mode"
            value={mode}
          />

          <section className="tp-card p-5 sm:p-6 md:p-8">
            <p className="tp-kicker">
              01 Â· Collection
            </p>

            <h2 className="tp-heading mt-2 text-2xl">
              What is this for?
            </h2>

            <p className="tp-body mt-2 text-sm">
              Give participants enough context to understand why they are joining.
            </p>

            <div className="mt-6 grid gap-5">
              <div>
                <label
                  htmlFor="title"
                  className="mb-2 block text-sm font-black"
                >
                  Collection name
                </label>

                <input
                  id="title"
                  name="title"
                  type="text"
                  required
                  minLength={3}
                  maxLength={
                    140
                  }
                  placeholder="e.g. Payo's Wedding"
                  className="tp-input"
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="mb-2 block text-sm font-black"
                >
                  Description
                  <span className="ml-1 font-normal text-[var(--tp-muted)]">
                    optional
                  </span>
                </label>

                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  maxLength={
                    1000
                  }
                  placeholder="Tell participants what this collection is for."
                  className="tp-textarea resize-y"
                />
              </div>

              <div>
                <label
                  htmlFor="collection_type"
                  className="mb-2 block text-sm font-black"
                >
                  Purpose
                </label>

                <select
                  id="collection_type"
                  name="collection_type"
                  required
                  defaultValue=""
                  className="tp-select"
                >
                  <option
                    value=""
                    disabled
                  >
                    Select a purpose
                  </option>

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
              </div>
            </div>
          </section>

          <section className="tp-card p-5 sm:p-6 md:p-8">
            <p className="tp-kicker">
              02 Â· Contribution model
            </p>

            <h2 className="tp-heading mt-2 text-2xl">
              How should people contribute?
            </h2>

            <p className="tp-body mt-2 max-w-2xl text-sm">
              Pick the model that best matches how your group already contributes. Threeple will apply the right rules automatically.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {modeOptions.map(
                (option) => {
                  const selected =
                    mode ===
                    option.value;

                  return (
                    <button
                      key={
                        option.value
                      }
                      type="button"
                      onClick={() =>
                        setMode(
                          option.value
                        )
                      }
                      className={[
                        "min-h-[150px] rounded-[1.5rem] border p-5 text-left transition",
                        option.tone,
                        selected
                          ? "ring-2 ring-[var(--tp-primary)] ring-offset-2 ring-offset-[var(--tp-surface)]"
                          : "hover:-translate-y-0.5 hover:shadow-[var(--tp-shadow-sm)]",
                      ].join(
                        " "
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-black text-[var(--tp-ink)]">
                            {
                              option.title
                            }
                          </p>

                          <p className="mt-1 text-xs font-black uppercase tracking-wide text-[var(--tp-muted)]">
                            {
                              option.short
                            }
                          </p>
                        </div>

                        <span
                          className={[
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-black",
                            selected
                              ? "border-[var(--tp-primary)] bg-[var(--tp-primary)] text-white"
                              : "border-[var(--tp-border-strong)] bg-[var(--tp-surface)] text-transparent",
                          ].join(
                            " "
                          )}
                        >
                          âœ“
                        </span>
                      </div>

                      <p className="mt-4 text-sm leading-6 text-[var(--tp-ink-soft)]">
                        {
                          option.description
                        }
                      </p>
                    </button>
                  );
                }
              )}
            </div>

            {!mode && (
              <div className="tp-alert tp-alert-info mt-5 text-sm">
                Choose a contribution model to continue setting up the financial rules.
              </div>
            )}

            {mode ===
              "target" && (
              <div className="mt-6 rounded-[1.75rem] border border-[var(--tp-primary-border)] bg-[var(--tp-primary-soft)] p-5 sm:p-6">
                <p className="font-black text-[var(--tp-primary)]">
                  Shared target Â· equal contribution
                </p>

                <p className="mt-2 text-sm leading-6 text-[var(--tp-ink-soft)]">
                  Enter the overall goal and planned number of participants. Threeple calculates the same required share for everyone.
                </p>

                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="target_amount"
                      className="mb-2 block text-sm font-black"
                    >
                      Target amount
                    </label>

                    <input
                      id="target_amount"
                      name="target_amount"
                      type="number"
                      min="1"
                      step="0.01"
                      required
                      value={
                        targetAmount
                      }
                      onChange={(
                        event
                      ) =>
                        setTargetAmount(
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="e.g. 50000000"
                      className="tp-input"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="expected_participant_count"
                      className="mb-2 block text-sm font-black"
                    >
                      Planned participants
                    </label>

                    <input
                      id="expected_participant_count"
                      name="expected_participant_count"
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={
                        expectedCount
                      }
                      onChange={(
                        event
                      ) =>
                        setExpectedCount(
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="e.g. 100"
                      className="tp-input"
                    />
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-[var(--tp-primary)] p-5 text-white">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-white/45">
                    Required from each person
                  </p>

                  <p className="mt-2 text-3xl font-black tracking-tight">
                    {money(
                      calculatedShare,
                      currency
                    )}
                  </p>

                  <p className="mt-2 text-sm text-white/60">
                    This share is based on the planned group size, not how many have joined so far.
                  </p>
                </div>

                <p className="mt-4 text-xs leading-5 text-[var(--tp-muted)]">
                  Before the first verified payment, you can adjust the target or planned group size. After the first verified payment, the financial rules are locked.
                </p>
              </div>
            )}

            {(mode ===
              "fixed_per_person" ||
              mode ===
                "event_fee") && (
              <div className="mt-6 rounded-[1.75rem] border border-[var(--tp-success-border)] bg-[var(--tp-success-soft)] p-5 sm:p-6">
                <p className="font-black text-[var(--tp-success)]">
                  {mode ===
                  "event_fee"
                    ? "Fixed event fee"
                    : "Fixed contribution"}
                </p>

                <p className="mt-2 text-sm leading-6 text-[var(--tp-ink-soft)]">
                  Everyone in this collection will have the same expected amount.
                </p>

                <div className="mt-5">
                  <label
                    htmlFor="default_amount"
                    className="mb-2 block text-sm font-black"
                  >
                    Amount each participant contributes
                  </label>

                  <input
                    id="default_amount"
                    name="default_amount"
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={
                      defaultAmount
                    }
                    onChange={(
                      event
                    ) =>
                      setDefaultAmount(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="e.g. 50000"
                    className="tp-input"
                  />
                </div>
              </div>
            )}

            {mode ===
              "flexible" && (
              <div className="mt-6 rounded-[1.75rem] border border-[var(--tp-info-border)] bg-[var(--tp-info-soft)] p-5 sm:p-6">
                <p className="font-black text-[var(--tp-info)]">
                  Flexible goal
                </p>

                <p className="mt-2 text-sm leading-6 text-[var(--tp-ink-soft)]">
                  The group works toward one target, but each participant can choose a different contribution amount.
                </p>

                <div className="mt-5">
                  <label
                    htmlFor="target_amount"
                    className="mb-2 block text-sm font-black"
                  >
                    Overall target
                  </label>

                  <input
                    id="target_amount"
                    name="target_amount"
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={
                      targetAmount
                    }
                    onChange={(
                      event
                    ) =>
                      setTargetAmount(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="e.g. 50000000"
                    className="tp-input"
                  />
                </div>
              </div>
            )}

            {(mode ===
              "recurring_dues" ||
              mode ===
                "rotating_pool") && (
              <div className="mt-6 rounded-[1.75rem] border border-[var(--tp-warning-border)] bg-[var(--tp-warning-soft)] p-5 sm:p-6">
                <p className="font-black text-[var(--tp-warning)]">
                  {mode ===
                  "rotating_pool"
                    ? "Ajo / Esusu contribution"
                    : "Recurring group contribution"}
                </p>

                <p className="mt-2 text-sm leading-6 text-[var(--tp-ink-soft)]">
                  Set the base amount members contribute per cycle. Frequency, cycle generation and recipient order are managed after the collection is created.
                </p>

                <div className="mt-5">
                  <label
                    htmlFor="default_amount"
                    className="mb-2 block text-sm font-black"
                  >
                    Contribution per cycle
                  </label>

                  <input
                    id="default_amount"
                    name="default_amount"
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={
                      defaultAmount
                    }
                    onChange={(
                      event
                    ) =>
                      setDefaultAmount(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="e.g. 50000"
                    className="tp-input"
                  />
                </div>

                {mode ===
                  "rotating_pool" && (
                  <div className="mt-4 rounded-2xl bg-[var(--tp-surface)]/70 p-4 text-sm leading-6 text-[var(--tp-ink-soft)]">
                    After creation, you will be able to prepare members, arrange recipient order and generate the Ajo schedule from the Ajo Control Centre.
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="tp-card p-5 sm:p-6 md:p-8">
            <p className="tp-kicker">
              03 Â· Timing & access
            </p>

            <h2 className="tp-heading mt-2 text-2xl">
              When and who?
            </h2>

            <p className="tp-body mt-2 text-sm">
              Choose the currency, deadline and how participants get access.
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="currency"
                  className="mb-2 block text-sm font-black"
                >
                  Currency
                </label>

                <select
                  id="currency"
                  name="currency"
                  value={
                    currency
                  }
                  onChange={(
                    event
                  ) =>
                    setCurrency(
                      event
                        .target
                        .value
                    )
                  }
                  className="tp-select"
                >
                  <option value="NGN">
                    NGN â€” Nigerian Naira
                  </option>

                  <option value="GBP">
                    GBP â€” British Pound
                  </option>

                  <option value="USD">
                    USD â€” US Dollar
                  </option>

                  <option value="EUR">
                    EUR â€” Euro
                  </option>

                  <option value="CAD">
                    CAD â€” Canadian Dollar
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="deadline"
                  className="mb-2 block text-sm font-black"
                >
                  Deadline
                  <span className="ml-1 font-normal text-[var(--tp-muted)]">
                    optional
                  </span>
                </label>

                <input
                  id="deadline"
                  name="deadline"
                  type="date"
                  className="tp-input"
                />
              </div>

              <div>
                <label
                  htmlFor="visibility"
                  className="mb-2 block text-sm font-black"
                >
                  Visibility
                </label>

                <select
                  id="visibility"
                  name="visibility"
                  defaultValue="private"
                  className="tp-select"
                >
                  <option value="private">
                    Private â€” Threeple Code required
                  </option>

                  <option value="public">
                    Public â€” discoverable collection
                  </option>
                </select>
              </div>
            </div>
          </section>

          <section className="tp-card p-5 sm:p-6 md:p-8">
            <p className="tp-kicker">
              04 Â· Participation rules
            </p>

            <h2 className="tp-heading mt-2 text-2xl">
              How flexible should it be?
            </h2>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-[1.5rem] border border-[var(--tp-border)] bg-[var(--tp-bg-soft)] p-5 transition hover:border-[var(--tp-border-strong)]">
                <input
                  type="checkbox"
                  name="allow_partial_payments"
                  className="mt-1 h-5 w-5 accent-[var(--tp-primary)]"
                />

                <span>
                  <span className="block text-sm font-black">
                    Allow partial contributions
                  </span>

                  <span className="mt-1 block text-xs leading-5 text-[var(--tp-muted)]">
                    Members can complete their required amount across multiple payments.
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-[1.5rem] border border-[var(--tp-border)] bg-[var(--tp-bg-soft)] p-5 transition hover:border-[var(--tp-border-strong)]">
                <input
                  type="checkbox"
                  name="requires_approval"
                  className="mt-1 h-5 w-5 accent-[var(--tp-primary)]"
                />

                <span>
                  <span className="block text-sm font-black">
                    Approve members before they contribute
                  </span>

                  <span className="mt-1 block text-xs leading-5 text-[var(--tp-muted)]">
                    New members can join, but you approve their participation before contribution starts.
                  </span>
                </span>
              </label>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-[var(--tp-primary-border)] bg-[var(--tp-primary-soft)] p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-[var(--tp-primary)]">
                  Ready to create?
                </p>

                <p className="mt-1 max-w-xl text-xs leading-5 text-[var(--tp-ink-soft)]">
                  Your collection starts as a draft. You can review it before activating and sharing the Threeple Code.
                </p>
              </div>

              <button
                type="submit"
                disabled={
                  !mode
                }
                className="tp-btn tp-btn-primary min-h-12 shrink-0 px-7 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mode
                  ? "Create collection"
                  : "Choose a model first"}
              </button>
            </div>
          </section>
        </form>
      </div>
    </ThreepleAppShell>
  );
}


