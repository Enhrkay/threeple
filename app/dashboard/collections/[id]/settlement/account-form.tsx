"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  connectSettlementAccount,
  resolveSettlementAccount,
} from "./actions";

type Bank = {
  id: number;
  name: string;
  code: string;
};

type Props = {
  collectionId: string;
  banks: Bank[];
};

type VerifiedAccount = {
  accountName: string;
  bankName: string;
  bankCode: string;
  last4: string;
};

type ConnectedSettlement = {
  accountName: string;
  bankName: string;
  last4: string;
  providerReference: string;
  verificationStatus: string;
};

export default function AccountForm({
  collectionId,
  banks,
}: Props) {
  const [
    accountNumber,
    setAccountNumber,
  ] = useState("");

  const [
    bankSearch,
    setBankSearch,
  ] = useState("");

  const [
    selectedBank,
    setSelectedBank,
  ] =
    useState<Bank | null>(
      null
    );

  const [
    verifiedAccount,
    setVerifiedAccount,
  ] =
    useState<VerifiedAccount | null>(
      null
    );

  const [
    connectedSettlement,
    setConnectedSettlement,
  ] =
    useState<ConnectedSettlement | null>(
      null
    );

  const [
    error,
    setError,
  ] = useState("");

  const [
    isVerifying,
    setIsVerifying,
  ] = useState(false);

  const [
    isConnecting,
    setIsConnecting,
  ] = useState(false);

  // =======================================================
  // ACCOUNT NUMBER
  // =======================================================

  const cleanAccountNumber =
    accountNumber.replace(
      /\D/g,
      ""
    );

  const accountNumberValid =
    cleanAccountNumber.length ===
    10;

  // =======================================================
  // SEARCH BANKS
  // =======================================================

  const filteredBanks =
    useMemo(() => {
      const search =
        bankSearch
          .trim()
          .toLowerCase();

      if (!search) {
        return banks;
      }

      return banks.filter(
        (bank) =>
          bank.name
            .toLowerCase()
            .includes(search)
      );
    }, [
      bankSearch,
      banks,
    ]);

  // =======================================================
  // ACCOUNT NUMBER CHANGE
  // =======================================================

  function handleAccountChange(
    value: string
  ) {
    const digits =
      value
        .replace(/\D/g, "")
        .slice(0, 10);

    setAccountNumber(
      digits
    );

    setBankSearch("");
    setSelectedBank(null);
    setVerifiedAccount(null);
    setConnectedSettlement(null);
    setError("");
  }

  // =======================================================
  // BANK SELECT + ACCOUNT VERIFY
  // =======================================================

  async function handleBankSelect(
    bank: Bank
  ) {
    if (
      !accountNumberValid ||
      isVerifying ||
      isConnecting
    ) {
      return;
    }

    setSelectedBank(bank);

    setBankSearch(
      bank.name
    );

    setVerifiedAccount(null);

    setError("");

    setIsVerifying(true);

    try {
      const result =
        await resolveSettlementAccount(
          collectionId,
          cleanAccountNumber,
          bank.code
        );

      if (!result.success) {
        setError(
          result.error
        );

        return;
      }

      setVerifiedAccount({
        accountName:
          result.accountName,

        bankName:
          bank.name,

        bankCode:
          result.bankCode,

        last4:
          result.last4,
      });
    } catch {
      setError(
        "Threeple could not complete bank verification."
      );
    } finally {
      setIsVerifying(false);
    }
  }

  // =======================================================
  // CHOOSE ANOTHER BANK
  // =======================================================

  function chooseAnotherBank() {
    setSelectedBank(null);

    setBankSearch("");

    setVerifiedAccount(null);

    setError("");
  }

  // =======================================================
  // CONFIRM + CONNECT PAYSTACK SUBACCOUNT
  // =======================================================

  async function connectBeneficiary() {
    if (
      !verifiedAccount ||
      !accountNumberValid ||
      isConnecting
    ) {
      return;
    }

    setError("");

    setIsConnecting(true);

    try {
      const result =
        await connectSettlementAccount(
          collectionId,
          cleanAccountNumber,
          verifiedAccount.bankCode
        );

      if (!result.success) {
        setError(
          result.error
        );

        return;
      }

      setConnectedSettlement({
        accountName:
          result.accountName,

        bankName:
          result.bankName,

        last4:
          result.last4,

        providerReference:
          result.providerReference,

        verificationStatus:
          result.verificationStatus,
      });

      // Remove the full account number
      // from React state after successful connection.
      setAccountNumber("");

      setBankSearch("");

      setSelectedBank(null);

      setVerifiedAccount(null);
    } catch {
      setError(
        "Threeple could not connect the settlement account."
      );
    } finally {
      setIsConnecting(false);
    }
  }

  // =======================================================
  // SUCCESS
  // =======================================================

  if (connectedSettlement) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6">

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 font-bold text-green-700">
          ✓
        </div>

        <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-green-700">
          Settlement connected
        </p>

        <h3 className="mt-2 text-xl font-semibold">
          {
            connectedSettlement.accountName
          }
        </h3>

        <div className="mt-6 space-y-4 rounded-xl bg-white p-5">

          <div className="flex justify-between gap-6">
            <span className="text-sm text-neutral-500">
              Bank
            </span>

            <span className="text-right text-sm font-medium">
              {
                connectedSettlement.bankName
              }
            </span>
          </div>

          <div className="flex justify-between gap-6">
            <span className="text-sm text-neutral-500">
              Account
            </span>

            <span className="font-mono text-sm font-semibold">
              ••••••
              {
                connectedSettlement.last4
              }
            </span>
          </div>

          <div className="flex justify-between gap-6">
            <span className="text-sm text-neutral-500">
              Paystack reference
            </span>

            <span className="font-mono text-xs font-semibold">
              {
                connectedSettlement.providerReference
              }
            </span>
          </div>

          <div className="flex justify-between gap-6">
            <span className="text-sm text-neutral-500">
              Status
            </span>

            <span className="text-right text-sm font-medium text-green-700">
              {
                connectedSettlement.verificationStatus
                  .replaceAll(
                    "_",
                    " "
                  )
              }
            </span>
          </div>

        </div>

        <p className="mt-5 text-sm leading-6 text-neutral-600">
          The beneficiary is now
          connected to Paystack.
          Threeple has retained only
          the masked bank information
          and provider settlement
          reference.
        </p>

      </div>
    );
  }

  return (
    <div className="space-y-7">

      {/* ACCOUNT NUMBER */}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label
            htmlFor="account_number"
            className="text-sm font-medium"
          >
            Account number
          </label>

          <span className="text-xs text-neutral-400">
            Step 1
          </span>
        </div>

        <input
          id="account_number"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={10}
          value={
            accountNumber
          }
          disabled={
            isVerifying ||
            isConnecting
          }
          onChange={(
            event
          ) =>
            handleAccountChange(
              event.target.value
            )
          }
          placeholder="Enter 10-digit account number"
          className="w-full rounded-xl border border-neutral-300 px-4 py-3 font-mono text-lg tracking-wider outline-none transition focus:border-black disabled:bg-neutral-100"
        />

        {accountNumber.length >
          0 &&
          !accountNumberValid && (
            <p className="mt-2 text-sm text-amber-700">
              Enter all 10 digits
              to continue.
            </p>
          )}

        {accountNumberValid && (
          <div className="mt-3 flex items-center gap-2 text-sm text-green-700">

            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-xs font-bold">
              ✓
            </span>

            Valid 10-digit
            account number

          </div>
        )}
      </div>

      {/* BANK */}

      {accountNumberValid && (
        <div>

          <div className="mb-2 flex items-center justify-between">

            <label
              htmlFor="bank_search"
              className="text-sm font-medium"
            >
              Select your bank
            </label>

            <span className="text-xs text-neutral-400">
              Step 2
            </span>

          </div>

          <div className="relative">

            <input
              id="bank_search"
              type="text"
              autoComplete="off"
              value={
                bankSearch
              }
              disabled={
                isVerifying ||
                isConnecting
              }
              onChange={(
                event
              ) => {
                setBankSearch(
                  event.target.value
                );

                setSelectedBank(
                  null
                );

                setVerifiedAccount(
                  null
                );

                setError("");
              }}
              placeholder="Search for your bank"
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none transition focus:border-black disabled:bg-neutral-100"
            />

            {!selectedBank &&
              !isVerifying &&
              !isConnecting && (
                <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-lg">

                  {filteredBanks.length >
                  0 ? (
                    filteredBanks
                      .slice(
                        0,
                        40
                      )
                      .map(
                        (
                          bank
                        ) => (
                          <button
                            key={`${bank.id}-${bank.code}`}
                            type="button"
                            onClick={() =>
                              handleBankSelect(
                                bank
                              )
                            }
                            className="flex w-full items-center justify-between border-b border-neutral-100 px-4 py-3 text-left text-sm last:border-b-0 hover:bg-neutral-50"
                          >
                            <span className="font-medium">
                              {
                                bank.name
                              }
                            </span>

                            <span className="text-xs text-neutral-400">
                              Select
                            </span>
                          </button>
                        )
                      )
                  ) : (
                    <p className="px-4 py-4 text-sm text-neutral-500">
                      No bank found.
                    </p>
                  )}

                </div>
              )}

          </div>
        </div>
      )}

      {/* VERIFYING */}

      {isVerifying && (
        <div className="rounded-2xl border bg-neutral-50 p-5">

          <div className="flex items-center gap-3">

            <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-black" />

            <div>
              <p className="text-sm font-medium">
                Verifying account
              </p>

              <p className="mt-1 text-xs text-neutral-500">
                Threeple is checking
                this account with
                Paystack.
              </p>
            </div>

          </div>

        </div>
      )}

      {/* CONNECTING */}

      {isConnecting && (
        <div className="rounded-2xl border bg-neutral-50 p-5">

          <div className="flex items-center gap-3">

            <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-black" />

            <div>
              <p className="text-sm font-medium">
                Connecting settlement
              </p>

              <p className="mt-1 text-xs text-neutral-500">
                Threeple is securely
                connecting this
                beneficiary to Paystack.
              </p>
            </div>

          </div>

        </div>
      )}

      {/* ERROR */}

      {error &&
        !isVerifying &&
        !isConnecting && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
          >
            {error}

            {selectedBank && (
              <button
                type="button"
                onClick={
                  chooseAnotherBank
                }
                className="mt-3 block font-medium underline"
              >
                Choose another bank
              </button>
            )}
          </div>
        )}

      {/* VERIFIED */}

      {verifiedAccount &&
        !isVerifying &&
        !isConnecting && (
          <>
            <div className="overflow-hidden rounded-2xl border border-green-200">

              <div className="bg-green-50 p-5">

                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 font-bold text-green-700">
                  ✓
                </div>

                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-green-700">
                  Account verified
                </p>

                <h3 className="mt-2 text-xl font-semibold">
                  {
                    verifiedAccount.accountName
                  }
                </h3>

              </div>

              <div className="space-y-4 bg-white p-5">

                <div className="flex justify-between gap-6">
                  <span className="text-sm text-neutral-500">
                    Bank
                  </span>

                  <span className="text-right text-sm font-medium">
                    {
                      verifiedAccount.bankName
                    }
                  </span>
                </div>

                <div className="flex justify-between gap-6">
                  <span className="text-sm text-neutral-500">
                    Account
                  </span>

                  <span className="font-mono text-sm font-semibold">
                    ••••••
                    {
                      verifiedAccount.last4
                    }
                  </span>
                </div>

              </div>

            </div>

            {/* CONFIRM */}

            <div className="rounded-2xl border bg-white p-5">

              <div className="flex items-center justify-between">

                <h3 className="font-semibold">
                  Is this the correct
                  beneficiary?
                </h3>

                <span className="text-xs text-neutral-400">
                  Step 3
                </span>

              </div>

              <p className="mt-2 text-sm leading-6 text-neutral-500">
                Confirm that this
                is the account that
                should receive
                settlement for the
                Collection.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">

                <button
                  type="button"
                  onClick={
                    connectBeneficiary
                  }
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-medium text-white transition hover:bg-neutral-800"
                >
                  Yes, connect this
                  account
                </button>

                <button
                  type="button"
                  onClick={
                    chooseAnotherBank
                  }
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-neutral-300 px-5 text-sm font-medium transition hover:bg-neutral-50"
                >
                  No, choose another
                  bank
                </button>

              </div>

            </div>
          </>
        )}

    </div>
  );
}