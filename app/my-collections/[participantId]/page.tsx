import ParticipantControls from "./participant-controls";
import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  startParticipantPayment,
} from "./payment-actions";

export const instant = false;

type PageProps = {
  params: Promise<{
    participantId: string;
  }>;

  searchParams?: Promise<{
    payment?: string;
  }>;
};

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
    ).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function participationStyle(
  status: string,
  active: boolean
) {
  if (!active) {
    return "bg-neutral-200 text-neutral-600";
  }

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

function collectionStatusStyle(
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

function paymentMessage(
  code?: string
) {
  switch (code) {
    case "returned":
      return {
        type: "info",
        text:
          "You have returned from Paystack. Threeple will confirm the payment from Paystack before marking it as paid.",
      };
    case "already_paid":
      return {
        type: "info",
        text:
          "This contribution is already marked as paid.",
      };
    case "approval_required":
      return {
        type: "error",
        text:
          "The organizer must approve your participation before payment.",
      };
    case "settlement_not_ready":
      return {
        type: "error",
        text:
          "The organizer has not finished connecting a settlement account yet.",
      };
    case "collection_unavailable":
      return {
        type: "error",
        text:
          "This Collection is not currently accepting payments.",
      };
    case "participation_inactive":
      return {
        type: "error",
        text:
          "Your participation is not active, so payment cannot be started.",
      };
    case "email_required":
      return {
        type: "error",
        text:
          "A participant email address is required to start a Paystack payment.",
      };
    case "amount_unavailable":
    case "fee_invalid":
      return {
        type: "error",
        text:
          "Threeple could not determine a valid payment amount for this contribution.",
      };
    case "initialization_failed":
      return {
        type: "error",
        text:
          "Threeple could not start the Paystack checkout. Please try again.",
      };
    case "not_allowed":
      return {
        type: "error",
        text:
          "You do not have access to start payment for this participant record.",
      };
    default:
      return null;
  }
}

function paymentMessageStyle(
  type: string
) {
  if (
    type === "error"
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-blue-200 bg-blue-50 text-blue-700";
}

export default async function ParticipantCollectionPage({
  params,
  searchParams,
}: PageProps) {
  const {
    participantId,
  } = await params;

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
    data: participant,
    error: participantError,
  } = await supabase
    .from("participants")
    .select(`
      id,
      collection_id,
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
      "id",
      participantId
    )
    .eq(
      "user_id",
      userId
    )
    .maybeSingle();

  if (
    participantError ||
    !participant
  ) {
    notFound();
  }

  const {
    data: collection,
    error: collectionError,
  } = await supabase
    .from("collections")
    .select(`
      id,
      organization_id,
      title,
      description,
      collection_type,
      collection_mode,
      currency,
      target_amount,
      default_amount,
      deadline,
      visibility,
      access_mode,
      requires_approval,
      status,
      archived_at,
      created_at
    `)
    .eq(
      "id",
      participant.collection_id
    )
    .maybeSingle();

  if (
    collectionError ||
    !collection
  ) {
    notFound();
  }

  const {
    data: organization,
  } = await supabase
    .from("organizations")
    .select(`
      id,
      name,
      organization_type,
      settlement_status
    `)
    .eq(
      "id",
      collection.organization_id
    )
    .maybeSingle();

  const expectedAmount =
    participant.expected_amount !==
      null
      ? Number(
          participant.expected_amount
        )
      : collection.default_amount !==
          null
        ? Number(
            collection.default_amount
          )
        : null;

  const archived =
    Boolean(
      collection.archived_at
    );

  const requiresApproval =
    collection.requires_approval;

  const approvedForPayment =
    !requiresApproval ||
    participant.participation_status ===
      "approved";

  const paymentReady =
    collection.status ===
      "active" &&
    !archived &&
    participant.is_active &&
    approvedForPayment &&
    participant.payment_status !==
      "paid" &&
    expectedAmount !== null &&
    expectedAmount > 0 &&
    Boolean(
      participant.email
    ) &&
    organization?.settlement_status ===
      "active";

  const message =
    paymentMessage(
      query?.payment
    );

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link
            href="/my-collections"
          >
            <div className="text-2xl font-bold tracking-tight">
              Threeple
            </div>

            <p className="text-sm text-neutral-500">
              Collect. Coordinate. Track.
            </p>
          </Link>

          <Link
            href="/my-collections"
            className="text-sm font-medium text-neutral-600 hover:text-black"
          >
            ← My Collections
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        {message && (
          <div
            className={`mb-6 rounded-2xl border p-4 text-sm ${paymentMessageStyle(
              message.type
            )}`}
          >
            {message.text}
          </div>
        )}

        {archived && (
          <section className="mb-6 rounded-2xl border bg-neutral-100 p-5">
            <p className="font-semibold">
              This Collection is archived
            </p>

            <p className="mt-2 text-sm leading-6 text-neutral-600">
              The organizer has archived this Collection. Your historical participation record remains available.
            </p>
          </section>
        )}

        <section>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${collectionStatusStyle(
                collection.status
              )}`}
            >
              {friendlyText(
                collection.status
              )}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${participationStyle(
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

            {archived && (
              <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold text-white">
                Archived
              </span>
            )}
          </div>

          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
            My Collection
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            {collection.title}
          </h1>

          {collection.description && (
            <p className="mt-4 max-w-2xl leading-7 text-neutral-600">
              {collection.description}
            </p>
          )}
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border bg-white p-5">
            <p className="text-xs uppercase tracking-wide text-neutral-400">
              My Status
            </p>

            <p className="mt-3 text-lg font-semibold">
              {participant.is_active
                ? friendlyText(
                    participant.participation_status
                  )
                : "Inactive"}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Expected
            </p>

            <p className="mt-3 text-lg font-semibold">
              {formatMoney(
                expectedAmount,
                collection.currency
              )}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Contribution Status
            </p>

            <p className="mt-3 text-lg font-semibold">
              {friendlyText(
                participant.payment_status
              )}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <p className="text-xs uppercase tracking-wide text-neutral-400">
              Joined Via
            </p>

            <p className="mt-3 text-lg font-semibold">
              {friendlyText(
                participant.join_method
              )}
            </p>
          </div>
        </section>

        {participant.participation_status ===
          "approval_pending" &&
          participant.is_active && (
            <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="font-semibold text-amber-950">
                Awaiting organizer approval
              </h2>

              <p className="mt-2 text-sm leading-6 text-amber-800">
                The organizer must approve your participation before payment can be started.
              </p>
            </section>
          )}

        {participant.participation_status ===
          "declined" && (
            <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
              <h2 className="font-semibold text-red-900">
                Participation declined
              </h2>

              <p className="mt-2 text-sm leading-6 text-red-800">
                The organizer has not approved your participation in this Collection.
              </p>
            </section>
          )}

        {!participant.is_active && (
          <section className="mt-6 rounded-2xl border bg-neutral-100 p-5">
            <h2 className="font-semibold">
              Participation inactive
            </h2>

            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Your participant record is preserved, but your participation is not currently active.
            </p>
          </section>
        )}

        <section className="mt-8 rounded-3xl border bg-white p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Collection Details
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            About this Collection
          </h2>

          <div className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2">
            <div>
              <p className="text-xs text-neutral-400">
                Collection Type
              </p>

              <p className="mt-1 text-sm font-medium">
                {friendlyText(
                  collection.collection_type
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-neutral-400">
                Collection Mode
              </p>

              <p className="mt-1 text-sm font-medium">
                {friendlyText(
                  collection.collection_mode
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-neutral-400">
                Organizer
              </p>

              <p className="mt-1 text-sm font-medium">
                {organization?.name ??
                  "Threeple Organizer"}
              </p>
            </div>

            <div>
              <p className="text-xs text-neutral-400">
                Workspace Type
              </p>

              <p className="mt-1 text-sm font-medium">
                {friendlyText(
                  organization?.organization_type
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-neutral-400">
                Deadline
              </p>

              <p className="mt-1 text-sm font-medium">
                {collection.deadline
                  ? new Date(
                      collection.deadline
                    ).toLocaleString(
                      "en-NG"
                    )
                  : "No deadline"}
              </p>
            </div>

            <div>
              <p className="text-xs text-neutral-400">
                Access Type
              </p>

              <p className="mt-1 text-sm font-medium">
                {friendlyText(
                  collection.access_mode
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border bg-white p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            My Participation
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            Participant details
          </h2>

          <div className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2">
            <div>
              <p className="text-xs text-neutral-400">
                Name
              </p>

              <p className="mt-1 text-sm font-medium">
                {participant.full_name}
              </p>
            </div>

            <div>
              <p className="text-xs text-neutral-400">
                Email
              </p>

              <p className="mt-1 text-sm font-medium">
                {participant.email ||
                  "Not provided"}
              </p>
            </div>

            <div>
              <p className="text-xs text-neutral-400">
                Phone
              </p>

              <p className="mt-1 text-sm font-medium">
                {participant.phone ||
                  "Not provided"}
              </p>
            </div>

            <div>
              <p className="text-xs text-neutral-400">
                Joined
              </p>

              <p className="mt-1 text-sm font-medium">
                {new Date(
                  participant.created_at
                ).toLocaleString(
                  "en-NG"
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border bg-white p-6 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Contributions
              </p>

              <h2 className="mt-2 text-xl font-semibold">
                Pay contribution
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">
                Payments are processed by Paystack. The organizer receives settlement through their connected Paystack subaccount; Threeple does not hold the organizer&apos;s funds for later payout.
              </p>

              <p className="mt-4 text-2xl font-semibold">
                {formatMoney(
                  expectedAmount,
                  collection.currency
                )}
              </p>
            </div>

            {participant.payment_status ===
              "paid" ? (
              <span className="w-fit rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
                Paid
              </span>
            ) : paymentReady ? (
              <form
                action={
                  startParticipantPayment
                }
              >
                <input
                  type="hidden"
                  name="participant_id"
                  value={
                    participant.id
                  }
                />

                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-black px-6 text-sm font-semibold text-white hover:bg-neutral-800"
                >
                  Pay with Paystack
                </button>
              </form>
            ) : (
              <span className="w-fit rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700">
                Payment unavailable
              </span>
            )}
          </div>

          {!paymentReady &&
            participant.payment_status !==
              "paid" && (
              <div className="mt-5 rounded-2xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-600">
                {!participant.email
                  ? "Add an email address to this participant record before payment can begin."
                  : organization?.settlement_status !==
                      "active"
                    ? "The organizer must connect a settlement account before participant payments can begin."
                    : !approvedForPayment
                      ? "Organizer approval is required before payment."
                      : collection.status !==
                            "active" ||
                          archived
                        ? "This Collection is not currently accepting payments."
                        : "Payment is not currently available for this participation record."}
              </div>
            )}
        </section>
      </div>
    </main>
  );
}
