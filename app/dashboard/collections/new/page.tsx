"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createCollection } from "./actions";

type CollectionMode =
  | ""
  | "target"
  | "fixed_per_person"
  | "flexible"
  | "event_fee"
  | "recurring_dues"
  | "rotating_pool";

function money(value: number, currency: string) {
  if (!Number.isFinite(value) || value <= 0) return "—";

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function NewCollectionPage() {
  const [mode, setMode] = useState<CollectionMode>("");
  const [currency, setCurrency] = useState("NGN");
  const [targetAmount, setTargetAmount] = useState("");
  const [expectedCount, setExpectedCount] = useState("");
  const [defaultAmount, setDefaultAmount] = useState("");
  const [coordinatorFeeMode, setCoordinatorFeeMode] = useState("none");

  const calculatedShare = useMemo(() => {
    const target = Number(targetAmount);
    const count = Number(expectedCount);

    if (
      mode !== "target" ||
      !Number.isFinite(target) ||
      !Number.isFinite(count) ||
      target <= 0 ||
      count <= 0
    ) {
      return 0;
    }

    return Math.round((target / count) * 100) / 100;
  }, [mode, targetAmount, expectedCount]);

  const policy =
    mode === "target"
      ? "calculated_equal_share"
      : mode === "fixed_per_person" || mode === "event_fee"
        ? "fixed_per_person"
        : mode === "flexible"
          ? "flexible"
          : mode === "recurring_dues" || mode === "rotating_pool"
            ? "schedule_based"
            : "";

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#171717]">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="text-sm font-semibold text-black/45 transition hover:text-black"
            >
              ← Dashboard
            </Link>

            <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-black/35">
              New collection
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">
              Set the rules once.
              <br />
              Let Threeple keep everyone aligned.
            </h1>

            <p className="mt-4 max-w-2xl leading-7 text-black/55">
              Define the goal, contribution model and participation rules.
              Threeple will calculate and enforce the financial structure for
              the group.
            </p>
          </div>
        </div>

        <form
          action={createCollection}
          className="space-y-7"
        >
          <input
            type="hidden"
            name="contribution_amount_policy"
            value={policy}
          />

          <section className="rounded-[2rem] border border-black/10 bg-white p-6 md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/35">
              01 · Collection
            </p>
            <h2 className="mt-2 text-xl font-black">
              What are you contributing towards?
            </h2>

            <div className="mt-6 grid gap-5">
              <div>
                <label
                  htmlFor="title"
                  className="mb-2 block text-sm font-semibold"
                >
                  Collection name
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  required
                  minLength={3}
                  maxLength={140}
                  placeholder="e.g. Payo's Wedding"
                  className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none transition focus:border-black"
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="mb-2 block text-sm font-semibold"
                >
                  Description
                  <span className="ml-1 font-normal text-black/35">
                    optional
                  </span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  maxLength={1000}
                  placeholder="Tell participants what this collection is for."
                  className="w-full resize-y rounded-2xl border border-black/10 px-4 py-3 outline-none transition focus:border-black"
                />
              </div>

              <div>
                <label
                  htmlFor="collection_type"
                  className="mb-2 block text-sm font-semibold"
                >
                  Purpose
                </label>
                <select
                  id="collection_type"
                  name="collection_type"
                  required
                  defaultValue=""
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-black"
                >
                  <option value="" disabled>
                    Select a purpose
                  </option>
                  <option value="wedding">Wedding</option>
                  <option value="event">Event</option>
                  <option value="society_dues">Society dues</option>
                  <option value="association_dues">Association dues</option>
                  <option value="group_contribution">Group contribution</option>
                  <option value="project_fund">Project fund</option>
                  <option value="trip">Trip</option>
                  <option value="shared_gift">Shared gift</option>
                  <option value="levy">Levy</option>
                  <option value="community_fund">Community fund</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-black/10 bg-white p-6 md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/35">
              02 · Contribution model
            </p>
            <h2 className="mt-2 text-xl font-black">
              How should the group contribute?
            </h2>
            <p className="mt-2 text-sm leading-6 text-black/50">
              This determines how Threeple calculates each participant&apos;s
              obligation.
            </p>

            <div className="mt-6">
              <label
                htmlFor="collection_mode"
                className="mb-2 block text-sm font-semibold"
              >
                Contribution model
              </label>

              <select
                id="collection_mode"
                name="collection_mode"
                required
                value={mode}
                onChange={(event) =>
                  setMode(event.target.value as CollectionMode)
                }
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-black"
              >
                <option value="" disabled>
                  Select contribution model
                </option>
                <option value="target">
                  Shared target — Threeple divides the target equally
                </option>
                <option value="fixed_per_person">
                  Fixed amount — organizer sets what each person pays
                </option>
                <option value="event_fee">
                  Event fee — fixed amount required from each attendee
                </option>
                <option value="flexible">
                  Flexible target — participants may contribute different amounts
                </option>
                <option value="recurring_dues">
                  Recurring dues — weekly/monthly group contribution
                </option>
                <option value="rotating_pool">
                  Rotational contribution — Ajo / Esusu style
                </option>
              </select>
            </div>

            {mode === "target" && (
              <div className="mt-6 rounded-3xl bg-[#f7f7f5] p-5 md:p-6">
                <p className="font-bold">Equal-share target</p>
                <p className="mt-1 text-sm leading-6 text-black/50">
                  Tell Threeple the goal and planned group size. Every
                  participant gets the same required contribution.
                </p>

                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="target_amount"
                      className="mb-2 block text-sm font-semibold"
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
                      value={targetAmount}
                      onChange={(event) =>
                        setTargetAmount(event.target.value)
                      }
                      placeholder="e.g. 50000000"
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="expected_participant_count"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Expected participants
                    </label>
                    <input
                      id="expected_participant_count"
                      name="expected_participant_count"
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={expectedCount}
                      onChange={(event) =>
                        setExpectedCount(event.target.value)
                      }
                      placeholder="e.g. 100"
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-black"
                    />
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-black p-5 text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
                    Threeple calculated share
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-tight">
                    {money(calculatedShare, currency)}
                  </p>
                  <p className="mt-2 text-sm text-white/55">
                    required from each participant
                  </p>
                </div>

                <p className="mt-4 text-xs leading-5 text-black/40">
                  This amount remains stable as people join. Once the first
                  verified payment succeeds, Threeple locks the financial rules.
                </p>
              </div>
            )}

            {(mode === "fixed_per_person" || mode === "event_fee") && (
              <div className="mt-6 rounded-3xl bg-[#f7f7f5] p-5">
                <label
                  htmlFor="default_amount"
                  className="mb-2 block text-sm font-semibold"
                >
                  Amount each participant must contribute
                </label>
                <input
                  id="default_amount"
                  name="default_amount"
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={defaultAmount}
                  onChange={(event) =>
                    setDefaultAmount(event.target.value)
                  }
                  placeholder="e.g. 50000"
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-black"
                />
              </div>
            )}

            {mode === "flexible" && (
              <div className="mt-6 rounded-3xl bg-[#f7f7f5] p-5">
                <label
                  htmlFor="target_amount"
                  className="mb-2 block text-sm font-semibold"
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
                  value={targetAmount}
                  onChange={(event) =>
                    setTargetAmount(event.target.value)
                  }
                  placeholder="e.g. 50000000"
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-black"
                />
                <p className="mt-2 text-xs leading-5 text-black/40">
                  Participants can choose different contribution amounts toward
                  the shared target.
                </p>
              </div>
            )}

            {mode === "recurring_dues" && (
              <div className="mt-6 rounded-3xl border border-black/10 bg-[#f7f7f5] p-5">
                <p className="font-bold">
                  Recurring contribution
                </p>

                <p className="mt-2 text-sm leading-6 text-black/50">
                  Set the base contribution per cycle. Recurring scheduling will be configured in its dedicated workflow.
                </p>

                <div className="mt-4">
                  <label
                    htmlFor="default_amount"
                    className="mb-2 block text-sm font-semibold"
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
                    value={defaultAmount}
                    onChange={(event) =>
                      setDefaultAmount(event.target.value)
                    }
                    placeholder="e.g. 50000"
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-black"
                  />
                </div>
              </div>
            )}

            {mode === "rotating_pool" && (
              <div className="mt-6 rounded-3xl border border-black/10 bg-[#f7f7f5] p-5 md:p-6">
                <p className="font-bold">
                  Rotational contribution
                </p>

                <p className="mt-2 text-sm leading-6 text-black/50">
                  Configure the Ajo / Esusu cycle. Members join first; then you arrange recipient order and generate the schedule.
                </p>

                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="default_amount"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Contribution per member, per cycle
                    </label>

                    <input
                      id="default_amount"
                      name="default_amount"
                      type="number"
                      min="1"
                      step="0.01"
                      required
                      value={defaultAmount}
                      onChange={(event) =>
                        setDefaultAmount(event.target.value)
                      }
                      placeholder="e.g. 50000"
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="rotation_frequency"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Cycle frequency
                    </label>

                    <select
                      id="rotation_frequency"
                      name="rotation_frequency"
                      required
                      defaultValue="monthly"
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-black"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Every 2 weeks</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="rotation_start_date"
                      className="mb-2 block text-sm font-semibold"
                    >
                      First cycle date
                    </label>

                    <input
                      id="rotation_start_date"
                      name="rotation_start_date"
                      type="date"
                      required
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="coordinator_fee_mode"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Coordinator fee
                    </label>

                    <select
                      id="coordinator_fee_mode"
                      name="coordinator_fee_mode"
                      value={coordinatorFeeMode}
                      onChange={(event) =>
                        setCoordinatorFeeMode(event.target.value)
                      }
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-black"
                    >
                      <option value="none">
                        No coordinator fee
                      </option>
                      <option value="fixed">
                        Fixed amount per cycle
                      </option>
                      <option value="percentage">
                        Percentage of cycle pot
                      </option>
                    </select>
                  </div>

                  {coordinatorFeeMode !== "none" && (
                    <div className="md:col-span-2">
                      <label
                        htmlFor="coordinator_fee_value"
                        className="mb-2 block text-sm font-semibold"
                      >
                        {coordinatorFeeMode === "percentage"
                          ? "Coordinator percentage"
                          : "Coordinator amount per cycle"}
                      </label>

                      <input
                        id="coordinator_fee_value"
                        name="coordinator_fee_value"
                        type="number"
                        min="0"
                        max={
                          coordinatorFeeMode === "percentage"
                            ? "100"
                            : undefined
                        }
                        step="0.01"
                        required
                        placeholder={
                          coordinatorFeeMode === "percentage"
                            ? "e.g. 2.5"
                            : "e.g. 5000"
                        }
                        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-black"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-5 rounded-2xl bg-white p-4 text-xs leading-5 text-black/45">
                  Threeple tracks recipient order, cycles and contribution obligations. Paystack continues to handle the actual settlement of funds.
                </div>
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-black/10 bg-white p-6 md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/35">
              03 · Timing & access
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="currency"
                  className="mb-2 block text-sm font-semibold"
                >
                  Currency
                </label>
                <select
                  id="currency"
                  name="currency"
                  value={currency}
                  onChange={(event) =>
                    setCurrency(event.target.value)
                  }
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-black"
                >
                  <option value="NGN">NGN — Nigerian Naira</option>
                  <option value="GBP">GBP — British Pound</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="CAD">CAD — Canadian Dollar</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="deadline"
                  className="mb-2 block text-sm font-semibold"
                >
                  Deadline
                  <span className="ml-1 font-normal text-black/35">
                    optional
                  </span>
                </label>
                <input
                  id="deadline"
                  name="deadline"
                  type="date"
                  className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              <div>
                <label
                  htmlFor="visibility"
                  className="mb-2 block text-sm font-semibold"
                >
                  Visibility
                </label>
                <select
                  id="visibility"
                  name="visibility"
                  defaultValue="private"
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-black"
                >
                  <option value="private">
                    Private — join code required
                  </option>
                  <option value="public">
                    Public — discoverable collection
                  </option>
                </select>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/10 p-4">
                <input
                  type="checkbox"
                  name="allow_partial_payments"
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <span className="block text-sm font-bold">
                    Allow partial payments
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-black/45">
                    Participants may complete their required contribution in
                    multiple payments.
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/10 p-4">
                <input
                  type="checkbox"
                  name="requires_approval"
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <span className="block text-sm font-bold">
                    Require organizer approval
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-black/45">
                    New members must be approved before they can contribute.
                  </span>
                </span>
              </label>
            </div>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-xs leading-5 text-black/40">
              The collection starts as a draft. You can review it before
              activating and inviting participants.
            </p>

            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center rounded-full bg-black px-7 text-sm font-bold text-white transition hover:opacity-85"
            >
              Create collection
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}


