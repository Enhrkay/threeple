import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import {
  requirePlatformAdmin,
} from "@/lib/admin/server";

import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

export const instant = false;

type PageProps = {
  params: Promise<{
    collectionId: string;
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
    .replaceAll(".", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

function formatDateTime(
  value: string | null | undefined
) {
  if (!value) {
    return "—";
  }

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
    return "Not set";
  }

  const numeric =
    Number(amount);

  if (
    !Number.isFinite(numeric)
  ) {
    return "Not set";
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
    ).format(numeric);
  } catch {
    return `${currency} ${numeric.toLocaleString()}`;
  }
}

function statusStyle(
  status: string,
  archived: boolean
) {
  if (archived) {
    return "bg-neutral-900 text-white";
  }

  switch (status) {
    case "active":
      return "bg-[var(--tp-success-soft)] text-[var(--tp-success)]";

    case "draft":
      return "bg-[var(--tp-warning-soft)] text-[var(--tp-warning)]";

    case "closed":
      return "bg-neutral-200 text-[var(--tp-ink-soft)]";

    case "cancelled":
      return "bg-[var(--tp-danger-soft)] text-[var(--tp-danger)]";

    default:
      return "bg-[var(--tp-bg-soft)] text-[var(--tp-ink-soft)]";
  }
}

function participantStyle(
  status: string,
  active: boolean
) {
  if (!active) {
    return "bg-neutral-200 text-[var(--tp-ink-soft)]";
  }

  switch (status) {
    case "approved":
      return "bg-[var(--tp-success-soft)] text-[var(--tp-success)]";

    case "approval_pending":
      return "bg-[var(--tp-warning-soft)] text-[var(--tp-warning)]";

    case "joined":
      return "bg-[var(--tp-info-soft)] text-[var(--tp-info)]";

    case "declined":
      return "bg-[var(--tp-danger-soft)] text-[var(--tp-danger)]";

    case "cancelled":
      return "bg-neutral-200 text-[var(--tp-ink-soft)]";

    default:
      return "bg-[var(--tp-bg-soft)] text-[var(--tp-ink-soft)]";
  }
}

// =========================================================
// PAGE
// =========================================================

export default async function AdminCollectionProfilePage({
  params,
}: PageProps) {
  const {
    collectionId,
  } = await params;

  const admin =
    await requirePlatformAdmin();

  // =======================================================
  // COLLECTION
  // =======================================================

  const {
    data: collection,
    error: collectionError,
  } = await supabaseAdmin
    .from("collections")
    .select(`
      id,
      organization_id,
      created_by,
      title,
      description,
      collection_type,
      collection_mode,
      currency,
      target_amount,
      default_amount,
      allow_partial_payments,
      allow_custom_amount,
      deadline,
      join_code,
      public_slug,
      visibility,
      show_participant_names,
      show_payment_amounts,
      requires_approval,
      access_mode,
      status,
      closed_at,
      archived_at,
      created_at,
      updated_at
    `)
    .eq(
      "id",
      collectionId
    )
    .maybeSingle();

  if (
    collectionError ||
    !collection
  ) {
    notFound();
  }

  const archived =
    Boolean(
      collection.archived_at
    );

  // =======================================================
  // ORGANIZATION
  // =======================================================

  const {
    data: organization,
  } = await supabaseAdmin
    .from("organizations")
    .select(`
      id,
      owner_id,
      name,
      type,
      slug,
      created_at
    `)
    .eq(
      "id",
      collection.organization_id
    )
    .maybeSingle();

  // =======================================================
  // CREATOR PROFILE
  // =======================================================

  const {
    data: creatorProfile,
  } = await supabaseAdmin
    .from("profiles")
    .select(`
      full_name,
      phone
    `)
    .eq(
      "id",
      collection.created_by
    )
    .maybeSingle();

  let creatorEmail:
    | string
    | null = null;

  try {
    const {
      data: creatorAuth,
    } =
      await supabaseAdmin.auth.admin.getUserById(
        collection.created_by
      );

    creatorEmail =
      creatorAuth.user?.email ??
      null;
  } catch {
    creatorEmail = null;
  }

  // =======================================================
  // PARTICIPANTS
  // =======================================================

  const {
    data: participants,
  } = await supabaseAdmin
    .from("participants")
    .select(`
      id,
      user_id,
      full_name,
      email,
      phone,
      expected_amount,
      payment_status,
      participation_status,
      access_reference,
      join_method,
      invited_by,
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

  const participantRows =
    participants ?? [];

  // =======================================================
  // ACTIVITY
  // =======================================================

  const {
    data: activity,
  } = await supabaseAdmin
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
    .limit(30);

  const activityRows =
    activity ?? [];

  // =======================================================
  // ACTOR NAMES
  // =======================================================

  const actorUserIds =
    Array.from(
      new Set(
        activityRows
          .map(
            (event) =>
              event.actor_user_id
          )
          .filter(
            (
              userId
            ): userId is string =>
              Boolean(userId)
          )
      )
    );

  let actorProfiles:
    {
      id: string;
      full_name: string | null;
    }[] = [];

  if (
    actorUserIds.length > 0
  ) {
    const {
      data,
    } = await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        full_name
      `)
      .in(
        "id",
        actorUserIds
      );

    actorProfiles =
      data ?? [];
  }

  const actorMap =
    new Map(
      actorProfiles.map(
        (profile) => [
          profile.id,
          profile.full_name,
        ]
      )
    );

  // =======================================================
  // RECURRING / ROTATION RECORD COUNTS
  //
  // Read-only existence checks.
  // =======================================================

  const [
    recurringSchedulesResult,
    cyclesResult,
    rotationResult,
    obligationsResult,
  ] = await Promise.all([

    supabaseAdmin
      .from(
        "recurring_schedules"
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
        collection.id
      ),

    supabaseAdmin
      .from(
        "collection_cycles"
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
        collection.id
      ),

    supabaseAdmin
      .from(
        "rotation_order"
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
        collection.id
      ),

    supabaseAdmin
      .from(
        "participant_obligations"
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
        collection.id
      ),

  ]);

  const recurringSchedules =
    recurringSchedulesResult.count ??
    0;

  const collectionCycles =
    cyclesResult.count ??
    0;

  const rotationEntries =
    rotationResult.count ??
    0;

  const obligations =
    obligationsResult.count ??
    0;

  // =======================================================
  // SUMMARY
  // =======================================================

  const totalParticipants =
    participantRows.length;

  const activeParticipants =
    participantRows.filter(
      (participant) =>
        participant.is_active
    ).length;

  const approvedParticipants =
    participantRows.filter(
      (participant) =>
        participant.is_active &&
        participant
          .participation_status ===
          "approved"
    ).length;

  const pendingParticipants =
    participantRows.filter(
      (participant) =>
        participant.is_active &&
        participant
          .participation_status ===
          "approval_pending"
    ).length;

  // =======================================================
  // UI
  // =======================================================

  return (
    <main className="min-h-screen bg-[var(--tp-bg)] text-[var(--tp-ink)]">

      {/* HEADER */}

      <header className="border-b border-[var(--tp-border)] bg-[var(--tp-surface)] text-[var(--tp-ink)]">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <Link
            href="/admin"
          >
            <div className="text-2xl font-black tracking-tight text-[var(--tp-primary)]">
              Threeple
            </div>

            <p className="text-xs text-[var(--tp-faint)]">
              Threeple Operations
            </p>
          </Link>

          <div className="text-right">

            <p className="text-sm font-medium">
              {admin.fullName}
            </p>

            <p className="mt-0.5 text-xs text-[var(--tp-faint)]">
              {friendlyText(
                admin.role
              )}
            </p>

          </div>

        </div>

      </header>

      <div className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 sm:pb-10 sm:pt-8 lg:px-8 lg:py-10">

        {/* BACK */}

        <Link
          href="/admin/collections"
          className="text-sm font-medium text-[var(--tp-muted)] hover:text-black"
        >
          ← Collections
        </Link>

        {/* COLLECTION HEADER */}

        <section className="mt-6">

          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

            <div>

              <div className="flex flex-wrap gap-2">

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(
                    collection.status,
                    archived
                  )}`}
                >
                  {archived
                    ? "Archived"
                    : friendlyText(
                        collection.status
                      )}
                </span>

                {archived && (
                  <span className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-semibold text-[var(--tp-ink-soft)]">
                    Lifecycle:{" "}
                    {friendlyText(
                      collection.status
                    )}
                  </span>
                )}

                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {friendlyText(
                    collection.collection_type
                  )}
                </span>

              </div>

              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--tp-faint)]">
                Admin Collection overview
              </p>

              <h1 className="mt-3 text-3xl font-black tracking-tight tracking-tight md:text-4xl">
                {collection.title}
              </h1>

              {collection.description && (
                <p className="mt-4 max-w-3xl leading-7 text-[var(--tp-ink-soft)]">
                  {
                    collection.description
                  }
                </p>
              )}

            </div>

            <div className="rounded-[1.5rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] shadow-[var(--tp-shadow-sm)] p-5 lg:min-w-[240px]">

              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
                Threeple Code
              </p>

              <p className="mt-2 font-mono text-xl font-black tracking-tight tracking-wider">
                {collection.join_code ||
                  "—"}
              </p>

              <p className="mt-4 text-xs text-[var(--tp-faint)]">
                Collection ID
              </p>

              <p className="mt-1 break-all font-mono text-[11px] text-[var(--tp-muted)]">
                {collection.id}
              </p>

            </div>

          </div>

        </section>

        {/* SUMMARY */}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-[1.5rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] shadow-[var(--tp-shadow-sm)] p-5">

            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
              Participants
            </p>

            <p className="mt-3 text-3xl font-black tracking-tight">
              {totalParticipants}
            </p>

            <p className="mt-2 text-xs text-[var(--tp-muted)]">
              {activeParticipants} active
            </p>

          </div>

          <div className="rounded-[1.5rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] shadow-[var(--tp-shadow-sm)] p-5">

            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
              Approved
            </p>

            <p className="mt-3 text-3xl font-black tracking-tight">
              {approvedParticipants}
            </p>

          </div>

          <div
            className={`rounded-2xl border p-5 ${
              pendingParticipants > 0
                ? "border-amber-200 bg-amber-50"
                : "bg-white"
            }`}
          >

            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
              Pending Approval
            </p>

            <p className="mt-3 text-3xl font-black tracking-tight">
              {pendingParticipants}
            </p>

          </div>

          <div className="rounded-[1.5rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] shadow-[var(--tp-shadow-sm)] p-5">

            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
              Activity Events
            </p>

            <p className="mt-3 text-3xl font-black tracking-tight">
              {activityRows.length}
            </p>

            <p className="mt-2 text-xs text-[var(--tp-muted)]">
              Latest 30 loaded
            </p>

          </div>

        </section>

        {/* COLLECTION CONFIGURATION */}

        <section className="mt-8 rounded-[2rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] shadow-[var(--tp-shadow-sm)] p-6 md:p-8">

          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
            Configuration
          </p>

          <h2 className="mt-2 text-xl font-black tracking-tight">
            Collection Settings
          </h2>

          <div className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">

            <div>
              <p className="text-xs text-[var(--tp-faint)]">
                Type
              </p>

              <p className="mt-1 text-sm font-medium">
                {friendlyText(
                  collection.collection_type
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-[var(--tp-faint)]">
                Mode
              </p>

              <p className="mt-1 text-sm font-medium">
                {friendlyText(
                  collection.collection_mode
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-[var(--tp-faint)]">
                Currency
              </p>

              <p className="mt-1 text-sm font-medium">
                {collection.currency}
              </p>
            </div>

            <div>
              <p className="text-xs text-[var(--tp-faint)]">
                Target Amount
              </p>

              <p className="mt-1 text-sm font-medium">
                {formatMoney(
                  collection.target_amount,
                  collection.currency
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-[var(--tp-faint)]">
                Default Amount
              </p>

              <p className="mt-1 text-sm font-medium">
                {formatMoney(
                  collection.default_amount,
                  collection.currency
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-[var(--tp-faint)]">
                Deadline
              </p>

              <p className="mt-1 text-sm font-medium">
                {formatDateTime(
                  collection.deadline
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-[var(--tp-faint)]">
                Approval Required
              </p>

              <p className="mt-1 text-sm font-medium">
                {collection.requires_approval
                  ? "Yes"
                  : "No"}
              </p>
            </div>

            <div>
              <p className="text-xs text-[var(--tp-faint)]">
                Partial Payments
              </p>

              <p className="mt-1 text-sm font-medium">
                {collection.allow_partial_payments
                  ? "Allowed"
                  : "Not allowed"}
              </p>
            </div>

            <div>
              <p className="text-xs text-[var(--tp-faint)]">
                Custom Amount
              </p>

              <p className="mt-1 text-sm font-medium">
                {collection.allow_custom_amount
                  ? "Allowed"
                  : "Not allowed"}
              </p>
            </div>

            <div>
              <p className="text-xs text-[var(--tp-faint)]">
                Access Mode
              </p>

              <p className="mt-1 text-sm font-medium">
                {friendlyText(
                  collection.access_mode
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-[var(--tp-faint)]">
                Visibility
              </p>

              <p className="mt-1 text-sm font-medium">
                {friendlyText(
                  collection.visibility
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-[var(--tp-faint)]">
                Public Slug
              </p>

              <p className="mt-1 text-sm font-medium">
                {collection.public_slug ||
                  "Not set"}
              </p>
            </div>

          </div>

        </section>

        {/* LIFECYCLE */}

        <section className="mt-8 rounded-[2rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] shadow-[var(--tp-shadow-sm)] p-6 md:p-8">

          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
            Lifecycle
          </p>

          <h2 className="mt-2 text-xl font-black tracking-tight">
            Collection History
          </h2>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">

            <div>
              <p className="text-xs text-[var(--tp-faint)]">
                Created
              </p>

              <p className="mt-1 text-sm font-medium">
                {formatDateTime(
                  collection.created_at
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-[var(--tp-faint)]">
                Last Updated
              </p>

              <p className="mt-1 text-sm font-medium">
                {formatDateTime(
                  collection.updated_at
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-[var(--tp-faint)]">
                Closed
              </p>

              <p className="mt-1 text-sm font-medium">
                {formatDateTime(
                  collection.closed_at
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-[var(--tp-faint)]">
                Archived
              </p>

              <p className="mt-1 text-sm font-medium">
                {formatDateTime(
                  collection.archived_at
                )}
              </p>
            </div>

          </div>

        </section>

        {/* ORGANIZER */}

        <section className="mt-8 rounded-[2rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] shadow-[var(--tp-shadow-sm)] p-6 md:p-8">

          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
            Organizer
          </p>

          <h2 className="mt-2 text-xl font-black tracking-tight">
            Collection Ownership
          </h2>

          <div className="mt-6 grid gap-6 md:grid-cols-2">

            <div className="rounded-2xl bg-[var(--tp-bg-soft)] p-5">

              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
                Workspace
              </p>

              <p className="mt-3 text-lg font-semibold">
                {organization?.name ||
                  "Unknown Organization"}
              </p>

              <p className="mt-1 text-sm text-[var(--tp-muted)]">
                {friendlyText(
                  organization?.type
                )}
              </p>

              {organization?.slug && (
                <p className="mt-3 text-xs text-[var(--tp-faint)]">
                  {organization.slug}
                </p>
              )}

            </div>

            <div className="rounded-2xl bg-[var(--tp-bg-soft)] p-5">

              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
                Organizer
              </p>

              <p className="mt-3 text-lg font-semibold">
                {creatorProfile?.full_name ||
                  "Unknown User"}
              </p>

              <p className="mt-1 text-sm text-[var(--tp-muted)]">
                {creatorEmail ||
                  "No email available"}
              </p>

              <Link
                href={`/admin/users/${collection.created_by}`}
                className="mt-4 inline-flex text-sm font-semibold hover:underline"
              >
                View User →
              </Link>

            </div>

          </div>

        </section>

        {/* RECURRING / ROTATING */}

        {(collection.collection_mode ===
          "recurring_dues" ||
          collection.collection_mode ===
            "rotating_pool") && (
          <section className="mt-8 rounded-[2rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] shadow-[var(--tp-shadow-sm)] p-6 md:p-8">

            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
              Recurring Structure
            </p>

            <h2 className="mt-2 text-xl font-black tracking-tight">
              Schedule & Obligations
            </h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              <div className="rounded-2xl bg-[var(--tp-bg-soft)] p-5">
                <p className="text-xs text-[var(--tp-faint)]">
                  Schedules
                </p>

                <p className="mt-2 text-2xl font-black tracking-tight">
                  {recurringSchedules}
                </p>
              </div>

              <div className="rounded-2xl bg-[var(--tp-bg-soft)] p-5">
                <p className="text-xs text-[var(--tp-faint)]">
                  Cycles
                </p>

                <p className="mt-2 text-2xl font-black tracking-tight">
                  {collectionCycles}
                </p>
              </div>

              <div className="rounded-2xl bg-[var(--tp-bg-soft)] p-5">
                <p className="text-xs text-[var(--tp-faint)]">
                  Rotation Entries
                </p>

                <p className="mt-2 text-2xl font-black tracking-tight">
                  {rotationEntries}
                </p>
              </div>

              <div className="rounded-2xl bg-[var(--tp-bg-soft)] p-5">
                <p className="text-xs text-[var(--tp-faint)]">
                  Obligations
                </p>

                <p className="mt-2 text-2xl font-black tracking-tight">
                  {obligations}
                </p>
              </div>

            </div>

          </section>
        )}

        {/* PARTICIPANTS */}

        <section className="mt-8 overflow-hidden rounded-[2rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] shadow-[var(--tp-shadow-sm)]">

          <div className="border-b px-6 py-5">

            <h2 className="text-lg font-semibold">
              Participants
            </h2>

            <p className="mt-1 text-sm text-[var(--tp-muted)]">
              All participant records
              for this Collection.
            </p>

          </div>

          {participantRows.length >
          0 ? (
            <div className="tp-scroll-x">

              <table className="min-w-full text-left">

                <thead className="border-b bg-[var(--tp-bg-soft)]">

                  <tr>

                    <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
                      Participant
                    </th>

                    <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
                      Participation
                    </th>

                    <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
                      Expected
                    </th>

                    <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
                      Contribution
                    </th>

                    <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
                      Joined Via
                    </th>

                    <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
                      Joined
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y">

                  {participantRows.map(
                    (participant) => (
                      <tr
                        key={
                          participant.id
                        }
                        className="hover:bg-[var(--tp-bg-soft)]"
                      >

                        <td className="px-6 py-5 align-top">

                          <p className="font-semibold">
                            {
                              participant.full_name
                            }
                          </p>

                          <p className="mt-1 text-sm text-[var(--tp-muted)]">
                            {participant.email ||
                              participant.phone ||
                              "No contact"}
                          </p>

                          {participant.user_id && (
                            <Link
                              href={`/admin/users/${participant.user_id}`}
                              className="mt-2 inline-flex text-xs font-semibold hover:underline"
                            >
                              View account →
                            </Link>
                          )}

                        </td>

                        <td className="px-6 py-5 align-top">

                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${participantStyle(
                              participant.participation_status,
                              participant.is_active
                            )}`}
                          >
                            {participant.is_active
                              ? friendlyText(
                                  participant.participation_status
                                )
                              : "Inactive"}
                          </span>

                        </td>

                        <td className="px-6 py-5 align-top">

                          <p className="text-sm font-medium">
                            {formatMoney(
                              participant.expected_amount,
                              collection.currency
                            )}
                          </p>

                        </td>

                        <td className="px-6 py-5 align-top">

                          <p className="text-sm font-medium">
                            {friendlyText(
                              participant.payment_status
                            )}
                          </p>

                        </td>

                        <td className="px-6 py-5 align-top">

                          <p className="text-sm font-medium">
                            {friendlyText(
                              participant.join_method
                            )}
                          </p>

                        </td>

                        <td className="px-6 py-5 align-top">

                          <p className="text-sm text-[var(--tp-muted)]">
                            {formatDateTime(
                              participant.created_at
                            )}
                          </p>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          ) : (
            <div className="px-6 py-10 text-sm text-[var(--tp-muted)]">
              No participants in this
              Collection.
            </div>
          )}

        </section>

        {/* ACTIVITY */}

        <section className="mt-8 overflow-hidden rounded-[2rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] shadow-[var(--tp-shadow-sm)]">

          <div className="border-b px-6 py-5">

            <h2 className="text-lg font-semibold">
              Collection Activity
            </h2>

            <p className="mt-1 text-sm text-[var(--tp-muted)]">
              Latest recorded
              lifecycle, participant
              and management events.
            </p>

          </div>

          {activityRows.length >
          0 ? (
            <div className="divide-y">

              {activityRows.map(
                (event) => {

                  const actorName =
                    event.actor_user_id
                      ? actorMap.get(
                          event.actor_user_id
                        )
                      : null;

                  return (
                    <div
                      key={
                        event.id
                      }
                      className="px-6 py-5"
                    >

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">

                        <div>

                          <p className="font-semibold">
                            {friendlyText(
                              event.event_type
                            )}
                          </p>

                          <p className="mt-2 text-sm leading-6 text-[var(--tp-ink-soft)]">
                            {event.description ||
                              event.subject_label ||
                              "Collection activity"}
                          </p>

                        </div>

                        <time className="whitespace-nowrap text-xs text-[var(--tp-faint)]">
                          {formatDateTime(
                            event.created_at
                          )}
                        </time>

                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--tp-faint)]">

                        <span>
                          Actor:{" "}
                          {actorName ||
                            friendlyText(
                              event.actor_type
                            )}
                        </span>

                        {event.subject_type && (
                          <span>
                            Subject:{" "}
                            {friendlyText(
                              event.subject_type
                            )}
                          </span>
                        )}

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          ) : (
            <div className="px-6 py-10 text-sm text-[var(--tp-muted)]">
              No recorded activity yet.
            </div>
          )}

        </section>

        {/* PAYMENT BOUNDARY */}

        <section className="mt-8 rounded-3xl border border-dashed bg-[var(--tp-bg-soft)] p-6 md:p-8">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
                Payments & Settlement
              </p>

              <h2 className="mt-2 text-xl font-black tracking-tight">
                Payment administration paused
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--tp-muted)]">
                Payment initiation,
                settlement, refunds and
                provider reconciliation
                are intentionally outside
                the current Admin build.
              </p>

            </div>

            <span className="w-fit rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700">
              Paused
            </span>

          </div>

        </section>

        {/* SAFETY */}

        <section className="mt-8 rounded-3xl bg-neutral-950 p-6 text-white md:p-8">

          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-faint)]">
            Threeple Operations
          </p>

          <h2 className="mt-2 text-xl font-black tracking-tight">
            Read-only Collection inspection
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-300">
            This page provides
            platform visibility only.
            Threeple Admin cannot yet
            change the Collection,
            participants, lifecycle or
            organizer data from this
            screen. Privileged actions
            will be introduced with
            explicit permissions,
            reasons and audit records.
          </p>

        </section>

      </div>

    
        <section className="mt-8 rounded-[2rem] border border-[var(--tp-danger-border)] bg-[var(--tp-danger-soft)] p-6 md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tp-danger)]">
            Lifecycle protection
          </p>
          <h2 className="mt-2 text-xl font-black text-[var(--tp-danger)]">
            Archive and deletion history
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--tp-danger)]/80">
            Collection removal is handled through the organizer lifecycle workflow so participant and financial history remain protected.
          </p>
          <a
            href={`/dashboard/collections/${collection.id}/lifecycle`}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--tp-danger)] px-5 text-sm font-black text-white"
          >
            Open lifecycle controls
          </a>
        </section>
</main>
  );
}


