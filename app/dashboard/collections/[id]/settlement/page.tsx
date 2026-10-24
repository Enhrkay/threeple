import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  listNigeriaBanks,
} from "@/lib/paystack/server";

import AccountForm from "./account-form";

export const instant = false;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SettlementPage({
  params,
}: PageProps) {
  const { id } =
    await params;

  const supabase =
    await createClient();

  // =======================================================
  // AUTHENTICATION
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
      title,
      collection_type,
      collection_mode,
      organization_id,
      status
    `)
    .eq("id", id)
    .maybeSingle();

  if (
    collectionError ||
    !collection
  ) {
    notFound();
  }

  // =======================================================
  // OWNER CHECK
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
    .eq(
      "owner_id",
      userId
    )
    .maybeSingle();

  if (!organization) {
    notFound();
  }

  // =======================================================
  // BANK LIST
  // =======================================================

  let banks:
    {
      id: number;
      name: string;
      code: string;
    }[] = [];

  let bankListUnavailable =
    false;

  try {
    const paystackBanks =
      await listNigeriaBanks();

    banks =
      paystackBanks.map(
        (bank) => ({
          id: bank.id,
          name: bank.name,
          code: bank.code,
        })
      );
  } catch (error) {
    console.error(
      "SETTLEMENT_BANK_LIST_FAILED",
      {
        collectionId:
          collection.id,
      }
    );

    bankListUnavailable =
      true;
  }

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">

      {/* HEADER */}

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
              Collect. Coordinate.
              Track.
            </p>
          </div>

          <Link
            href={`/dashboard/collections/${collection.id}`}
            className="text-sm font-medium text-neutral-600 hover:text-black"
          >
            ← Back to Collection
          </Link>
        </div>
      </header>

      {/* CONTENT */}

      <div className="mx-auto max-w-2xl px-6 py-10">

        <section>
          <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
            Settlement
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Connect settlement account
          </h1>

          <p className="mt-3 leading-7 text-neutral-600">
            Verify the bank account
            that will eventually
            receive contributions
            collected for{" "}
            <strong>
              {collection.title}
            </strong>
            .
          </p>
        </section>

        {/* SECURITY MESSAGE */}

        <section className="mt-6 rounded-2xl border bg-white p-5">
          <h2 className="font-semibold">
            Threeple does not hold
            your Collection funds.
          </h2>

          <p className="mt-2 text-sm leading-6 text-neutral-500">
            Bank details are sent
            securely from the
            Threeple server to the
            payment provider for
            verification. We are
            currently verifying the
            beneficiary only. No
            payment or settlement
            is created at this
            stage.
          </p>
        </section>

        {/* FORM */}

        <section className="mt-8 rounded-3xl border bg-white p-6 md:p-8">
          <div className="mb-7">
            <h2 className="text-lg font-semibold">
              Beneficiary bank
              account
            </h2>

            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Enter the account
              number first. Once
              all 10 digits are
              entered, search for
              the bank and select
              it to verify the
              account.
            </p>
          </div>

          {bankListUnavailable ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
            >
              Threeple could not
              load the supported
              Nigerian banks from
              the payment provider.
              Please try again
              later.
            </div>
          ) : (
            <AccountForm
              collectionId={
                collection.id
              }
              banks={banks}
            />
          )}
        </section>

        {/* CURRENT STAGE */}

        <section className="mt-6 rounded-2xl bg-neutral-100 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Current settlement
            stage
          </p>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex gap-3">
              <span className="font-semibold">
                1.
              </span>

              <span>
                Verify beneficiary
                bank account
              </span>
            </div>

            <div className="flex gap-3 text-neutral-400">
              <span className="font-semibold">
                2.
              </span>

              <span>
                Confirm beneficiary
              </span>
            </div>

            <div className="flex gap-3 text-neutral-400">
              <span className="font-semibold">
                3.
              </span>

              <span>
                Connect Paystack
                settlement
              </span>
            </div>

            <div className="flex gap-3 text-neutral-400">
              <span className="font-semibold">
                4.
              </span>

              <span>
                Save settlement
                profile
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
