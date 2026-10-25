import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

import {
  ThreepleAppShell,
} from "@/components/threeple/app-shell";

import {
  ThreepleAlert,
  ThreepleBadge,
  ThreepleStat,
} from "@/components/threeple/design-system";

import {
  generateRecurringSchedule,
  saveRecurringSettings,
} from "./actions";

export const instant = false;

type PageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams?: Promise<{
    error?: string;
    saved?: string;
    generated?: string;
  }>;
};

function money(
  amount:
    | string
    | number
    | null,
  currency: string
) {
  if (
    amount === null ||
    amount === undefined
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
  ).format(
    Number(amount)
  );
}

function errorText(
  code?: string
) {
  switch (code) {
    case "invalid_frequency":
      return "Choose weekly or monthly.";
    case "invalid_amount":
      return "Enter a valid contribution amount.";
    case "start_date_required":
      return "Choose a schedule start date.";
    case "invalid_cycles":
      return "Choose between 1 and 60 cycles.";
    case "invalid_due_day":
      return "Monthly due day must be between 1 and 28.";
    case "schedule_locked":
      return "This schedule has already been generated and is locked.";
    case "save_failed":
      return "Threeple could not save the recurring schedule settings.";
    case "generate_failed":
      return "Threeple could not generate the recurring schedule.";
    default:
      return null;
  }
}

export default async function RecurringCollectionPage({
  params,
  searchParams,
}: PageProps) {
  const {
    id,
  } =
    await params;

  const query =
    await searchParams;

  const supabase =
    await createClient();

  const {
    data: claimsData,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    redirect(
      `/auth/login?next=${encodeURIComponent(
        `/dashboard/collections/${id}/recurring`
      )}`
    );
  }

  const {
    data: collection,
  } =
    await supabaseAdmin
      .from("collections")
      .select(`
        id,
        title,
        currency,
        default_amount,
        organization_id,
        collection_mode
      `)
      .eq("id", id)
      .maybeSingle();

  if (
    !collection ||
    collection.collection_mode !==
      "recurring_dues"
  ) {
    redirect(
      `/dashboard/collections/${id}`
    );
  }

  const {
    data: setting,
  } =
    await supabaseAdmin
      .from(
        "recurring_settings"
      )
      .select(`
        id,
        frequency,
        contribution_amount,
        start_date,
        due_day_of_month,
        grace_days,
        cycles_to_generate,
        schedule_locked
      `)
      .eq(
        "collection_id",
        id
      )
      .maybeSingle();

  const {
    data: cycles,
  } =
    await supabaseAdmin
      .from(
        "recurring_cycles"
      )
      .select(`
        id,
        cycle_number,
        starts_on,
        due_on,
        ends_on,
        status
      `)
      .eq(
        "collection_id",
        id
      )
      .order(
        "cycle_number",
        {
          ascending: true,
        }
      );

  const {
    count: obligationCount,
  } =
    await supabaseAdmin
      .from(
        "recurring_cycle_obligations"
      )
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "collection_id",
        id
      );

  const error =
    errorText(
      query?.error
    );

  const activeCycle =
    (
      cycles ??
      []
    ).find(
      (cycle) =>
        cycle.status ===
        "collecting"
    );

  return (
    <ThreepleAppShell
      title="Recurring Dues"
      subtitle={collection.title}
      status={
        <ThreepleBadge tone="primary">
          Schedule engine
        </ThreepleBadge>
      }
    >
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/dashboard/collections/${id}`}
          className="text-sm font-black text-[var(--tp-primary)]"
        >
          Back to Collection
        </Link>

        {error && (
          <ThreepleAlert
            tone="danger"
            className="mt-5"
          >
            {error}
          </ThreepleAlert>
        )}

        {query?.saved ===
          "1" && (
          <ThreepleAlert
            tone="success"
            className="mt-5"
          >
            Recurring settings saved. Review them, then generate the schedule.
          </ThreepleAlert>
        )}

        {query?.generated ===
          "1" && (
          <ThreepleAlert
            tone="success"
            className="mt-5"
          >
            Recurring cycles and member obligations were generated successfully.
          </ThreepleAlert>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <ThreepleStat
            label="Cycles"
            value={
              cycles?.length ??
              0
            }
            helper="Generated schedule cycles."
            tone="primary"
          />

          <ThreepleStat
            label="Member obligations"
            value={
              obligationCount ??
              0
            }
            helper="Per-member cycle obligations."
            tone="success"
          />

          <ThreepleStat
            label="Current cycle"
            value={
              activeCycle
                ? `#${activeCycle.cycle_number}`
                : "â€”"
            }
            helper={
              activeCycle
                ? `Due ${activeCycle.due_on}`
                : "No cycle currently collecting."
            }
            tone="warning"
          />
        </section>

        <section className="tp-card mt-6 p-6 sm:p-8">
          <p className="tp-kicker">
            Schedule setup
          </p>

          <h1 className="tp-heading mt-2 text-2xl">
            Define how recurring dues run.
          </h1>

          <p className="tp-body mt-2 max-w-3xl text-sm">
            Once the schedule is generated, Threeple creates a separate obligation for every active member in every cycle. The schedule is then locked to protect the financial audit trail.
          </p>

          <form
            action={
              saveRecurringSettings
            }
            className="mt-6 grid gap-5 sm:grid-cols-2"
          >
            <input
              type="hidden"
              name="collection_id"
              value={id}
            />

            <div>
              <label
                htmlFor="frequency"
                className="text-sm font-black"
              >
                Frequency
              </label>

              <select
                id="frequency"
                name="frequency"
                defaultValue={
                  setting?.frequency ??
                  "monthly"
                }
                disabled={
                  setting?.schedule_locked ??
                  false
                }
                className="tp-input mt-2 w-full"
              >
                <option value="weekly">
                  Weekly
                </option>
                <option value="monthly">
                  Monthly
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="contribution_amount"
                className="text-sm font-black"
              >
                Contribution per cycle
              </label>

              <input
                id="contribution_amount"
                name="contribution_amount"
                type="number"
                min="0.01"
                step="0.01"
                required
                disabled={
                  setting?.schedule_locked ??
                  false
                }
                defaultValue={
                  setting?.contribution_amount ??
                  collection.default_amount ??
                  ""
                }
                className="tp-input mt-2 w-full"
              />
            </div>

            <div>
              <label
                htmlFor="start_date"
                className="text-sm font-black"
              >
                Start date
              </label>

              <input
                id="start_date"
                name="start_date"
                type="date"
                required
                disabled={
                  setting?.schedule_locked ??
                  false
                }
                defaultValue={
                  setting?.start_date ??
                  ""
                }
                className="tp-input mt-2 w-full"
              />
            </div>

            <div>
              <label
                htmlFor="due_day_of_month"
                className="text-sm font-black"
              >
                Monthly due day
              </label>

              <input
                id="due_day_of_month"
                name="due_day_of_month"
                type="number"
                min="1"
                max="28"
                disabled={
                  setting?.schedule_locked ??
                  false
                }
                defaultValue={
                  setting?.due_day_of_month ??
                  ""
                }
                placeholder="e.g. 25"
                className="tp-input mt-2 w-full"
              />

              <p className="mt-2 text-xs text-[var(--tp-muted)]">
                Used for monthly schedules. Keep between 1 and 28.
              </p>
            </div>

            <div>
              <label
                htmlFor="cycles_to_generate"
                className="text-sm font-black"
              >
                Number of cycles
              </label>

              <input
                id="cycles_to_generate"
                name="cycles_to_generate"
                type="number"
                min="1"
                max="60"
                required
                disabled={
                  setting?.schedule_locked ??
                  false
                }
                defaultValue={
                  setting?.cycles_to_generate ??
                  12
                }
                className="tp-input mt-2 w-full"
              />
            </div>

            <div>
              <label
                htmlFor="grace_days"
                className="text-sm font-black"
              >
                Grace days
              </label>

              <input
                id="grace_days"
                name="grace_days"
                type="number"
                min="0"
                max="30"
                disabled={
                  setting?.schedule_locked ??
                  false
                }
                defaultValue={
                  setting?.grace_days ??
                  0
                }
                className="tp-input mt-2 w-full"
              />
            </div>

            {!setting?.schedule_locked && (
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="tp-btn tp-btn-primary"
                >
                  Save recurring settings
                </button>
              </div>
            )}
          </form>

          {setting &&
            !setting.schedule_locked && (
              <form
                action={
                  generateRecurringSchedule
                }
                className="mt-6 border-t border-[var(--tp-border)] pt-6"
              >
                <input
                  type="hidden"
                  name="collection_id"
                  value={id}
                />

                <button
                  type="submit"
                  className="tp-btn tp-btn-primary"
                >
                  Generate schedule
                </button>

                <p className="mt-3 text-xs leading-5 text-[var(--tp-muted)]">
                  This creates all cycles and active-member obligations, then locks the schedule.
                </p>
              </form>
            )}
        </section>

        {setting?.schedule_locked && (
          <section className="mt-6">
            <p className="tp-kicker">
              Generated schedule
            </p>

            <div className="mt-4 space-y-3">
              {(cycles ?? []).map(
                (cycle) => (
                  <article
                    key={
                      cycle.id
                    }
                    className="tp-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black">
                          Cycle {cycle.cycle_number}
                        </p>

                        <ThreepleBadge
                          tone={
                            cycle.status ===
                            "collecting"
                              ? "success"
                              : cycle.status ===
                                  "closed"
                                ? "neutral"
                                : "primary"
                          }
                        >
                          {cycle.status}
                        </ThreepleBadge>
                      </div>

                      <p className="mt-2 text-sm text-[var(--tp-muted)]">
                        {cycle.starts_on} â†’ {cycle.ends_on}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-xs font-black uppercase tracking-wider text-[var(--tp-muted)]">
                        Due
                      </p>

                      <p className="mt-1 font-black">
                        {cycle.due_on}
                      </p>
                    </div>
                  </article>
                )
              )}
            </div>
          </section>
        )}

        <section className="tp-card mt-6 p-6">
          <p className="text-sm text-[var(--tp-muted)]">
            Base contribution:{" "}
            <strong className="text-[var(--tp-ink)]">
              {money(
                setting?.contribution_amount ??
                  collection.default_amount,
                collection.currency ??
                  "NGN"
              )}
            </strong>
          </p>
        </section>
      </div>
    </ThreepleAppShell>
  );
}

