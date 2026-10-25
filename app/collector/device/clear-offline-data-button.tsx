"use client";

import {
  useState,
} from "react";

const DB_NAME =
  "threeple-field-collector";

const OWNER_KEY =
  "threeple:collector-owner";

export default function ClearOfflineDataButton() {
  const [
    clearing,
    setClearing,
  ] = useState(false);

  const [
    cleared,
    setCleared,
  ] = useState(false);

  async function clearData() {
    setClearing(true);

    await new Promise<void>(
      (resolve) => {
        const request =
          indexedDB.deleteDatabase(
            DB_NAME
          );

        request.onsuccess =
          () => resolve();

        request.onerror =
          () => resolve();

        request.onblocked =
          () => resolve();
      }
    );

    localStorage.removeItem(
      OWNER_KEY
    );

    setCleared(true);
    setClearing(false);
  }

  return (
    <div className="rounded-2xl border border-[var(--tp-danger-border)] bg-[var(--tp-danger-soft)] p-5">
      <p className="font-black text-[var(--tp-danger)]">
        Shared device?
      </p>

      <p className="mt-2 text-sm leading-6 text-[var(--tp-danger)]">
        Clear prepared member rosters and local field receipts before giving this browser or device to another collector.
      </p>

      <button
        type="button"
        onClick={
          clearData
        }
        disabled={
          clearing
        }
        className="tp-btn mt-4 min-h-11 bg-[var(--tp-danger)] text-white disabled:opacity-50"
      >
        {clearing
          ? "Clearingâ€¦"
          : cleared
            ? "Offline data cleared"
            : "Clear offline data"}
      </button>
    </div>
  );
}

