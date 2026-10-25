import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  seedRotationMembers,
  saveRotationOrder,
  generateRotationSchedule,
} from "./actions";

export const instant = false;

type PageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams?: Promise<{
    result?: string;
  }>;
};

function formatMoney(
  amount:
    | number
    | string
    | null
    | undefined,
  currency: string
) {
  if (
    amount === null ||
    amount === undefined
  ) {
    return "—";
  }

  const numeric =
    Number(amount);

  if (!Number.isFinite(numeric)) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-NG",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }
  ).format(numeric);
}

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
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
}

function formatDate(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-NG",
    {
      dateStyle: "medium",
    }
  );
}

function resultMessage(
  result?: string
) {
  switch (result) {
    case "members_seeded":
      return {
        type: "success",
        text:
          "Members are ready. Review the recipient order before generating the schedule.",
      };

    case "order_saved":
      return {
        type: "success",
        text:
          "Recipient order saved.",
      };

    case "schedule_generated":
      return {
        type: "success",
        text:
          "Rotation schedule generated. Your Ajo is ready to run.",
      };

    case "order_invalid":
      return {
        type: "error",
        text:
          "Each member must have one unique recipient position.",
      };

    case "order_locked":
      return {
        type: "error",
        text:
          "Recipient order is locked because the rotation schedule already exists.",
      };

    case "order_failed":
      return {
        type: "error",
        text:
          "Threeple could not save the recipient order.",
      };

    case "seed_failed":
      return {
        type: "error",
        text:
          "Threeple could not prepare the members. Make sure at least two active participants have joined.",
      };

    case "schedule_failed":
      return {
        type: "error",
        text:
          "Threeple could not generate the schedule. Check the member order and rotation settings.",
      };

    case "collection_archived":
      return {
        type: "error",
        text:
          "Restore this Collection before changing its rotation.",
      };

    default:
      return null;
  }
}

export default async function RotationPage({
  params,
  searchParams,
}: PageProps) {
  const { id } =
    await params;

  const query =
    await searchParams;

  const supabase =
    await createClient();

  const {
    data: claimsData,
    error: claimsError,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (
    claimsError ||
    !userId
  ) {
    redirect(
      `/auth/login?next=${encodeURIComponent(
        `/dashboard/collections/${id}/rotation`
      )}`
    );
  }

  const {
    data: collection,
  } = await supabase
    .from("collections")
    .select(`
      id,
      organization_id,
      title,
      currency,
      collection_mode,
      status,
      archived_at
    `)
    .eq("id", id)
    .maybeSingle();

  if (
    !collection ||
    collection.collection_mode !==
      "rotating_pool"
  ) {
    notFound();
  }

  const {
    data: organization,
  } = await supabase
    .from("organizations")
    .select(`
      id,
      owner_id
    `)
    .eq(
      "id",
      collection.organization_id
    )
    .maybeSingle();

  if (!organization) {
    notFound();
  }

  let canManage =
    organization.owner_id ===
    userId;

  if (!canManage) {
    const {
      data: membership,
    } = await supabase
      .from(
        "organization_members"
      )
      .select("role")
      .eq(
        "organization_id",
        organization.id
      )
      .eq(
        "user_id",
        userId
      )
      .in(
        "role",
        [
          "admin",
          "treasurer",
        ]
      )
      .maybeSingle();

    canManage =
      Boolean(membership);
  }

  if (!canManage) {
    notFound();
  }

  const {
    data: settings,
  } = await supabase
    .from("rotation_settings")
    .select(`
      contribution_amount,
      frequency,
      start_date,
      coordinator_fee_mode,
      coordinator_fee_value,
      status
    `)
    .eq(
      "collection_id",
      collection.id
    )
    .maybeSingle();

  const {
    data: members,
  } = await supabase
    .from("rotation_members")
    .select(`
      id,
      participant_id,
      recipient_position,
      is_active,
      participants (
        full_name,
        payment_status,
        participation_status
      )
    `)
    .eq(
      "collection_id",
      collection.id
    )
    .eq(
      "is_active",
      true
    )
    .order(
      "recipient_position",
      {
        ascending: true,
      }
    );

  const {
    data: cycles,
  } = await supabase
    .from(
      "rotation_cycle_summary"
    )
    .select(`
      cycle_id,
      collection_id,
      cycle_number,
      recipient_participant_id,
      recipient_name,
      scheduled_date,
      status,
      contribution_amount,
      expected_member_count,
      expected_gross_amount,
      obligation_count,
      paid_member_count,
      outstanding_member_count,
      collected_amount,
      outstanding_amount,
      coordinator_fee_amount,
      threeple_platform_fee_amount,
      processor_fee_amount,
      expected_recipient_net
    `)
    .eq(
      "collection_id",
      collection.id
    )
    .order(
      "cycle_number",
      {
        ascending: true,
      }
    );

  const {
    count:
      activeParticipantCount,
  } = await supabase
    .from("participants")
    .select(
      "id",
      {
        count: "exact",
        head: true,
      }
    )
    .eq(
      "collection_id",
      collection.id
    )
    .eq(
      "is_active",
      true
    );

  const message =
    resultMessage(
      query?.result
    );

  const cycleList =
    cycles ?? [];

  const memberList =
    members ?? [];

  const scheduleExists =
    cycleList.length > 0;

  const memberOrderReady =
    memberList.length >= 2;

  const currentCycle =
    cycleList.find(
      (cycle) =>
        cycle.status === "open"
    ) ??
    cycleList.find(
      (cycle) =>
        cycle.status ===
          "scheduled"
    ) ??
    cycleList.find(
      (cycle) =>
        cycle.status !==
          "settled" &&
        cycle.status !==
          "completed"
    ) ??
    null;

  const currentCycleIndex =
    currentCycle
      ? cycleList.findIndex(
          (cycle) =>
            cycle.cycle_id ===
            currentCycle.cycle_id
        )
      : -1;

  const nextCycle =
    currentCycleIndex >= 0
      ? cycleList[
          currentCycleIndex + 1
        ] ?? null
      : null;

  const completedCycles =
    cycleList.filter(
      (cycle) =>
        cycle.status ===
          "settled" ||
        cycle.status ===
          "completed"
    ).length;

  const expectedPot =
    currentCycle
      ? Number(
          currentCycle.expected_gross_amount ??
            0
        )
      : 0;

  const collected =
    currentCycle
      ? Number(
          currentCycle.collected_amount ??
            0
        )
      : 0;

  const progress =
    expectedPot > 0
      ? Math.min(
          100,
          Math.round(
            (collected /
              expectedPot) *
              100
          )
        )
      : 0;

  const outstandingMembers =
    currentCycle
      ? Number(
          currentCycle.outstanding_member_count ??
            0
        )
      : 0;

  const paidMembers =
    currentCycle
      ? Number(
          currentCycle.paid_member_count ??
            0
        )
      : 0;

  const expectedMembers =
    currentCycle
      ? Number(
          currentCycle.expected_member_count ??
            0
        )
      : 0;

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#171717]">
      <header className="border-b border-[var(--tp-border)] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <Link
              href="/dashboard"
              className="text-2xl font-black tracking-tight"
            >
              Threeple
            </Link>

            <p className="mt-1 text-sm text-black/40">
              Ajo Control Centre
            </p>
          </div>

          <Link
            href={`/dashboard/collections/${collection.id}`}
            className="rounded-full border border-[var(--tp-border)] px-4 py-2 text-sm font-semibold transition hover:bg-[var(--tp-primary)]/5"
          >
            Back to collection
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 sm:pb-10 sm:pt-8 lg:px-8 lg:py-10">
        {message && (
          <div
            className={`mb-6 rounded-[1.5rem] border border-[var(--tp-border)] p-4 text-sm font-medium ${
              message.type ===
              "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/35">
              Rotational contribution
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] md:text-5xl">
              {collection.title}
            </h1>

            <p className="mt-4 max-w-2xl leading-7 text-black/50">
              See the current round, who receives next, member contribution status and the full recipient order in one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[var(--tp-primary)] px-4 py-2 text-sm font-bold text-white">
              {friendlyText(
                settings?.status ??
                  collection.status
              )}
            </span>

            <span className="rounded-full border border-[var(--tp-border)] bg-white px-4 py-2 text-sm font-semibold">
              {friendlyText(
                settings?.frequency
              )}
            </span>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[1.75rem] border border-[var(--tp-border)] bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/35">
              Contribution / cycle
            </p>

            <p className="mt-3 text-2xl font-black">
              {formatMoney(
                settings?.contribution_amount,
                collection.currency
              )}
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-[var(--tp-border)] bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/35">
              Members
            </p>

            <p className="mt-3 text-3xl font-black">
              {activeParticipantCount ??
                0}
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-[var(--tp-border)] bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/35">
              Cycles completed
            </p>

            <p className="mt-3 text-3xl font-black">
              {completedCycles}
              <span className="text-base font-semibold text-black/30">
                {" "}
                / {cycleList.length || "—"}
              </span>
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-[var(--tp-border)] bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/35">
              First cycle
            </p>

            <p className="mt-3 text-lg font-black">
              {formatDate(
                settings?.start_date
              )}
            </p>
          </div>
        </section>

        {currentCycle ? (
          <section className="mt-8 overflow-hidden rounded-[2rem] bg-[#171717] text-white">
            <div className="p-6 md:p-8 lg:p-10">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-[var(--tp-surface-soft)] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--tp-ink-soft)]">
                      Current round
                    </span>

                    <span className="text-sm font-semibold text-[var(--tp-faint)]">
                      Cycle{" "}
                      {currentCycle.cycle_number}
                      {" "}
                      of{" "}
                      {cycleList.length}
                    </span>
                  </div>

                  <p className="mt-6 text-sm font-semibold text-[var(--tp-faint)]">
                    Receiving this round
                  </p>

                  <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
                    {currentCycle.recipient_name ??
                      "Recipient"}
                  </h2>

                  <p className="mt-3 text-[var(--tp-muted)]">
                    Scheduled for{" "}
                    {formatDate(
                      currentCycle.scheduled_date
                    )}
                  </p>

                  {nextCycle && (
                    <p className="mt-5 text-sm text-[var(--tp-faint)]">
                      Next:{" "}
                      <span className="font-bold text-white">
                        {nextCycle.recipient_name}
                      </span>
                      {" "}on{" "}
                      {formatDate(
                        nextCycle.scheduled_date
                      )}
                    </p>
                  )}
                </div>

                <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:w-[420px]">
                  <div className="rounded-2xl bg-[var(--tp-surface-soft)] p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--tp-faint)]">
                      Expected pot
                    </p>

                    <p className="mt-2 text-xl font-black">
                      {formatMoney(
                        currentCycle.expected_gross_amount,
                        collection.currency
                      )}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[var(--tp-surface-soft)] p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--tp-faint)]">
                      Collected
                    </p>

                    <p className="mt-2 text-xl font-black">
                      {formatMoney(
                        currentCycle.collected_amount,
                        collection.currency
                      )}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[var(--tp-surface-soft)] p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--tp-faint)]">
                      Paid members
                    </p>

                    <p className="mt-2 text-xl font-black">
                      {paidMembers}
                      <span className="text-sm font-semibold text-white/35">
                        {" "}
                        / {expectedMembers}
                      </span>
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[var(--tp-surface-soft)] p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--tp-faint)]">
                      Outstanding
                    </p>

                    <p className="mt-2 text-xl font-black">
                      {outstandingMembers}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-9">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-[var(--tp-faint)]">
                    Round progress
                  </span>

                  <span className="font-black">
                    {progress}%
                  </span>
                </div>

                <div className="mt-3 h-3 overflow-hidden rounded-full bg-[var(--tp-surface-soft)]">
                  <div
                    className="h-full rounded-full bg-white transition-all"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>

                <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-[var(--tp-faint)]">
                  <span>
                    {formatMoney(
                      currentCycle.collected_amount,
                      collection.currency
                    )}{" "}
                    collected
                  </span>

                  <span>
                    {formatMoney(
                      currentCycle.outstanding_amount,
                      collection.currency
                    )}{" "}
                    outstanding
                  </span>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="mt-8 rounded-[2rem] border border-[var(--tp-border)] border-dashed border-black/15 bg-white p-8 md:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/35">
              No active round yet
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Build the recipient order, then generate the Ajo schedule.
            </h2>

            <p className="mt-3 max-w-2xl leading-7 text-black/50">
              Threeple will create one cycle per member using the saved recipient order.
            </p>
          </section>
        )}

        <section className="mt-8 grid gap-8 xl:grid-cols-[1.05fr_.95fr]">
          <div className="rounded-[2rem] border border-[var(--tp-border)] bg-white p-6 md:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/35">
                  Ajo order
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Who receives when
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-6 text-black/50">
                  Set the order before the schedule begins. Once cycles exist, the order is locked for transparency.
                </p>
              </div>

              {!scheduleExists && (
                <form
                  action={
                    seedRotationMembers
                  }
                >
                  <input
                    type="hidden"
                    name="collection_id"
                    value={
                      collection.id
                    }
                  />

                  <button
                    type="submit"
                    className="h-11 rounded-full border border-[var(--tp-border)] bg-white px-5 text-sm font-bold transition hover:bg-[var(--tp-primary)]/5"
                  >
                    {memberOrderReady
                      ? "Refresh members"
                      : "Prepare members"}
                  </button>
                </form>
              )}
            </div>

            {memberList.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-[#f7f7f5] p-6 text-sm text-black/45">
                No members have been prepared yet.
              </div>
            ) : (
              <form
                action={
                  saveRotationOrder
                }
                className="mt-6"
              >
                <input
                  type="hidden"
                  name="collection_id"
                  value={
                    collection.id
                  }
                />

                <div className="space-y-3">
                  {memberList.map(
                    (
                      member,
                      index
                    ) => {
                      const participant =
                        Array.isArray(
                          member.participants
                        )
                          ? member
                              .participants[0]
                          : member.participants;

                      const memberCycle =
                        cycleList.find(
                          (cycle) =>
                            cycle.recipient_participant_id ===
                            member.participant_id
                        );

                      const isCurrent =
                        currentCycle?.recipient_participant_id ===
                        member.participant_id;

                      const hasReceived =
                        memberCycle?.status ===
                          "settled" ||
                        memberCycle?.status ===
                          "completed";

                      return (
                        <div
                          key={
                            member.id
                          }
                          className={`grid gap-4 rounded-[1.5rem] border border-[var(--tp-border)] p-4 sm:grid-cols-[52px_1fr_120px] sm:items-center ${
                            isCurrent
                              ? "border-black bg-[var(--tp-primary)] text-white"
                              : "border-[var(--tp-border)] bg-white"
                          }`}
                        >
                          <div
                            className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-black ${
                              isCurrent
                                ? "bg-white text-black"
                                : "bg-[#f7f7f5] text-black"
                            }`}
                          >
                            {index + 1}
                          </div>

                          <div>
                            <input
                              type="hidden"
                              name="participant_id"
                              value={
                                member.participant_id
                              }
                            />

                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold">
                                {participant?.full_name ??
                                  "Participant"}
                              </p>

                              {isCurrent && (
                                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white/80">
                                  Current
                                </span>
                              )}

                              {hasReceived && (
                                <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-green-700">
                                  Received
                                </span>
                              )}
                            </div>

                            <p
                              className={`mt-1 text-xs ${
                                isCurrent
                                  ? "text-[var(--tp-faint)]"
                                  : "text-black/40"
                              }`}
                            >
                              {memberCycle
                                ? `${formatDate(
                                    memberCycle.scheduled_date
                                  )} · ${friendlyText(
                                    memberCycle.status
                                  )}`
                                : `Recipient position ${member.recipient_position}`}
                            </p>
                          </div>

                          <select
                            name={`position_${member.participant_id}`}
                            defaultValue={
                              member.recipient_position
                            }
                            disabled={
                              scheduleExists
                            }
                            className={`rounded-xl border px-3 py-2 text-sm font-semibold outline-none ${
                              isCurrent
                                ? "border-white/20 bg-[var(--tp-surface-soft)] text-white"
                                : "border-[var(--tp-border)] bg-white text-black"
                            } disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            {memberList.map(
                              (
                                _,
                                optionIndex
                              ) => (
                                <option
                                  key={
                                    optionIndex +
                                    1
                                  }
                                  value={
                                    optionIndex +
                                    1
                                  }
                                  className="text-black"
                                >
                                  Position{" "}
                                  {optionIndex +
                                    1}
                                </option>
                              )
                            )}
                          </select>
                        </div>
                      );
                    }
                  )}
                </div>

                {!scheduleExists ? (
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      className="h-11 rounded-full border border-[var(--tp-border)] bg-white px-5 text-sm font-bold transition hover:bg-[var(--tp-primary)]/5"
                    >
                      Save recipient order
                    </button>

                    <span className="text-xs text-black/35">
                      Every position must be unique.
                    </span>
                  </div>
                ) : (
                  <p className="mt-5 text-xs leading-5 text-black/40">
                    Recipient order is locked because the rotation schedule has already been generated.
                  </p>
                )}
              </form>
            )}

            {!scheduleExists &&
              memberOrderReady && (
                <form
                  action={
                    generateRotationSchedule
                  }
                  className="mt-6 border-t border-[var(--tp-border)] pt-6"
                >
                  <input
                    type="hidden"
                    name="collection_id"
                    value={
                      collection.id
                    }
                  />

                  <button
                    type="submit"
                    className="h-12 w-full rounded-full bg-[var(--tp-primary)] px-6 text-sm font-bold text-white transition hover:opacity-85"
                  >
                    Generate Ajo schedule
                  </button>
                </form>
              )}
          </div>

          <div className="space-y-8">
            <section className="rounded-[2rem] border border-[var(--tp-border)] bg-white p-6 md:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/35">
                This round at a glance
              </p>

              <h2 className="mt-2 text-2xl font-black">
                What the recipient expects
              </h2>

              {currentCycle ? (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between gap-4 border-b border-[var(--tp-border)] pb-4">
                    <span className="text-sm text-black/45">
                      Gross pot
                    </span>

                    <span className="font-black">
                      {formatMoney(
                        currentCycle.expected_gross_amount,
                        collection.currency
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 border-b border-[var(--tp-border)] pb-4">
                    <span className="text-sm text-black/45">
                      Coordinator fee
                    </span>

                    <span className="font-black">
                      {formatMoney(
                        currentCycle.coordinator_fee_amount,
                        collection.currency
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 border-b border-[var(--tp-border)] pb-4">
                    <span className="text-sm text-black/45">
                      Threeple fee
                    </span>

                    <span className="font-black">
                      {formatMoney(
                        currentCycle.threeple_platform_fee_amount,
                        collection.currency
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 border-b border-[var(--tp-border)] pb-4">
                    <span className="text-sm text-black/45">
                      Processor fee
                    </span>

                    <span className="font-black">
                      {formatMoney(
                        currentCycle.processor_fee_amount,
                        collection.currency
                      )}
                    </span>
                  </div>

                  <div className="rounded-2xl bg-[#f7f7f5] p-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-black/35">
                      Expected recipient net
                    </p>

                    <p className="mt-2 text-2xl font-black">
                      {formatMoney(
                        currentCycle.expected_recipient_net,
                        collection.currency
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-5 text-sm leading-6 text-black/45">
                  This round at a glance will appear after the schedule is generated.
                </p>
              )}
            </section>

            <section className="rounded-[2rem] border border-[var(--tp-border)] bg-white p-6 md:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/35">
                Ajo setup
              </p>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-black/45">
                    Frequency
                  </span>

                  <span className="font-bold">
                    {friendlyText(
                      settings?.frequency
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-black/45">
                    Contribution
                  </span>

                  <span className="font-bold">
                    {formatMoney(
                      settings?.contribution_amount,
                      collection.currency
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-black/45">
                    Coordinator fee
                  </span>

                  <span className="font-bold">
                    {settings?.coordinator_fee_mode ===
                    "none"
                      ? "None"
                      : `${friendlyText(
                          settings?.coordinator_fee_mode
                        )}: ${
                          settings?.coordinator_fee_value ??
                          "—"
                        }`}
                  </span>
                </div>
              </div>
            </section>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-[var(--tp-border)] bg-white p-6 md:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/35">
                Ajo history
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Every round, in order
              </h2>
            </div>

            <p className="text-sm text-black/40">
              {cycleList.length}
              {" "}
              total cycle
              {cycleList.length === 1
                ? ""
                : "s"}
            </p>
          </div>

          {cycleList.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-[#f7f7f5] p-6 text-sm text-black/45">
              No cycles yet. Prepare members and generate the schedule.
            </div>
          ) : (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {cycleList.map(
                (cycle) => {
                  const isCurrent =
                    currentCycle?.cycle_id ===
                    cycle.cycle_id;

                  const expected =
                    Number(
                      cycle.expected_gross_amount ??
                        0
                    );

                  const cycleCollected =
                    Number(
                      cycle.collected_amount ??
                        0
                    );

                  const cycleProgress =
                    expected > 0
                      ? Math.min(
                          100,
                          Math.round(
                            (cycleCollected /
                              expected) *
                              100
                          )
                        )
                      : 0;

                  return (
                    <article
                      key={
                        cycle.cycle_id
                      }
                      className={`rounded-[1.5rem] border border-[var(--tp-border)] p-5 ${
                        isCurrent
                          ? "border-black bg-[#f7f7f5]"
                          : "border-[var(--tp-border)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-black/35">
                            Cycle{" "}
                            {cycle.cycle_number}
                          </p>

                          <h3 className="mt-1 text-lg font-black">
                            {cycle.recipient_name ??
                              "Recipient"}
                          </h3>

                          <p className="mt-1 text-sm text-black/40">
                            {formatDate(
                              cycle.scheduled_date
                            )}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            isCurrent
                              ? "bg-[var(--tp-primary)] text-white"
                              : cycle.status ===
                                    "settled" ||
                                  cycle.status ===
                                    "completed"
                                ? "bg-[var(--tp-success-soft)] text-[var(--tp-success)]"
                                : "bg-[var(--tp-primary)]/5 text-black/55"
                          }`}
                        >
                          {isCurrent
                            ? "Current"
                            : friendlyText(
                                cycle.status
                              )}
                        </span>
                      </div>

                      <div className="mt-5 flex items-center justify-between text-sm">
                        <span className="text-black/40">
                          {cycle.paid_member_count}
                          {" "}
                          /{" "}
                          {cycle.expected_member_count}
                          {" "}
                          contributed
                        </span>

                        <span className="font-bold">
                          {cycleProgress}%
                        </span>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--tp-primary)]/5">
                        <div
                          className="h-full rounded-full bg-[var(--tp-primary)]"
                          style={{
                            width: `${cycleProgress}%`,
                          }}
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-[#f7f7f5] p-3">
                          <p className="text-xs text-black/35">
                            Collected
                          </p>

                          <p className="mt-1 text-sm font-black">
                            {formatMoney(
                              cycle.collected_amount,
                              collection.currency
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl bg-[#f7f7f5] p-3">
                          <p className="text-xs text-black/35">
                            Recipient net
                          </p>

                          <p className="mt-1 text-sm font-black">
                            {formatMoney(
                              cycle.expected_recipient_net,
                              collection.currency
                            )}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

