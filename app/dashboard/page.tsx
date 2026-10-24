import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const instant = false;

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

function statusStyle(
  status: string
) {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-700";

    case "draft":
      return "bg-amber-100 text-amber-700";

    case "closed":
      return "bg-neutral-200 text-neutral-700";

    case "cancelled":
      return "bg-red-100 text-red-700";

    default:
      return "bg-neutral-100 text-neutral-600";
  }
}

function eventBadgeStyle(
  eventType: string
) {
  if (
    eventType.includes("approved") ||
    eventType.includes("reactivated") ||
    eventType.includes("activated")
  ) {
    return "bg-green-100 text-green-700";
  }

  if (
    eventType.includes("declined") ||
    eventType.includes("deactivated") ||
    eventType.includes("cancelled")
  ) {
    return "bg-red-100 text-red-700";
  }

  if (
    eventType.includes("joined")
  ) {
    return "bg-blue-100 text-blue-700";
  }

  if (
    eventType.includes("updated")
  ) {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-neutral-100 text-neutral-600";
}

function friendlyEventName(
  eventType: string
) {
  switch (eventType) {
    case "participant.joined":
      return "Participant joined";

    case "participant.approved":
      return "Participant approved";

    case "participant.declined":
      return "Participant declined";

    case "participant.deactivated":
      return "Participant deactivated";

    case "participant.reactivated":
      return "Participant reactivated";

    case "collection.created":
      return "Collection created";

    case "collection.updated":
      return "Collection updated";

    case "collection.activated":
      return "Collection activated";

    case "collection.closed":
      return "Collection closed";

    case "collection.reopened":
      return "Collection reopened";

    default:
      return friendlyText(
        eventType.replaceAll(".", " ")
      );
  }
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "en-NG",
    {
      dateStyle: "medium",
      timeZone: "Africa/Lagos",
    }
  ).format(
    new Date(value)
  );
}

function formatDateTime(
  value: string
) {
  return new Intl.DateTimeFormat(
    "en-NG",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Lagos",
    }
  ).format(
    new Date(value)
  );
}

// =========================================================
// DASHBOARD
// =========================================================

export default async function DashboardPage() {
  const supabase =
    await createClient();

  // =======================================================
  // 1. AUTHENTICATED USER
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
  // 2. PROFILE
  // =======================================================

  const {
    data: profile,
  } = await supabase
    .from("profiles")
    .select(`
      full_name
    `)
    .eq(
      "id",
      userId
    )
    .maybeSingle();

  const displayName =
    profile?.full_name?.trim() ||
    "there";

  // =======================================================
  // 3. PERSONAL WORKSPACE
  // =======================================================

  const {
    data: workspace,
    error: workspaceError,
  } = await supabase
    .from("organizations")
    .select(`
      id,
      name,
      organization_type,
      created_at
    `)
    .eq(
      "owner_id",
      userId
    )
    .eq(
      "organization_type",
      "personal"
    )
    .maybeSingle();

  if (
    workspaceError ||
    !workspace
  ) {
    return (
      <main className="min-h-screen bg-neutral-50 text-neutral-900">

        <div className="mx-auto max-w-5xl px-6 py-12">

          <div className="rounded-3xl border bg-white p-8">

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-xl">
              !
            </div>

            <h1 className="mt-5 text-2xl font-semibold">
              Workspace unavailable
            </h1>

            <p className="mt-3 max-w-lg leading-7 text-neutral-600">
              Threeple could not
              load your personal
              workspace.
            </p>

          </div>

        </div>

      </main>
    );
  }

  // =======================================================
  // 4. COLLECTIONS
  // =======================================================

  const {
    data: collectionRows,
  } = await supabase
    .from("collections")
    .select(`
      id,
      title,
      description,
      collection_type,
      collection_mode,
      currency,
      target_amount,
      default_amount,
      status,
      join_code,
      requires_approval,
      deadline,
      created_at
    `)
    .eq(
      "organization_id",
      workspace.id
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  const collections =
    collectionRows ?? [];

  const collectionIds =
    collections.map(
      (collection) =>
        collection.id
    );

  // =======================================================
  // 5. PARTICIPANTS
  // =======================================================

  let participants:
    {
      id: string;
      collection_id: string;
      participation_status: string;
      is_active: boolean;
      created_at: string;
    }[] = [];

  if (
    collectionIds.length > 0
  ) {
    const {
      data: participantRows,
    } = await supabase
      .from("participants")
      .select(`
        id,
        collection_id,
        participation_status,
        is_active,
        created_at
      `)
      .in(
        "collection_id",
        collectionIds
      );

    participants =
      participantRows ?? [];
  }

  // =======================================================
  // 6. RECENT ACTIVITY
  // =======================================================

  let activityEvents:
    {
      id: string;
      collection_id: string;
      event_type: string;
      subject_label: string | null;
      description: string | null;
      created_at: string;
    }[] = [];

  if (
    collectionIds.length > 0
  ) {
    const {
      data: eventRows,
    } = await supabase
      .from(
        "collection_activity_events"
      )
      .select(`
        id,
        collection_id,
        event_type,
        subject_label,
        description,
        created_at
      `)
      .in(
        "collection_id",
        collectionIds
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(8);

    activityEvents =
      eventRows ?? [];
  }

  // =======================================================
  // 7. COLLECTION NAME LOOKUP
  // =======================================================

  const collectionNames =
    new Map<
      string,
      string
    >();

  for (
    const collection
    of collections
  ) {
    collectionNames.set(
      collection.id,
      collection.title
    );
  }

  // =======================================================
  // 8. SUMMARY METRICS
  // =======================================================

  const totalCollections =
    collections.length;

  const activeCollections =
    collections.filter(
      (collection) =>
        collection.status ===
        "active"
    ).length;

  const draftCollections =
    collections.filter(
      (collection) =>
        collection.status ===
        "draft"
    ).length;

  const activeParticipants =
    participants.filter(
      (participant) =>
        participant.is_active
    ).length;

  const pendingApprovals =
    participants.filter(
      (participant) =>
        participant.is_active &&
        participant
          .participation_status ===
          "approval_pending"
    ).length;

  // =======================================================
  // 9. UPCOMING DEADLINES
  // =======================================================

  const now =
    new Date();

  const upcomingCollections =
    collections
      .filter(
        (collection) =>
          collection.status ===
            "active" &&
          collection.deadline &&
          new Date(
            collection.deadline
          ) > now
      )
      .sort(
        (a, b) =>
          new Date(
            a.deadline!
          ).getTime() -
          new Date(
            b.deadline!
          ).getTime()
      )
      .slice(0, 5);

  // =======================================================
  // 10. PARTICIPANT COUNT PER COLLECTION
  // =======================================================

  const participantCountByCollection =
    new Map<
      string,
      number
    >();

  const pendingCountByCollection =
    new Map<
      string,
      number
    >();

  for (
    const participant
    of participants
  ) {
    if (
      participant.is_active
    ) {
      participantCountByCollection.set(
        participant.collection_id,
        (
          participantCountByCollection.get(
            participant.collection_id
          ) ?? 0
        ) + 1
      );
    }

    if (
      participant.is_active &&
      participant
        .participation_status ===
        "approval_pending"
    ) {
      pendingCountByCollection.set(
        participant.collection_id,
        (
          pendingCountByCollection.get(
            participant.collection_id
          ) ?? 0
        ) + 1
      );
    }
  }

  // =======================================================
  // UI
  // =======================================================

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">

      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <header className="border-b bg-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <Link
            href="/dashboard"
          >
            <div className="text-2xl font-bold tracking-tight">
              Threeple
            </div>

            <div className="text-sm text-neutral-500">
              Collect. Coordinate.
              Track.
            </div>
          </Link>

          <div className="text-right">

            <p className="text-sm font-medium">
              {workspace.name}
            </p>

            <p className="mt-0.5 text-xs capitalize text-neutral-400">
              {
                workspace.organization_type
              }{" "}
              workspace
            </p>

          </div>

        </div>

      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* ================================================= */}
        {/* WELCOME */}
        {/* ================================================= */}

        <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
              Organizer Dashboard
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Welcome, {displayName}
            </h1>

            <p className="mt-3 max-w-2xl leading-7 text-neutral-600">
              Create, coordinate and
              manage your Collections,
              participants and shared
              contribution activities
              from one place.
            </p>

          </div>

          <div className="flex flex-wrap gap-3">

            <Link
              href="/join"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-neutral-300 bg-white px-5 text-sm font-semibold transition hover:bg-neutral-100"
            >
              Join a Collection
            </Link>

            <Link
              href="/dashboard/collections/new"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              + Create Collection
            </Link>

          </div>

        </section>

        {/* ================================================= */}
        {/* METRICS */}
        {/* ================================================= */}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl border bg-white p-5">

            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Collections
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {totalCollections}
            </p>

            <p className="mt-2 text-xs text-neutral-500">
              {draftCollections} draft
            </p>

          </div>

          <div className="rounded-2xl border bg-white p-5">

            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Active Collections
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {activeCollections}
            </p>

            <p className="mt-2 text-xs text-neutral-500">
              Currently running
            </p>

          </div>

          <div className="rounded-2xl border bg-white p-5">

            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Participants
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {activeParticipants}
            </p>

            <p className="mt-2 text-xs text-neutral-500">
              Active across your
              Collections
            </p>

          </div>

          <div
            className={`rounded-2xl border p-5 ${
              pendingApprovals > 0
                ? "border-amber-200 bg-amber-50"
                : "bg-white"
            }`}
          >

            <p
              className={`text-xs font-medium uppercase tracking-wide ${
                pendingApprovals > 0
                  ? "text-amber-700"
                  : "text-neutral-400"
              }`}
            >
              Pending Approvals
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {pendingApprovals}
            </p>

            <p
              className={`mt-2 text-xs ${
                pendingApprovals > 0
                  ? "text-amber-700"
                  : "text-neutral-500"
              }`}
            >
              {pendingApprovals > 0
                ? "Requires your attention"
                : "Nothing waiting"}
            </p>

          </div>

        </section>

        {/* ================================================= */}
        {/* ATTENTION */}
        {/* ================================================= */}

        {pendingApprovals > 0 && (
          <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-6">

            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

              <div>

                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Needs attention
                </p>

                <h2 className="mt-2 text-xl font-semibold text-amber-950">
                  You have{" "}
                  {pendingApprovals}{" "}
                  participant
                  {pendingApprovals ===
                  1
                    ? ""
                    : "s"}{" "}
                  awaiting approval
                </h2>

                <p className="mt-2 text-sm leading-6 text-amber-800">
                  Review pending join
                  requests from the
                  relevant Collection.
                </p>

              </div>

              <div className="flex flex-wrap gap-2">

                {collections
                  .filter(
                    (collection) =>
                      (
                        pendingCountByCollection.get(
                          collection.id
                        ) ?? 0
                      ) > 0
                  )
                  .slice(0, 3)
                  .map(
                    (collection) => (
                      <Link
                        key={
                          collection.id
                        }
                        href={`/dashboard/collections/${collection.id}/participants`}
                        className="inline-flex h-10 items-center justify-center rounded-xl bg-black px-4 text-sm font-semibold text-white"
                      >
                        {
                          collection.title
                        }{" "}
                        (
                        {
                          pendingCountByCollection.get(
                            collection.id
                          )
                        }
                        )
                      </Link>
                    )
                  )}

              </div>

            </div>

          </section>
        )}

        {/* ================================================= */}
        {/* MAIN GRID */}
        {/* ================================================= */}

        <div className="mt-10 grid gap-8 xl:grid-cols-[1fr_360px]">

          {/* =============================================== */}
          {/* COLLECTIONS */}
          {/* =============================================== */}

          <section className="overflow-hidden rounded-3xl border bg-white">

            <div className="flex items-center justify-between border-b px-6 py-5">

              <div>

                <h2 className="text-lg font-semibold">
                  Your Collections
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  Everything you are
                  currently organizing
                  and tracking.
                </p>

              </div>

              <Link
                href="/dashboard/collections/new"
                className="text-sm font-semibold hover:underline"
              >
                New Collection
              </Link>

            </div>

            {collections.length >
            0 ? (
              <div className="divide-y">

                {collections.map(
                  (collection) => {
                    const collectionParticipants =
                      participantCountByCollection.get(
                        collection.id
                      ) ?? 0;

                    const collectionPending =
                      pendingCountByCollection.get(
                        collection.id
                      ) ?? 0;

                    return (
                      <Link
                        key={
                          collection.id
                        }
                        href={`/dashboard/collections/${collection.id}`}
                        className="block px-6 py-6 transition hover:bg-neutral-50"
                      >

                        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                          <div className="min-w-0">

                            <div className="flex flex-wrap items-center gap-2">

                              <h3 className="text-lg font-semibold">
                                {
                                  collection.title
                                }
                              </h3>

                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle(
                                  collection.status
                                )}`}
                              >
                                {friendlyText(
                                  collection.status
                                )}
                              </span>

                            </div>

                            {collection.description && (
                              <p className="mt-2 line-clamp-2 max-w-xl text-sm leading-6 text-neutral-500">
                                {
                                  collection.description
                                }
                              </p>
                            )}

                            <div className="mt-4 flex flex-wrap gap-2">

                              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">
                                {friendlyText(
                                  collection.collection_type
                                )}
                              </span>

                              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">
                                {friendlyText(
                                  collection.collection_mode
                                )}
                              </span>

                              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">
                                {
                                  collectionParticipants
                                }{" "}
                                participant
                                {collectionParticipants ===
                                1
                                  ? ""
                                  : "s"}
                              </span>

                              {collectionPending >
                                0 && (
                                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                                  {
                                    collectionPending
                                  }{" "}
                                  pending
                                </span>
                              )}

                            </div>

                          </div>

                          <div className="shrink-0 md:text-right">

                            <p className="text-xs uppercase tracking-wide text-neutral-400">
                              Threeple Code
                            </p>

                            <p className="mt-1 font-mono text-lg font-semibold tracking-wider">
                              {
                                collection.join_code
                              }
                            </p>

                            {collection.deadline && (
                              <p className="mt-2 text-xs text-neutral-400">
                                Deadline{" "}
                                {formatDate(
                                  collection.deadline
                                )}
                              </p>
                            )}

                          </div>

                        </div>

                      </Link>
                    );
                  }
                )}

              </div>
            ) : (
              <div className="px-6 py-14 text-center">

                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-2xl">
                  +
                </div>

                <h3 className="mt-5 font-semibold">
                  No Collections yet
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">
                  Start a wedding
                  contribution, event
                  fee, society dues,
                  shared fund,
                  recurring
                  contribution or
                  another Collection.
                </p>

                <Link
                  href="/dashboard/collections/new"
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-semibold text-white"
                >
                  Create your first
                  Collection
                </Link>

              </div>
            )}

          </section>

          {/* =============================================== */}
          {/* RIGHT SIDE */}
          {/* =============================================== */}

          <aside className="space-y-6">

            {/* QUICK ACTIONS */}

            <section className="rounded-3xl border bg-white p-6">

              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Quick actions
              </p>

              <h2 className="mt-2 text-lg font-semibold">
                What do you want to
                do?
              </h2>

              <div className="mt-5 space-y-3">

                <Link
                  href="/dashboard/collections/new"
                  className="flex items-center justify-between rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white"
                >
                  <span>
                    Create Collection
                  </span>

                  <span>→</span>
                </Link>

                <Link
                  href="/join"
                  className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3 text-sm font-medium hover:bg-neutral-50"
                >
                  <span>
                    Join with a Code
                  </span>

                  <span>→</span>
                </Link>

              </div>

            </section>

            {/* UPCOMING DEADLINES */}

            <section className="rounded-3xl border bg-white p-6">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                    Deadlines
                  </p>

                  <h2 className="mt-2 text-lg font-semibold">
                    Coming up
                  </h2>

                </div>

                <span className="text-xl">
                  ◷
                </span>

              </div>

              {upcomingCollections.length >
              0 ? (
                <div className="mt-5 divide-y">

                  {upcomingCollections.map(
                    (collection) => (
                      <Link
                        key={
                          collection.id
                        }
                        href={`/dashboard/collections/${collection.id}`}
                        className="block py-4 first:pt-0 last:pb-0"
                      >

                        <p className="text-sm font-medium">
                          {
                            collection.title
                          }
                        </p>

                        <p className="mt-1 text-xs text-neutral-500">
                          {formatDate(
                            collection.deadline!
                          )}
                        </p>

                      </Link>
                    )
                  )}

                </div>
              ) : (
                <p className="mt-5 text-sm leading-6 text-neutral-500">
                  No upcoming
                  Collection
                  deadlines.
                </p>
              )}

            </section>

          </aside>

        </div>

        {/* ================================================= */}
        {/* RECENT ACTIVITY */}
        {/* ================================================= */}

        <section className="mt-8 overflow-hidden rounded-3xl border bg-white">

          <div className="border-b px-6 py-5">

            <h2 className="text-lg font-semibold">
              Recent Activity
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Recent participant
              and Collection
              management actions
              across your workspace.
            </p>

          </div>

          {activityEvents.length >
          0 ? (
            <div className="divide-y">

              {activityEvents.map(
                (event) => {
                  const collectionTitle =
                    collectionNames.get(
                      event.collection_id
                    ) ??
                    "Collection";

                  return (
                    <Link
                      key={
                        event.id
                      }
                      href={`/dashboard/collections/${event.collection_id}/activity`}
                      className="flex flex-col gap-3 px-6 py-5 transition hover:bg-neutral-50 md:flex-row md:items-center md:justify-between"
                    >

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-2">

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${eventBadgeStyle(
                              event.event_type
                            )}`}
                          >
                            {friendlyEventName(
                              event.event_type
                            )}
                          </span>

                          <span className="text-xs text-neutral-400">
                            {
                              collectionTitle
                            }
                          </span>

                        </div>

                        <p className="mt-2 text-sm text-neutral-700">
                          {event.description ||
                            event.subject_label ||
                            friendlyEventName(
                              event.event_type
                            )}
                        </p>

                      </div>

                      <time className="shrink-0 text-xs text-neutral-400">
                        {formatDateTime(
                          event.created_at
                        )}
                      </time>

                    </Link>
                  );
                }
              )}

            </div>
          ) : (
            <div className="px-6 py-10 text-center">

              <p className="text-sm font-medium">
                No recorded activity
                yet
              </p>

              <p className="mt-2 text-sm text-neutral-500">
                New organizer and
                participant actions
                will appear here.
              </p>

            </div>
          )}

        </section>

        {/* ================================================= */}
        {/* PLATFORM NOTICE */}
        {/* ================================================= */}

        <section className="mt-8 rounded-3xl bg-neutral-900 p-6 text-white md:p-8">

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div>

              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Threeple
              </p>

              <h2 className="mt-2 text-xl font-semibold">
                Collect. Coordinate.
                Track.
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-300">
                Manage shared
                contributions,
                participation,
                approvals and
                Collection activity
                from one place.
              </p>

            </div>

            <Link
              href="/dashboard/collections/new"
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-black hover:bg-neutral-100"
            >
              Create Collection
            </Link>

          </div>

        </section>

      </div>

    </main>
  );
}

