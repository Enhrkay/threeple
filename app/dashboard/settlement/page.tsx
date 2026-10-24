import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  getPaystackBanks,
} from "@/lib/payments/paystack";

import {
  connectSettlementAccount,
} from "./actions";

export const instant = false;

type PageProps = {
  searchParams?: Promise<{
    organizationId?: string;
    result?: string;
  }>;
};

function resultMessage(
  result?: string
) {
  switch (result) {
    case "connected":
      return {
        type: "success",
        text:
          "Settlement account connected successfully.",
      };

    case "already_connected":
      return {
        type: "info",
        text:
          "This organization already has an active settlement account.",
      };

    case "invalid_bank_details":
      return {
        type: "error",
        text:
          "Enter a valid bank and 10-digit Nigerian account number.",
      };

    case "not_allowed":
      return {
        type: "error",
        text:
          "Only the organization owner can configure settlement.",
      };

    case "connection_failed":
      return {
        type: "error",
        text:
          "Threeple could not connect this settlement account. Check the bank details and try again.",
      };

    default:
      return null;
  }
}

function messageStyle(
  type: string
) {
  if (
    type === "success"
  ) {
    return "border-green-200 bg-green-50 text-green-800";
  }

  if (
    type === "error"
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-blue-200 bg-blue-50 text-blue-700";
}

export default async function SettlementPage({
  searchParams,
}: PageProps) {
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
      "/auth/login"
    );
  }

  const {
    data: organizations,
    error: organizationError,
  } = await supabase
    .from("organizations")
    .select(`
      id,
      name,
      owner_id,
      settlement_provider,
      settlement_subaccount_code,
      settlement_bank_code,
      settlement_account_name,
      settlement_account_last4,
      settlement_currency,
      settlement_status,
      settlement_configured_at
    `)
    .eq(
      "owner_id",
      userId
    )
    .order(
      "created_at",
      {
        ascending: true,
      }
    );

  if (organizationError) {
    throw new Error(
      "Threeple could not load your organizations."
    );
  }

  const ownedOrganizations =
    organizations ?? [];

  if (
    ownedOrganizations.length ===
    0
  ) {
    return (
      <main className="min-h-screen bg-neutral-50 px-6 py-12 text-neutral-900">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-neutral-500"
          >
            ← Dashboard
          </Link>

          <section className="mt-6 rounded-3xl border bg-white p-8">
            <h1 className="text-2xl font-semibold">
              No organization found
            </h1>

            <p className="mt-3 text-neutral-600">
              Create an organizer workspace before configuring settlement.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const selectedOrganization =
    ownedOrganizations.find(
      (organization) =>
        organization.id ===
        query?.organizationId
    ) ??
    ownedOrganizations[0];

  let banks: Awaited<
    ReturnType<
      typeof getPaystackBanks
    >
  > = [];

  let bankLoadFailed =
    false;

  if (
    selectedOrganization.settlement_status !==
      "active"
  ) {
    try {
      banks =
        await getPaystackBanks();
    } catch (error) {
      console.error(
        "PAYSTACK_BANK_LIST_FAILED",
        error
      );

      bankLoadFailed =
        true;
    }
  }

  const message =
    resultMessage(
      query?.result
    );

  const isConnected =
    selectedOrganization.settlement_status ===
      "active" &&
    Boolean(
      selectedOrganization.settlement_subaccount_code
    );

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <div>
            <Link
              href="/dashboard"
              className="text-2xl font-bold tracking-tight"
            >
              Threeple
            </Link>

            <p className="text-sm text-neutral-500">
              Organizer Settlement
            </p>
          </div>

          <Link
            href="/dashboard"
            className="text-sm font-medium text-neutral-600"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Payments
          </p>

          <h1 className="mt-2 text-3xl font-semibold">
            Settlement Account
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-neutral-600">
            Connect the bank account where Paystack should settle your share of Threeple payments. Threeple does not hold your settlement funds.
          </p>
        </div>

        {message && (
          <div
            className={`mt-6 rounded-2xl border p-4 text-sm ${messageStyle(
              message.type
            )}`}
          >
            {message.text}
          </div>
        )}

        {ownedOrganizations.length >
          1 && (
          <section className="mt-8 rounded-2xl border bg-white p-5">
            <p className="text-sm font-semibold">
              Organization
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {ownedOrganizations.map(
                (organization) => (
                  <Link
                    key={
                      organization.id
                    }
                    href={`/dashboard/settlement?organizationId=${organization.id}`}
                    className={
                      organization.id ===
                      selectedOrganization.id
                        ? "rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
                        : "rounded-xl border px-4 py-2 text-sm font-semibold"
                    }
                  >
                    {organization.name}
                  </Link>
                )
              )}
            </div>
          </section>
        )}

        <section className="mt-8 rounded-3xl border bg-white p-6 md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Organization
              </p>

              <h2 className="mt-2 text-xl font-semibold">
                {
                  selectedOrganization.name
                }
              </h2>
            </div>

            <span
              className={
                isConnected
                  ? "w-fit rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"
                  : "w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700"
              }
            >
              {isConnected
                ? "Connected"
                : "Not connected"}
            </span>
          </div>

          {isConnected ? (
            <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5">
              <p className="font-semibold text-green-950">
                Settlement ready
              </p>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-green-700">
                    Account Name
                  </p>

                  <p className="mt-1 font-semibold text-green-950">
                    {selectedOrganization.settlement_account_name ||
                      "Verified account"}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-green-700">
                    Account
                  </p>

                  <p className="mt-1 font-semibold text-green-950">
                    ••••••{
                      selectedOrganization.settlement_account_last4 ||
                      "----"
                    }
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-green-700">
                    Provider
                  </p>

                  <p className="mt-1 font-semibold text-green-950">
                    Paystack
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-green-700">
                    Currency
                  </p>

                  <p className="mt-1 font-semibold text-green-950">
                    {selectedOrganization.settlement_currency ||
                      "NGN"}
                  </p>
                </div>
              </div>

              <p className="mt-5 text-sm leading-6 text-green-800">
                Participant payments can now be initialized against this Paystack subaccount so the organizer share is settled by the payment provider rather than held by Threeple.
              </p>
            </div>
          ) : (
            <>
              {bankLoadFailed ? (
                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                  Threeple could not load the Paystack bank list. Confirm that PAYSTACK_SECRET_KEY is present in .env.local and restart the development server.
                </div>
              ) : (
                <form
                  action={
                    connectSettlementAccount
                  }
                  className="mt-6 space-y-5"
                >
                  <input
                    type="hidden"
                    name="organization_id"
                    value={
                      selectedOrganization.id
                    }
                  />

                  <div>
                    <label
                      htmlFor="bank_code"
                      className="mb-2 block text-sm font-medium"
                    >
                      Bank
                    </label>

                    <select
                      id="bank_code"
                      name="bank_code"
                      required
                      defaultValue=""
                      className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3"
                    >
                      <option
                        value=""
                        disabled
                      >
                        Select bank
                      </option>

                      {banks.map(
                        (bank) => (
                          <option
                            key={
                              bank.code
                            }
                            value={
                              bank.code
                            }
                          >
                            {bank.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="account_number"
                      className="mb-2 block text-sm font-medium"
                    >
                      Account Number
                    </label>

                    <input
                      id="account_number"
                      name="account_number"
                      inputMode="numeric"
                      maxLength={10}
                      minLength={10}
                      pattern="[0-9]{10}"
                      required
                      placeholder="0123456789"
                      autoComplete="off"
                      className="w-full rounded-xl border border-neutral-300 px-4 py-3"
                    />

                    <p className="mt-2 text-xs leading-5 text-neutral-500">
                      The full account number is sent directly to Paystack to create the settlement subaccount. Threeple retains only masked settlement information.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="inline-flex h-12 items-center justify-center rounded-xl bg-black px-6 text-sm font-semibold text-white hover:bg-neutral-800"
                  >
                    Connect Settlement Account
                  </button>
                </form>
              )}
            </>
          )}
        </section>

        <section className="mt-6 rounded-2xl bg-neutral-950 p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Settlement Model
          </p>

          <h2 className="mt-2 text-lg font-semibold">
            Paystack settles the money
          </h2>

          <p className="mt-2 text-sm leading-6 text-neutral-300">
            Threeple records the transaction and its platform fee, but organizer funds are not stored in a Threeple wallet for later manual payout.
          </p>
        </section>
      </div>
    </main>
  );
}
