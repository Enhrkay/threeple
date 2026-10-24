import Link from "next/link";
import {
  notFound,
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
  ThreepleEmptyState,
  ThreepleStat,
} from "@/components/threeple/design-system";

export const instant = false;

type PageProps = {
  params: Promise<{
    collectionId: string;
  }>;
};

function money(
  amount:
    | number
    | string
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

export default async function CollectorCollectionPage({
  params,
}: PageProps) {
  const {
    collectionId,
  } = await params;

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
        `/collector/${collectionId}`
      )}`
    );
  }

  const {
    data: collection,
  } = await supabaseAdmin
    .from("collections")
    .select(`
      id,
      organization_id,
      title,
      collection_mode,
      collection_type,
      currency,
      default_amount,
      status,
      archived_at
    `)
    .eq(
      "id",
      collectionId
    )
    .maybeSingle();

  if (
    !collection ||
    collection.status !==
      "active" ||
    collection.archived_at
  ) {
    notFound();
  }

  const {
    data: organization,
  } = await supabaseAdmin
    .from("organizations")
    .select(`
      id,
      name,
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
    } = await supabaseAdmin
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
      Boolean(
        membership
      );
  }

  if (!allowed) {
    notFound();
  }

  const {
    data: participants,
  } = await supabaseAdmin
    .from("participants")
    .select(`
      id,
      full_name,
      phone,
      expected_amount,
      payment_status,
      participation_status
    `)
    .eq(
      "collection_id",
      collectionId
    )
    .eq(
      "is_active",
      true
    )
    .order(
      "full_name",
      {
        ascending: true,
      }
    );

  const participantRows =
    participants ?? [];

  const paidCount =
    participantRows.filter(
      (participant) =>
        participant.payment_status ===
        "paid"
    ).length;

  const outstandingCount =
    participantRows.length -
    paidCount;

  const isAjo =
    collection.collection_mode ===
    "rotating_pool";

  return (
    <ThreepleAppShell
      title="Collector Workspace"
      subtitle={collection.title}
      status={
        <ThreepleBadge
          tone={
            isAjo
              ? "warning"
              : "primary"
          }
        >
          {isAjo
            ? "Ajo"
            : "Field collection"}
        </ThreepleBadge>
      }
    >
      <div className="mx-auto max-w-6xl">
        <Link
          href="/collector"
          className="text-sm font-black text-[var(--tp-primary)]"
        >
          Back to Collector Mode
        </Link>

        <section className="mt-5 rounded-[2rem] border border-[var(--tp-primary-border)] bg-[var(--tp-primary)] p-6 text-white shadow-[var(--tp-shadow-md)] sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-white/50">
            {organization.name}
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
            {collection.title}
          </h1>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="rounded-full bg-white/10 px-4 py-2 text-sm font-black">
              {participantRows.length} members
            </div>

            <div className="rounded-full bg-white/10 px-4 py-2 text-sm font-black">
              {money(
                collection.default_amount,
                collection.currency
              )}
              {isAjo
                ? " / cycle"
                : " base"}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <ThreepleStat
            label="Members"
            value={
              participantRows.length
            }
            helper="Active participant records."
            tone="primary"
          />

          <ThreepleStat
            label="Paid"
            value={
              paidCount
            }
            helper="Based on current participant payment status."
            tone="success"
          />

          <ThreepleStat
            label="Outstanding"
            value={
              outstandingCount
            }
            helper="Members not currently marked paid."
            tone="warning"
          />
        </section>

        <ThreepleAlert
          tone="info"
          className="mt-6"
        >
          This is the Field Collector foundation. Recording cash/manual contributions, offline receipts and the sync queue will be added next. Existing Paystack payment logic is not changed here.
        </ThreepleAlert>

        <section className="mt-8">
          <div>
            <p className="tp-kicker">
              Members
            </p>

            <h2 className="tp-heading mt-2 text-2xl">
              Who are you collecting from?
            </h2>

            <p className="tp-body mt-2 text-sm">
              This list is intentionally mobile-friendly. Search and fast record actions will plug into this workspace next.
            </p>
          </div>

          {participantRows.length ===
          0 ? (
            <ThreepleEmptyState
              className="mt-6"
              title="No members yet"
              description="Share the Threeple Code or add participants through the organizer workflow first."
            />
          ) : (
            <div className="mt-6 space-y-3">
              {participantRows.map(
                (
                  participant
                ) => (
                  <div
                    key={
                      participant.id
                    }
                    className="tp-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-black text-[var(--tp-ink)]">
                          {
                            participant.full_name
                          }
                        </p>

                        <ThreepleBadge
                          tone={
                            participant.payment_status ===
                            "paid"
                              ? "success"
                              : "warning"
                          }
                        >
                          {participant.payment_status ===
                          "paid"
                            ? "Paid"
                            : "Outstanding"}
                        </ThreepleBadge>
                      </div>

                      <p className="mt-1 text-sm text-[var(--tp-muted)]">
                        {participant.phone ||
                          "No phone number"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="text-right">
                        <p className="text-xs text-[var(--tp-muted)]">
                          Expected
                        </p>

                        <p className="mt-1 font-black">
                          {money(
                            participant.expected_amount ??
                              collection.default_amount,
                            collection.currency
                          )}
                        </p>
                      </div>

                      <Link
                        href={`/collector/${collectionId}/record/${participant.id}`}
                        className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--tp-primary)] px-4 text-sm font-black text-white"
                      >
                        Record contribution
                      </Link>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </ThreepleAppShell>
  );
}

