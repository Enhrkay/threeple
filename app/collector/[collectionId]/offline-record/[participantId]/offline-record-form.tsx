"use client";

import {
  useState,
} from "react";

import {
  createDeviceEventId,
  createOfflineReceiptReference,
  saveOfflineFieldEvent,
} from "@/lib/collector/offline-queue";

type Props = {
  collectionId: string;
  collectionTitle: string;
  participantId: string;
  participantName: string;
  currency: string;
  suggestedAmount:
    | number
    | string
    | null;
};

function money(
  value:
    | number
    | string
    | null,
  currency: string
) {
  if (
    value === null ||
    value === undefined
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
    Number(value)
  );
}

export default function OfflineRecordForm({
  collectionId,
  collectionTitle,
  participantId,
  participantName,
  currency,
  suggestedAmount,
}: Props) {
  const [
    amount,
    setAmount,
  ] = useState(
    suggestedAmount
      ? String(
          suggestedAmount
        )
      : ""
  );

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState<
    | "cash"
    | "bank_transfer_manual"
    | "pos_manual"
    | "other_manual"
  >("cash");

  const [
    note,
    setNote,
  ] = useState("");

  const [
    savedReceipt,
    setSavedReceipt,
  ] = useState<
    string | null
  >(null);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  async function handleSave() {
    setError(null);

    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(
        numericAmount
      ) ||
      numericAmount <= 0
    ) {
      setError(
        "Enter a valid amount greater than zero."
      );
      return;
    }

    const now =
      new Date().toISOString();

    const deviceEventId =
      createDeviceEventId();

    const receiptReference =
      createOfflineReceiptReference();

    await saveOfflineFieldEvent({
      device_event_id:
        deviceEventId,
      receipt_reference:
        receiptReference,
      collection_id:
        collectionId,
      collection_title:
        collectionTitle,
      participant_id:
        participantId,
      participant_name:
        participantName,
      amount:
        Math.round(
          numericAmount *
            100
        ) / 100,
      currency,
      payment_method:
        paymentMethod,
      local_recorded_at:
        now,
      note:
        note.trim() ||
        null,
      lifecycle_status:
        "recorded_offline",
      created_at:
        now,
      synced_at:
        null,
      sync_error:
        null,
    });

    setSavedReceipt(
      receiptReference
    );
  }

  if (savedReceipt) {
    return (
      <section className="tp-card p-6 sm:p-8">
        <div className="rounded-[1.75rem] bg-[var(--tp-primary)] p-6 text-white">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-white/50">
            Offline receipt
          </p>

          <p className="mt-3 font-mono text-sm font-black tracking-wider text-white/75">
            {savedReceipt}
          </p>

          <p className="mt-6 text-4xl font-black">
            {money(
              amount,
              currency
            )}
          </p>

          <p className="mt-2 text-sm text-white/65">
            Recorded for{" "}
            <span className="font-black text-white">
              {participantName}
            </span>
          </p>
        </div>

        <div className="mt-5 rounded-2xl bg-[var(--tp-warning-soft)] p-5 text-sm leading-6 text-[var(--tp-warning)]">
          Saved on this device as <strong>Recorded offline</strong>. This receipt is valid as a local field record, but it has not yet been synchronized to Threeple.
        </div>

        <a
          href="/collector/offline-queue"
          className="tp-btn tp-btn-primary mt-5 w-full"
        >
          Open Offline Queue
        </a>
      </section>
    );
  }

  return (
    <section className="tp-card p-6 sm:p-8">
      <div className="mb-5">
        <p className="tp-kicker">
          Offline record
        </p>

        <h2 className="tp-heading mt-2 text-xl">
          {participantName}
        </h2>

        <p className="tp-body mt-2 text-sm">
          This record stays on this device until you explicitly sync it.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-2xl bg-[var(--tp-danger-soft)] p-4 text-sm font-medium text-[var(--tp-danger)]">
          {error}
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-black">
            Amount collected
          </label>

          <input
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(
              event
            ) =>
              setAmount(
                event.target
                  .value
              )
            }
            className="tp-input text-lg font-black"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-black">
            Collection method
          </label>

          <select
            value={
              paymentMethod
            }
            onChange={(
              event
            ) =>
              setPaymentMethod(
                event.target
                  .value as typeof paymentMethod
              )
            }
            className="tp-select"
          >
            <option value="cash">
              Cash
            </option>

            <option value="bank_transfer_manual">
              Bank transfer â€” manually confirmed
            </option>

            <option value="pos_manual">
              POS â€” manually confirmed
            </option>

            <option value="other_manual">
              Other manual method
            </option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-black">
            Note
          </label>

          <textarea
            rows={3}
            maxLength={500}
            value={note}
            onChange={(
              event
            ) =>
              setNote(
                event.target
                  .value
              )
            }
            className="tp-textarea"
            placeholder="e.g. Week 4 collection."
          />
        </div>

        <button
          type="button"
          onClick={
            handleSave
          }
          className="tp-btn tp-btn-primary min-h-12 w-full"
        >
          Save offline & issue receipt
        </button>
      </div>
    </section>
  );
}

