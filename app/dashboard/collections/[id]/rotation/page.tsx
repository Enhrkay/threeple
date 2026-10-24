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
    return "â€”";
  }

  const numeric =
    Number(amount);

  if (
    !Number.isFinite(
      numeric
    )
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
  ).format(numeric);
}

function friendlyText(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "â€”";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
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
          "Rotation members were prepared successfully.",
      };

    case "order_saved":
      return {
        type: "success",
        text:
          "Recipient order saved successfully.",
      };

    case "order_invalid":
      return {
        type: "error",
        text:
          "Each rotation member must have one unique recipient position.",
      };

    case "order_locked":
      return {
        type: "error",
        text:
          "Recipient order is locked because rotation cycles already exist.",
      };

    case "order_failed":
      return {
        type: "error",
        text:
          "Threeple could not save the recipient order.",
      };
    case "schedule_generated":
      return {
        type: "success",
        text:
          "Rotation schedule generated successfully.",
      };

    case "seed_failed":
      return {
        type: "error",
        text:
          "Threeple could not prepare the rotation members. Make sure at least two active participants have joined and no cycles already exist.",
      };

    case "schedule_failed":
      return {
        type: "error",
        text:
          "Threeple could not generate the rotation schedule. Check the rotation settings and member order.",
      };

    case "collection_archived":
      return {
        type: "error",
        text:
          "Restore the Collection before changing rotation settings.",
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
    redirect("/auth/login");
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
      .from("organization_members")
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
    count: activeParticipantCount,
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

  const scheduleExists =
    (cycles?.length ?? 0) > 0;

  const memberOrderReady =
    (members?.length ?? 0) >= 2;

  const currentCycle =
    cycles?.find(
      (cycle) =>
        cycle.status ===
          "open"
    ) ??
    cycles?.find(
      (cycle) =>
        cycle.status ===
          "scheduled"
    ) ??
    null;

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <Link
              href="/dashboard"
              className="text-2xl font-bold tracking-tight"
            >
              Threeple
            </Link>

            <p className="text-sm text-neutral-500">
              Rotation workspace
            </p>
          </div>

          <Link
            href={`/dashboard/collections/${collection.id}`}
            className="text-sm font-medium text-neutral-600 hover:text-black"
          >
            â† Collection
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {message && (
          <div
            className={`mb-6 rounded-2xl border p-4 text-sm ${
              message.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <section>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Rotational contribution
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {collection.title}
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">
            Manage member order, recipient sequence, cycle obligations and settlement economics. Threeple tracks the rotation; Paystack handles actual payment settlement.
          </p>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border bg-white p-5">
            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Contribution / cycle
            </p>

            <p className="mt-3 text-2xl font-semibold">
              {formatMoney(
                settings?.contribution_amount,
                collection.currency
              )}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Frequency
            </p>

            <p className="mt-3 text-2xl font-semibold">
              {friendlyText(
                settings?.frequency
              )}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Active members
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {activeParticipantCount ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Cycles
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {cycles?.length ?? 0}
            </p>
          </div>
        </section>

        {currentCycle && (
          <section className="mt-8 rounded-3xl border border-green-200 bg-green-50 p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
              Current / next cycle
            </p>

            <div className="mt-3 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
              <div>
                <h2 className="text-2xl font-semibold text-green-950">
                  Cycle {currentCycle.cycle_number}:{" "}
                  {currentCycle.recipient_name}
                </h2>

                <p className="mt-2 text-sm text-green-800">
                  Scheduled for{" "}
                  {new Date(
                    currentCycle.scheduled_date
                  ).toLocaleDateString(
                    "en-NG",
                    {
                      dateStyle: "medium",
                    }
                  )}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs text-neutral-400">
                    Collected
                  </p>

                  <p className="mt-1 font-semibold">
                    {formatMoney(
                      currentCycle.collected_amount,
                      collection.currency
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs text-neutral-400">
                    Outstanding
                  </p>

                  <p className="mt-1 font-semibold">
                    {formatMoney(
                      currentCycle.outstanding_amount,
                      collection.currency
                    )}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="mt-8 rounded-3xl border bg-white p-6 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Recipient order
              </p>

              <h2 className="mt-2 text-xl font-semibold">
                Rotation members
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                Seed the current active participants into recipient order. Schedule generation is available once at least two members are ready.
              </p>
            </div>

            {!scheduleExists && (
              <form
                action={seedRotationMembers}
              >
                <input
                  type="hidden"
                  name="collection_id"
                  value={collection.id}
                />

                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-neutral-300 bg-white px-5 text-sm font-semibold hover:bg-neutral-50"
                >
                  {memberOrderReady
                    ? "Refresh member order"
                    : "Prepare member order"}
                </button>
              </form>
            )}
          </div>

          {(members?.length ?? 0) === 0 ? (
            <div className="mt-6 overflow-hidden rounded-2xl border p-6 text-sm text-neutral-500">
              No rotation members have been prepared yet.
            </div>
          ) : (
            <form
              action={saveRotationOrder}
              className="mt-6"
            >
              <input
                type="hidden"
                name="collection_id"
                value={collection.id}
              />

              <div className="overflow-hidden rounded-2xl border">
                <div className="grid grid-cols-[1fr_130px] gap-4 border-b bg-neutral-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  <span>
                    Member
                  </span>

                  <span>
                    Recipient position
                  </span>
                </div>

                <div className="divide-y">
                  {members?.map(
                    (member) => {
                      const participant =
                        Array.isArray(
                          member.participants
                        )
                          ? member.participants[0]
                          : member.participants;

                      return (
                        <div
                          key={member.id}
                          className="grid grid-cols-[1fr_130px] items-center gap-4 px-4 py-4"
                        >
                          <div>
                            <input
                              type="hidden"
                              name="participant_id"
                              value={
                                member.participant_id
                              }
                            />

                            <p className="font-medium">
                              {participant?.full_name ??
                                "Participant"}
                            </p>

                            <p className="mt-1 text-xs text-neutral-400">
                              Current position #
                              {member.recipient_position}
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
                            className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black disabled:bg-neutral-100"
                          >
                            {members?.map(
                              (_, index) => (
                                <option
                                  key={
                                    index + 1
                                  }
                                  value={
                                    index + 1
                                  }
                                >
                                  {index + 1}
                                </option>
                              )
                            )}
                          </select>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {!scheduleExists && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-neutral-300 bg-white px-5 text-sm font-semibold hover:bg-neutral-50"
                  >
                    Save recipient order
                  </button>

                  <p className="text-xs leading-5 text-neutral-400">
                    Every position must be unique before saving.
                  </p>
                </div>
              )}

              {scheduleExists && (
                <p className="mt-4 text-xs leading-5 text-neutral-400">
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
                className="mt-6"
              >
                <input
                  type="hidden"
                  name="collection_id"
                  value={collection.id}
                />

                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-semibold text-white hover:bg-neutral-800"
                >
                  Generate rotation schedule
                </button>
              </form>
            )}
        </section>

        <section className="mt-8 rounded-3xl border bg-white p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Schedule
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            Rotation cycles
          </h2>

          {(cycles?.length ?? 0) === 0 ? (
            <div className="mt-6 rounded-2xl bg-neutral-50 p-5 text-sm text-neutral-500">
              No cycles generated yet.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {cycles?.map(
                (cycle) => (
                  <div
                    key={cycle.cycle_id}
                    className="rounded-2xl border p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                          Cycle {cycle.cycle_number}
                        </p>

                        <h3 className="mt-1 text-lg font-semibold">
                          {cycle.recipient_name}
                        </h3>

                        <p className="mt-1 text-sm text-neutral-500">
                          {new Date(
                            cycle.scheduled_date
                          ).toLocaleDateString(
                            "en-NG",
                            {
                              dateStyle: "medium",
                            }
                          )}
                        </p>
                      </div>

                      <span className="w-fit rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
                        {friendlyText(
                          cycle.status
                        )}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl bg-neutral-50 p-4">
                        <p className="text-xs text-neutral-400">
                          Expected pot
                        </p>

                        <p className="mt-1 font-semibold">
                          {formatMoney(
                            cycle.expected_gross_amount,
                            collection.currency
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-neutral-50 p-4">
                        <p className="text-xs text-neutral-400">
                          Paid / members
                        </p>

                        <p className="mt-1 font-semibold">
                          {cycle.paid_member_count} /{" "}
                          {cycle.expected_member_count}
                        </p>
                      </div>

                      <div className="rounded-xl bg-neutral-50 p-4">
                        <p className="text-xs text-neutral-400">
                          Coordinator fee
                        </p>

                        <p className="mt-1 font-semibold">
                          {formatMoney(
                            cycle.coordinator_fee_amount,
                            collection.currency
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-neutral-50 p-4">
                        <p className="text-xs text-neutral-400">
                          Expected recipient net
                        </p>

                        <p className="mt-1 font-semibold">
                          {formatMoney(
                            cycle.expected_recipient_net,
                            collection.currency
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

