import { hasCollectorOrganizationAccess } from "@/lib/collector/access";
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
  ThreepleBadge,
} from "@/components/threeple/design-system";

export const instant = false;

type PageProps = {
  params: Promise<{
    collectionId: string;
    eventId: string;
  }>;
};

function money(
  value:
    | string
    | number,
  currency: string
) {
  return new Intl.NumberFormat(
    "en-NG",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }
  ).format(
    Number(value)
  );
}

function friendlyMethod(
  value: string
) {
  return value
    .replaceAll(
      "_manual",
      ""
    )
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
}

export default async function FieldReceiptPage({
  params,
}: PageProps) {
  const {
    collectionId,
    eventId,
  } = await params;

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
        `/collector/${collectionId}/receipts/${eventId}`
      )}`
    );
  }

  const {
    data: event,
  } = await supabaseAdmin
    .from(
      "field_contribution_events"
    )
    .select(`
      id,
      receipt_reference,
      collection_id,
      participant_id,
      collector_user_id,
      amount,
      currency,
      payment_method,
      lifecycle_status,
      local_recorded_at,
      server_synced_at,
      note,
      created_at
    `)
    .eq(
      "id",
      eventId
    )
    .eq(
      "collection_id",
      collectionId
    )
    .maybeSingle();

  if (!event) {
    notFound();
  }

  const {
    data: collection,
  } = await supabaseAdmin
    .from("collections")
    .select(`
      id,
      title,
      organization_id
    `)
    .eq(
      "id",
      collectionId
    )
    .maybeSingle();

  if (!collection) {
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
    userId ||
    event.collector_user_id ===
    userId;

  if (!allowed) {

    allowed =

      await hasCollectorOrganizationAccess(

        userId,

        organization.id

      );

  }


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

    allowed =

      await hasCollectorOrganizationAccess(

        userId,

        organization.id

      );

  }


  if (!allowed) {
    notFound();
  }

  const {
    data: participant,
  } = await supabaseAdmin
    .from("participants")
    .select(`
      full_name,
      phone
    `)
    .eq(
      "id",
      event.participant_id
    )
    .maybeSingle();

  if (!participant) {
    notFound();
  }

  const recordedAt =
    new Intl.DateTimeFormat(
      "en-NG",
      {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone:
          "Africa/Lagos",
      }
    ).format(
      new Date(
        event.local_recorded_at
      )
    );

  return (
    <ThreepleAppShell
      title="Contribution Receipt"
      subtitle={collection.title}
      status={
        <ThreepleBadge tone="success">
          Synced
        </ThreepleBadge>
      }
    >
      <div className="mx-auto max-w-xl">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] shadow-[var(--tp-shadow-md)]">
          <div className="bg-[var(--tp-primary)] p-6 text-white sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-white/50">
              Threeple field receipt
            </p>

            <p className="mt-3 font-mono text-sm font-black tracking-wider text-white/70">
              {event.receipt_reference}
            </p>

            <p className="mt-6 text-4xl font-black tracking-tight">
              {money(
                event.amount,
                event.currency
              )}
            </p>

            <p className="mt-2 text-sm text-white/65">
              Recorded for{" "}
              <span className="font-black text-white">
                {participant.full_name}
              </span>
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="tp-kicker">
                  Collection
                </p>

                <p className="mt-2 font-black">
                  {collection.title}
                </p>
              </div>

              <div>
                <p className="tp-kicker">
                  Organizer
                </p>

                <p className="mt-2 font-black">
                  {organization.name}
                </p>
              </div>

              <div>
                <p className="tp-kicker">
                  Method
                </p>

                <p className="mt-2 font-black">
                  {friendlyMethod(
                    event.payment_method
                  )}
                </p>
              </div>

              <div>
                <p className="tp-kicker">
                  Recorded
                </p>

                <p className="mt-2 font-black">
                  {recordedAt}
                </p>
              </div>
            </div>

            {event.note && (
              <div className="mt-6 rounded-2xl bg-[var(--tp-bg-soft)] p-5">
                <p className="tp-kicker">
                  Note
                </p>

                <p className="mt-2 text-sm leading-6 text-[var(--tp-ink-soft)]">
                  {event.note}
                </p>
              </div>
            )}

            <div className="mt-6 rounded-2xl border border-[var(--tp-success-border)] bg-[var(--tp-success-soft)] p-5">
              <p className="font-black text-[var(--tp-success)]">
                Synced to Threeple
              </p>

              <p className="mt-2 text-sm leading-6 text-[var(--tp-success)]">
                This receipt confirms a manual field contribution record. It is not a Paystack transaction or electronically verified payment.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link
                href={`/collector/${collectionId}`}
                className="tp-btn tp-btn-primary"
              >
                Back to members
              </Link>

              <Link
                href={`/collector/${collectionId}/record/${event.participant_id}`}
                className="tp-btn tp-btn-secondary"
              >
                Record another
              </Link>
            </div>
          </div>
        </section>
      </div>
    </ThreepleAppShell>
  );
}



