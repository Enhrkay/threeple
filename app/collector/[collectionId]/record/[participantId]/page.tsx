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
} from "@/components/threeple/design-system";

import {
  recordFieldContribution,
} from "../../actions";

export const instant = false;

type PageProps = {
  params: Promise<{
    collectionId: string;
    participantId: string;
  }>;

  searchParams?: Promise<{
    result?: string;
  }>;
};

function money(
  value:
    | string
    | number
    | null,
  currency: string
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

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

function messageFor(
  value?: string
) {
  switch (value) {
    case "invalid_amount":
      return "Enter a valid amount greater than zero.";

    case "invalid_method":
      return "Choose a valid manual collection method.";

    case "participant_unavailable":
      return "This participant is no longer available for field collection.";

    case "record_failed":
      return "Threeple could not save this field contribution. Please check connectivity before trying again.";

    default:
      return null;
  }
}

export default async function RecordContributionPage({
  params,
  searchParams,
}: PageProps) {
  const {
    collectionId,
    participantId,
  } = await params;

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
        `/collector/${collectionId}/record/${participantId}`
      )}`
    );
  }

  const {
    data: collection,
  } = await supabaseAdmin
    .from("collections")
    .select(`
      id,
      title,
      organization_id,
      currency,
      default_amount,
      collection_mode,
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
    data: participant,
  } = await supabaseAdmin
    .from("participants")
    .select(`
      id,
      full_name,
      phone,
      expected_amount,
      payment_status,
      participation_status,
      is_active
    `)
    .eq(
      "id",
      participantId
    )
    .eq(
      "collection_id",
      collectionId
    )
    .eq(
      "is_active",
      true
    )
    .maybeSingle();

  if (!participant) {
    notFound();
  }

  const suggestedAmount =
    participant.expected_amount ??
    collection.default_amount;

  const errorMessage =
    messageFor(
      query?.result
    );

  return (
    <ThreepleAppShell
      title="Record Contribution"
      subtitle={collection.title}
      status={
        <ThreepleBadge tone="warning">
          Manual record
        </ThreepleBadge>
      }
    >
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/collector/${collectionId}`}
          className="text-sm font-black text-[var(--tp-primary)]"
        >
          Back to members
        </Link>

        <section className="tp-card mt-5 p-6 sm:p-8">
          <p className="tp-kicker">
            Collecting from
          </p>

          <h1 className="tp-heading mt-2 text-3xl">
            {participant.full_name}
          </h1>

          <p className="mt-2 text-sm text-[var(--tp-muted)]">
            {participant.phone ||
              "No phone number"}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-[var(--tp-bg-soft)] p-5">
              <p className="tp-kicker">
                Expected
              </p>

              <p className="mt-2 text-xl font-black">
                {money(
                  suggestedAmount,
                  collection.currency
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-[var(--tp-bg-soft)] p-5">
              <p className="tp-kicker">
                Electronic status
              </p>

              <p className="mt-2 font-black">
                {participant.payment_status ===
                "paid"
                  ? "Paid"
                  : "Not verified paid"}
              </p>
            </div>
          </div>
        </section>

        <ThreepleAlert
          tone="warning"
          className="mt-5"
        >
          This records a field/manual contribution. It does not create a Paystack payment and does not mark the participant as electronically verified paid.
        </ThreepleAlert>

        {errorMessage && (
          <ThreepleAlert
            tone="danger"
            className="mt-5"
          >
            {errorMessage}
          </ThreepleAlert>
        )}

        <section className="tp-card mt-5 p-6 sm:p-8">
          <form
            action={
              recordFieldContribution
            }
            className="space-y-5"
          >
            <input
              type="hidden"
              name="collection_id"
              value={
                collectionId
              }
            />

            <input
              type="hidden"
              name="participant_id"
              value={
                participantId
              }
            />

            <input
              type="hidden"
              name="device_event_id"
              value=""
            />

            <input
              type="hidden"
              name="local_recorded_at"
              value=""
            />

            <div>
              <label
                htmlFor="amount"
                className="mb-2 block text-sm font-black"
              >
                Amount collected
              </label>

              <input
                id="amount"
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                required
                defaultValue={
                  suggestedAmount
                    ? Number(
                        suggestedAmount
                      )
                    : undefined
                }
                inputMode="decimal"
                className="tp-input text-lg font-black"
                placeholder="0.00"
              />
            </div>

            <div>
              <label
                htmlFor="payment_method"
                className="mb-2 block text-sm font-black"
              >
                How was it collected?
              </label>

              <select
                id="payment_method"
                name="payment_method"
                required
                defaultValue="cash"
                className="tp-select"
              >
                <option value="cash">
                  Cash
                </option>

                <option value="bank_transfer_manual">
                  Bank transfer — manually confirmed
                </option>

                <option value="pos_manual">
                  POS — manually confirmed
                </option>

                <option value="other_manual">
                  Other manual method
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="note"
                className="mb-2 block text-sm font-black"
              >
                Note
                <span className="ml-1 font-normal text-[var(--tp-muted)]">
                  optional
                </span>
              </label>

              <textarea
                id="note"
                name="note"
                rows={3}
                maxLength={500}
                className="tp-textarea"
                placeholder="e.g. Week 4 contribution collected at Wuse Market."
              />
            </div>

            <div className="rounded-2xl bg-[var(--tp-success-soft)] p-5">
              <p className="font-black text-[var(--tp-success)]">
                What happens next
              </p>

              <p className="mt-2 text-sm leading-6 text-[var(--tp-success)]">
                Because you are online, this field event will save directly as Synced and Threeple will generate a receipt immediately.
              </p>
            </div>

            <button
              type="submit"
              className="tp-btn tp-btn-primary min-h-12 w-full"
            >
              Record contribution & issue receipt
            </button>
          </form>
        </section>
      </div>
    </ThreepleAppShell>
  );
}
