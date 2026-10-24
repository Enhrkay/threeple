import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

export const instant = false;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

// =========================================================
// HELPERS
// =========================================================

function friendlyText(
  value: string | null | undefined
) {
  if (!value) {
    return "—";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

function formatMoney(
  amount: number | null,
  currency: string
) {
  if (
    amount === null ||
    amount === undefined
  ) {
    return "—";
  }

  try {
    return new Intl.NumberFormat(
      "en-NG",
      {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    ).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function statusStyle(
  status: string
) {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-700";

    case "approval_pending":
      return "bg-amber-100 text-amber-700";

    case "joined":
      return "bg-blue-100 text-blue-700";

    case "declined":
      return "bg-red-100 text-red-700";

    case "cancelled":
      return "bg-neutral-200 text-neutral-600";

    default:
      return "bg-neutral-100 text-neutral-600";
  }
}

// =========================================================
// PAGE
// =========================================================

export default async function ReportsPage({
  params,
}: PageProps) {
  const { id } =
    await params;

  const supabase =
    await createClient();

  // =======================================================
  // AUTH
  // =======================================================

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

  // =======================================================
  // COLLECTION
  // =======================================================

  const {
    data: collection,
    error: collectionError,
  } = await supabase
    .from("collections")
    .select(`
      id,
      organization_id,
      title,
      collection_type,
      collection_mode,
      currency,
      target_amount,
      default_amount,
      requires_approval,
      deadline,
      status
    `)
    .eq(
      "id",
      id
    )
    .maybeSingle();

  if (
    collectionError ||
    !collection
  ) {
    notFound();
  }

  // =======================================================
  // ACCESS
  // =======================================================

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

  let allowed =
    organization.owner_id ===
    userId;

  if (!allowed) {
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

    allowed =
      Boolean(membership);
  }

  if (!allowed) {
    notFound();
  }

  // =======================================================
  // PARTICIPANTS
  // =======================================================

  const {
    data: participantRows,
    error: participantError,
  } = await supabase
    .from("participants")
    .select(`
      id,
      full_name,
      email,
      phone,
      expected_amount,
      payment_status,
      participation_status,
      join_method,
      is_active,
      created_at
    `)
    .eq(
      "collection_id",
      collection.id
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (participantError) {
    throw new Error(
      "Threeple could not load Collection report data."
    );
  }

  const participants =
    participantRows ?? [];

  // =======================================================
  // SUMMARY METRICS
  // =======================================================

  const totalParticipants =
    participants.length;

  const activeParticipants =
    participants.filter(
      (participant) =>
        participant.is_active
    ).length;

  const approvedParticipants =
    participants.filter(
      (participant) =>
        participant.is_active &&
        participant
          .participation_status ===
          "approved"
    ).length;

  const pendingParticipants =
    participants.filter(
      (participant) =>
        participant.is_active &&
        participant
          .participation_status ===
          "approval_pending"
    ).length;

  const joinedParticipants =
    participants.filter(
      (participant) =>
        participant.is_active &&
        participant
          .participation_status ===
          "joined"
    ).length;

  const declinedParticipants =
    participants.filter(
      (participant) =>
        participant
          .participation_status ===
          "declined"
    ).length;

  const inactiveParticipants =
    participants.filter(
      (participant) =>
        !participant.is_active
    ).length;

  // =======================================================
  // EXPECTED CONTRIBUTIONS
  //
  // This is NOT money collected.
  // It is only the configured participant expectation.
  // =======================================================

  const totalExpectedAmount =
    participants.reduce(
      (
        total,
        participant
      ) => {
        if (
          !participant.is_active ||
          participant.expected_amount ===
            null
        ) {
          return total;
        }

        return (
          total +
          Number(
            participant.expected_amount
          )
        );
      },
      0
    );

  const participantsWithExpectedAmount =
    participants.filter(
      (participant) =>
        participant.is_active &&
        participant.expected_amount !==
          null
    ).length;

  // =======================================================
  // JOIN METHOD COUNTS
  // =======================================================

  const joinMethods =
    new Map<
      string,
      number
    >();

  for (
    const participant
    of participants
  ) {
    const method =
      participant.join_method ||
      "unknown";

    joinMethods.set(
      method,
      (
        joinMethods.get(
          method
        ) ?? 0
      ) + 1
    );
  }

  // =======================================================
  // APPROVAL RATE
  // =======================================================

  const approvalRate =
    totalParticipants > 0
      ? Math.round(
          (
            approvedParticipants /
            totalParticipants
          ) * 100
        )
      : 0;

  // =======================================================
  // UI
  // =======================================================

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">

      {/* HEADER */}

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
              Collect. Coordinate.
              Track.
            </p>
          </div>

          <Link
            href={`/dashboard/collections/${collection.id}`}
            className="text-sm font-medium text-neutral-600 hover:text-black"
          >
            ← Collection
          </Link>

        </div>

      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">

        {/* TITLE */}

        <section>

          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Reports
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {collection.title}
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-neutral-600">
            Review participant,
            approval and
            participation data for
            this Collection.
          </p>

        </section>

        {/* COLLECTION INFO */}

        <section className="mt-8 flex flex-wrap gap-2">

          <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium">
            {friendlyText(
              collection.collection_type
            )}
          </span>

          <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium">
            {friendlyText(
              collection.collection_mode
            )}
          </span>

          <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium">
            {friendlyText(
              collection.status
            )}
          </span>

          <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium">
            {collection.requires_approval
              ? "Approval required"
              : "Open joining"}
          </span>

        </section>

        {/* SUMMARY */}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl border bg-white p-5">

            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Total Participants
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {totalParticipants}
            </p>

          </div>

          <div className="rounded-2xl border bg-white p-5">

            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Active
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {activeParticipants}
            </p>

          </div>

          <div className="rounded-2xl border bg-white p-5">

            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Approved
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {approvedParticipants}
            </p>

          </div>

          <div
            className={`rounded-2xl border p-5 ${
              pendingParticipants >
              0
                ? "border-amber-200 bg-amber-50"
                : "bg-white"
            }`}
          >

            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Pending Approval
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {pendingParticipants}
            </p>

          </div>

        </section>

        {/* SECONDARY METRICS */}

        <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl border bg-white p-5">

            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Joined
            </p>

            <p className="mt-3 text-2xl font-semibold">
              {joinedParticipants}
            </p>

          </div>

          <div className="rounded-2xl border bg-white p-5">

            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Declined
            </p>

            <p className="mt-3 text-2xl font-semibold">
              {declinedParticipants}
            </p>

          </div>

          <div className="rounded-2xl border bg-white p-5">

            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Inactive
            </p>

            <p className="mt-3 text-2xl font-semibold">
              {inactiveParticipants}
            </p>

          </div>

          <div className="rounded-2xl border bg-white p-5">

            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Approval Rate
            </p>

            <p className="mt-3 text-2xl font-semibold">
              {approvalRate}%
            </p>

          </div>

        </section>

        {/* EXPECTED CONTRIBUTIONS */}

        <section className="mt-8 rounded-3xl border bg-white p-6 md:p-8">

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div>

              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Participant Expectations
              </p>

              <h2 className="mt-2 text-xl font-semibold">
                Expected contribution
                profile
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">
                This reflects the
                amounts configured
                for participants.
                It does not represent
                verified money
                collected.
              </p>

            </div>

            <div className="md:text-right">

              <p className="text-xs text-neutral-400">
                Configured expected
                total
              </p>

              <p className="mt-2 text-3xl font-semibold">
                {formatMoney(
                  totalExpectedAmount,
                  collection.currency
                )}
              </p>

              <p className="mt-1 text-xs text-neutral-500">
                {
                  participantsWithExpectedAmount
                }{" "}
                participant
                {participantsWithExpectedAmount ===
                1
                  ? ""
                  : "s"}{" "}
                with an amount set
              </p>

            </div>

          </div>

        </section>

        {/* JOIN SOURCES */}

        <section className="mt-8 rounded-3xl border bg-white p-6 md:p-8">

          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Participation Sources
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            How participants joined
          </h2>

          {joinMethods.size >
          0 ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

              {Array.from(
                joinMethods.entries()
              ).map(
                ([
                  method,
                  count,
                ]) => (
                  <div
                    key={
                      method
                    }
                    className="rounded-2xl bg-neutral-50 p-4"
                  >

                    <p className="text-sm font-medium">
                      {friendlyText(
                        method
                      )}
                    </p>

                    <p className="mt-2 text-2xl font-semibold">
                      {count}
                    </p>

                  </div>
                )
              )}

            </div>
          ) : (
            <p className="mt-5 text-sm text-neutral-500">
              No participation
              activity yet.
            </p>
          )}

        </section>

        {/* PARTICIPANT REPORT */}

        <section className="mt-8 overflow-hidden rounded-3xl border bg-white">

          <div className="flex flex-col gap-3 border-b px-6 py-5 md:flex-row md:items-center md:justify-between">

            <div>

              <h2 className="text-lg font-semibold">
                Participant Report
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Current participant
                status and
                expectations.
              </p>

            </div>

            <Link
              href={`/dashboard/collections/${collection.id}/participants`}
              className="text-sm font-semibold hover:underline"
            >
              Manage Participants â†’
            </Link>

          </div>

          {participants.length >
          0 ? (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[950px] text-left text-sm">

                <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-400">

                  <tr>

                    <th className="px-6 py-4 font-medium">
                      Participant
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Status
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Join Method
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Expected
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Payment Status
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Active
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y">

                  {participants.map(
                    (participant) => (
                      <tr
                        key={
                          participant.id
                        }
                      >

                        <td className="px-6 py-5">

                          <p className="font-medium">
                            {
                              participant.full_name
                            }
                          </p>

                          {participant.email && (
                            <p className="mt-1 text-xs text-neutral-500">
                              {
                                participant.email
                              }
                            </p>
                          )}

                          {!participant.email &&
                            participant.phone && (
                              <p className="mt-1 text-xs text-neutral-500">
                                {
                                  participant.phone
                                }
                              </p>
                            )}

                        </td>

                        <td className="px-6 py-5">

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle(
                              participant.participation_status
                            )}`}
                          >
                            {friendlyText(
                              participant.participation_status
                            )}
                          </span>

                        </td>

                        <td className="px-6 py-5 text-neutral-600">
                          {friendlyText(
                            participant.join_method
                          )}
                        </td>

                        <td className="px-6 py-5 font-medium">
                          {formatMoney(
                            participant.expected_amount !==
                              null
                              ? Number(
                                  participant.expected_amount
                                )
                              : null,
                            collection.currency
                          )}
                        </td>

                        <td className="px-6 py-5 text-neutral-600">
                          {friendlyText(
                            participant.payment_status
                          )}
                        </td>

                        <td className="px-6 py-5">

                          {participant.is_active ? (
                            <span className="font-medium text-green-700">
                              Yes
                            </span>
                          ) : (
                            <span className="text-neutral-500">
                              No
                            </span>
                          )}

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          ) : (
            <div className="px-6 py-12 text-center">

              <h3 className="font-semibold">
                No participant data
              </h3>

              <p className="mt-2 text-sm text-neutral-500">
                Participant report
                data will appear
                after people join
                this Collection.
              </p>

            </div>
          )}

        </section>

        {/* REPORT LIMITATION */}

        <section className="mt-8 rounded-2xl bg-neutral-100 p-5">

          <p className="text-sm font-medium">
            Payment reporting is
            intentionally excluded
            for now.
          </p>

          <p className="mt-2 text-sm leading-6 text-neutral-500">
            This report currently
            covers participation,
            approvals and configured
            contribution
            expectations. Verified
            payment analytics will
            be added when the
            Threeple payment layer
            resumes.
          </p>

        </section>

      </div>

    </main>
  );
}
