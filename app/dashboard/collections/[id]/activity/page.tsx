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

    case "reminder.sent":
      return "Reminder sent";

    default:
      return eventType
        .replaceAll(".", " ")
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) =>
          char.toUpperCase()
        );
  }
}

function eventBadgeStyle(
  eventType: string
) {
  if (
    eventType.includes(
      "approved"
    ) ||
    eventType.includes(
      "reactivated"
    ) ||
    eventType.includes(
      "activated"
    )
  ) {
    return "bg-green-100 text-green-700";
  }

  if (
    eventType.includes(
      "declined"
    ) ||
    eventType.includes(
      "deactivated"
    ) ||
    eventType.includes(
      "cancelled"
    )
  ) {
    return "bg-red-100 text-red-700";
  }

  if (
    eventType.includes(
      "joined"
    )
  ) {
    return "bg-blue-100 text-blue-700";
  }

  if (
    eventType.includes(
      "updated"
    )
  ) {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-neutral-100 text-neutral-700";
}

function eventMarker(
  eventType: string
) {
  if (
    eventType.includes(
      "approved"
    ) ||
    eventType.includes(
      "reactivated"
    )
  ) {
    return "✓";
  }

  if (
    eventType.includes(
      "declined"
    ) ||
    eventType.includes(
      "deactivated"
    )
  ) {
    return "×";
  }

  if (
    eventType.includes(
      "joined"
    )
  ) {
    return "+";
  }

  if (
    eventType.includes(
      "updated"
    )
  ) {
    return "✎";
  }

  if (
    eventType.includes(
      "activated"
    )
  ) {
    return "▶";
  }

  return "•";
}

function formatDate(
  value: string
) {
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

// =========================================================
// PAGE
// =========================================================

export default async function ActivityPage({
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
    redirect(
      "/auth/login"
    );
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
      owner_id,
      name
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
  // ACTIVITY EVENTS
  // =======================================================

  const {
    data: events,
    error: eventsError,
  } = await supabase
    .from(
      "collection_activity_events"
    )
    .select(`
      id,
      actor_user_id,
      actor_type,
      event_type,
      subject_type,
      subject_id,
      subject_label,
      description,
      metadata,
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
    )
    .limit(100);

  if (eventsError) {
    throw new Error(
      "Threeple could not load Collection activity."
    );
  }

  const activityEvents =
    events ?? [];

  // =======================================================
  // ACTOR NAMES
  // =======================================================

  const actorIds =
    Array.from(
      new Set(
        activityEvents
          .map(
            (event) =>
              event.actor_user_id
          )
          .filter(
            (
              value
            ): value is string =>
              Boolean(value)
          )
      )
    );

  const actorNames =
    new Map<
      string,
      string
    >();

  if (
    actorIds.length > 0
  ) {
    const {
      data: profiles,
    } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name
      `)
      .in(
        "id",
        actorIds
      );

    for (
      const profile
      of profiles ?? []
    ) {
      actorNames.set(
        profile.id,
        profile.full_name ||
          "Organizer"
      );
    }
  }

  // =======================================================
  // SUMMARY COUNTS
  // =======================================================

  const joinEvents =
    activityEvents.filter(
      (event) =>
        event.event_type ===
        "participant.joined"
    ).length;

  const approvalEvents =
    activityEvents.filter(
      (event) =>
        event.event_type ===
        "participant.approved"
    ).length;

  const declineEvents =
    activityEvents.filter(
      (event) =>
        event.event_type ===
        "participant.declined"
    ).length;

  const managementEvents =
    activityEvents.filter(
      (event) =>
        event.event_type ===
          "participant.deactivated" ||
        event.event_type ===
          "participant.reactivated"
    ).length;

  // =======================================================
  // UI
  // =======================================================

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">

      {/* HEADER */}

      <header className="border-b bg-white">

        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">

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

      <div className="mx-auto max-w-5xl px-6 py-10">

        {/* TITLE */}

        <section>

          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Activity
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {collection.title}
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-neutral-600">
            A chronological record
            of important actions
            taken within this
            Collection.
          </p>

        </section>

        {/* SUMMARY */}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl border bg-white p-5">

            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Events
            </p>

            <p className="mt-2 text-3xl font-semibold">
              {
                activityEvents.length
              }
            </p>

          </div>

          <div className="rounded-2xl border bg-white p-5">

            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Joins
            </p>

            <p className="mt-2 text-3xl font-semibold">
              {joinEvents}
            </p>

          </div>

          <div className="rounded-2xl border bg-white p-5">

            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Approvals
            </p>

            <p className="mt-2 text-3xl font-semibold">
              {approvalEvents}
            </p>

          </div>

          <div className="rounded-2xl border bg-white p-5">

            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Management actions
            </p>

            <p className="mt-2 text-3xl font-semibold">
              {
                managementEvents +
                declineEvents
              }
            </p>

          </div>

        </section>

        {/* TIMELINE */}

        <section className="mt-8">

          <div className="mb-5 flex items-center justify-between">

            <h2 className="text-xl font-semibold">
              Activity timeline
            </h2>

            <span className="text-sm text-neutral-500">
              Latest 100 events
            </span>

          </div>

          {activityEvents.length ===
          0 ? (
            <div className="rounded-3xl border border-dashed bg-white p-10 text-center">

              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-xl">
                ◷
              </div>

              <h3 className="mt-4 font-semibold">
                No activity yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">
                New Collection
                actions will appear
                here as Threeple
                records them.
              </p>

            </div>
          ) : (
            <div className="rounded-3xl border bg-white px-5 py-2 md:px-8">

              {activityEvents.map(
                (
                  event,
                  index
                ) => {
                  const actorName =
                    event.actor_user_id
                      ? actorNames.get(
                          event.actor_user_id
                        ) ??
                        "Organizer"
                      : event.actor_type ===
                          "system"
                        ? "Threeple"
                        : event.actor_type ===
                            "provider"
                          ? "Payment provider"
                          : "Threeple";

                  return (
                    <article
                      key={
                        event.id
                      }
                      className="relative flex gap-4 py-6"
                    >

                      {/* TIMELINE LINE */}

                      {index <
                        activityEvents.length -
                          1 && (
                        <div className="absolute left-[19px] top-12 h-[calc(100%-24px)] w-px bg-neutral-200" />
                      )}

                      {/* MARKER */}

                      <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-white text-sm font-bold">
                        {eventMarker(
                          event.event_type
                        )}
                      </div>

                      {/* CONTENT */}

                      <div className="min-w-0 flex-1">

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                          <div className="flex flex-wrap items-center gap-2">

                            <h3 className="font-semibold">
                              {friendlyEventName(
                                event.event_type
                              )}
                            </h3>

                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${eventBadgeStyle(
                                event.event_type
                              )}`}
                            >
                              {event.event_type}
                            </span>

                          </div>

                          <time className="shrink-0 text-xs text-neutral-400">
                            {formatDate(
                              event.created_at
                            )}
                          </time>

                        </div>

                        {event.description && (
                          <p className="mt-2 text-sm leading-6 text-neutral-600">
                            {
                              event.description
                            }
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-neutral-400">

                          <span>
                            By:{" "}
                            <strong className="font-medium text-neutral-600">
                              {
                                actorName
                              }
                            </strong>
                          </span>

                          {event.subject_label && (
                            <span>
                              Subject:{" "}
                              <strong className="font-medium text-neutral-600">
                                {
                                  event.subject_label
                                }
                              </strong>
                            </span>
                          )}

                        </div>

                      </div>

                    </article>
                  );
                }
              )}

            </div>
          )}

        </section>

        {/* AUDIT NOTICE */}

        <section className="mt-8 rounded-2xl bg-neutral-100 p-5">

          <p className="text-sm font-medium">
            Threeple activity
            records are historical
            records.
          </p>

          <p className="mt-2 text-sm leading-6 text-neutral-500">
            Organizers can view the
            timeline, but activity
            records cannot be
            edited or deleted from
            this interface.
          </p>

        </section>

      </div>

    </main>
  );
}