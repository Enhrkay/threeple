"use client";

import {
  useState,
} from "react";

import {
  startPayment,
} from "./actions";

type Props = {
  token: string;
  currency: string;
  remainingAmount: number | null;
  allowPartialPayments: boolean;
  requiresAmountChoice: boolean;
  hasEmail: boolean;
};

function formatMoney(
  amount: number,
  currency: string
) {
  return new Intl.NumberFormat(
    "en-NG",
    {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  ).format(amount);
}

export default function CheckoutForm({
  token,
  currency,
  remainingAmount,
  allowPartialPayments,
  requiresAmountChoice,
  hasEmail,
}: Props) {
  const [
    paymentMode,
    setPaymentMode,
  ] = useState<
    "full" | "partial"
  >("full");

  const [
    amount,
    setAmount,
  ] = useState("");

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    isStarting,
    setIsStarting,
  ] = useState(false);

  // For target/flexible Collections
  // with no fixed participant amount,
  // an amount must always be entered.
  const needsCustomAmount =
    requiresAmountChoice ||
    (
      allowPartialPayments &&
      paymentMode ===
        "partial"
    );

  async function handlePayment() {
    if (isStarting) {
      return;
    }

    setError("");

    if (
      !hasEmail &&
      !email.trim()
    ) {
      setError(
        "Enter your email address to continue."
      );

      return;
    }

    if (needsCustomAmount) {
      const numericAmount =
        Number(amount);

      if (
        !Number.isFinite(
          numericAmount
        ) ||
        numericAmount <= 0
      ) {
        setError(
          "Enter a valid payment amount."
        );

        return;
      }

      if (
        remainingAmount !==
          null &&
        numericAmount >
          remainingAmount
      ) {
        setError(
          `You cannot pay more than ${formatMoney(
            remainingAmount,
            currency
          )}.`
        );

        return;
      }
    }

    setIsStarting(true);

    try {
      const result =
        await startPayment(
          token,
          {
            amount:
              needsCustomAmount
                ? amount
                : undefined,

            email:
              hasEmail
                ? undefined
                : email,
          }
        );

      if (!result.success) {
        setError(
          result.error
        );

        return;
      }

      // Paystack returned this URL
      // from Threeple's server-side
      // transaction initialization.
      window.location.assign(
        result.authorizationUrl
      );
    } catch {
      setError(
        "Threeple could not start the payment. Please try again."
      );
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* EMAIL */}

      {!hasEmail && (
        <div>
          <label
            htmlFor="payer_email"
            className="mb-2 block text-sm font-medium"
          >
            Email address
          </label>

          <input
            id="payer_email"
            type="email"
            autoComplete="email"
            value={email}
            disabled={
              isStarting
            }
            onChange={(
              event
            ) =>
              setEmail(
                event.target.value
              )
            }
            placeholder="you@example.com"
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none transition focus:border-black disabled:bg-neutral-100"
          />

          <p className="mt-2 text-xs leading-5 text-neutral-500">
            Required for secure
            payment processing and
            transaction records.
          </p>
        </div>
      )}

      {/* CUSTOM CONTRIBUTION */}

      {requiresAmountChoice && (
        <div>
          <label
            htmlFor="payment_amount"
            className="mb-2 block text-sm font-medium"
          >
            Contribution amount
          </label>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
              ₦
            </span>

            <input
              id="payment_amount"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={amount}
              disabled={
                isStarting
              }
              onChange={(
                event
              ) =>
                setAmount(
                  event.target.value
                )
              }
              placeholder="0.00"
              className="w-full rounded-xl border border-neutral-300 py-3 pl-9 pr-4 text-lg font-semibold outline-none transition focus:border-black disabled:bg-neutral-100"
            />
          </div>

          <p className="mt-2 text-xs text-neutral-500">
            Enter how much you
            would like to
            contribute.
          </p>
        </div>
      )}

      {/* FULL / PARTIAL CHOICE */}

      {!requiresAmountChoice &&
        remainingAmount !==
          null &&
        allowPartialPayments && (
          <div>
            <p className="mb-3 text-sm font-medium">
              How would you like
              to pay?
            </p>

            <div className="grid gap-3 sm:grid-cols-2">

              <button
                type="button"
                disabled={
                  isStarting
                }
                onClick={() => {
                  setPaymentMode(
                    "full"
                  );

                  setAmount("");

                  setError("");
                }}
                className={`rounded-xl border p-4 text-left transition ${
                  paymentMode ===
                  "full"
                    ? "border-black bg-neutral-50"
                    : "border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                <span className="block text-sm font-semibold">
                  Pay full balance
                </span>

                <span className="mt-1 block text-sm text-neutral-500">
                  {formatMoney(
                    remainingAmount,
                    currency
                  )}
                </span>
              </button>

              <button
                type="button"
                disabled={
                  isStarting
                }
                onClick={() => {
                  setPaymentMode(
                    "partial"
                  );

                  setError("");
                }}
                className={`rounded-xl border p-4 text-left transition ${
                  paymentMode ===
                  "partial"
                    ? "border-black bg-neutral-50"
                    : "border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                <span className="block text-sm font-semibold">
                  Pay another
                  amount
                </span>

                <span className="mt-1 block text-sm text-neutral-500">
                  Make a partial
                  payment
                </span>
              </button>

            </div>
          </div>
        )}

      {/* PARTIAL AMOUNT */}

      {!requiresAmountChoice &&
        allowPartialPayments &&
        paymentMode ===
          "partial" && (
          <div>
            <label
              htmlFor="partial_amount"
              className="mb-2 block text-sm font-medium"
            >
              Amount to pay
            </label>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                ₦
              </span>

              <input
                id="partial_amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                max={
                  remainingAmount ??
                  undefined
                }
                value={amount}
                disabled={
                  isStarting
                }
                onChange={(
                  event
                ) =>
                  setAmount(
                    event.target.value
                  )
                }
                placeholder="0.00"
                className="w-full rounded-xl border border-neutral-300 py-3 pl-9 pr-4 text-lg font-semibold outline-none transition focus:border-black disabled:bg-neutral-100"
              />
            </div>

            {remainingAmount !==
              null && (
              <p className="mt-2 text-xs text-neutral-500">
                Maximum currently
                due:{" "}
                {formatMoney(
                  remainingAmount,
                  currency
                )}
              </p>
            )}
          </div>
        )}

      {/* ERROR */}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
        >
          {error}
        </div>
      )}

      {/* PAY BUTTON */}

      <button
        type="button"
        disabled={
          isStarting
        }
        onClick={
          handlePayment
        }
        className="inline-flex h-13 w-full items-center justify-center rounded-xl bg-black px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isStarting
          ? "Preparing secure payment..."
          : requiresAmountChoice ||
              paymentMode ===
                "partial"
            ? "Continue to Payment"
            : remainingAmount !==
                null
              ? `Pay ${formatMoney(
                  remainingAmount,
                  currency
                )}`
              : "Continue to Payment"}
      </button>

      <div className="text-center">
        <p className="text-xs leading-5 text-neutral-500">
          You will continue to
          Paystack's secure
          checkout to complete
          your payment.
        </p>
      </div>

    </div>
  );
}