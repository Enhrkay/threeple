"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  countUnsyncedCollectorEvents,
  forceClearCollectorDatabase,
} from "@/lib/collector/offline-device-safety";

export function ClearOfflineDataButton() {
  const [
    unsynced,
    setUnsynced,
  ] =
    useState(0);

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState<string | null>(
      null
    );

  async function refresh() {
    try {
      setUnsynced(
        await countUnsyncedCollectorEvents()
      );
    } catch {
      setUnsynced(0);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function clearData() {
    const currentUnsynced =
      await countUnsyncedCollectorEvents();

    if (
      currentUnsynced >
      0
    ) {
      const confirmed =
        window.confirm(
          `This device still has ${currentUnsynced} unsynced contribution record(s). Clearing now will permanently remove those local records before they reach Threeple. Only continue if you have intentionally decided to discard them.`
        );

      if (!confirmed) {
        setMessage(
          "Offline data was not cleared. Sync the pending records first."
        );
        return;
      }

      const secondConfirmation =
        window.confirm(
          "Final confirmation: permanently delete the unsynced collector records from this device?"
        );

      if (
        !secondConfirmation
      ) {
        setMessage(
          "Offline data was not cleared."
        );
        return;
      }
    }

    setBusy(true);
    setMessage(null);

    try {
      await forceClearCollectorDatabase();

      window.localStorage.removeItem(
        "threeple:collector-owner"
      );

      window.localStorage.removeItem(
        "threeple:collector-unsynced-preserved"
      );

      setUnsynced(0);

      setMessage(
        "Offline collector data was cleared from this device."
      );
    } catch (error) {
      console.error(
        "CLEAR_OFFLINE_DATA_FAILED",
        error
      );

      setMessage(
        "Threeple could not clear the offline data. Close other Threeple tabs and try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {unsynced > 0 && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>
            {unsynced} unsynced contribution record
            {unsynced === 1
              ? ""
              : "s"}{" "}
            on this device.
          </strong>

          <p className="mt-1">
            Threeple will preserve them automatically on sign-out or account change. Sync them before intentionally clearing this device.
          </p>
        </div>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={() =>
          void clearData()
        }
        className="tp-btn tp-btn-secondary"
      >
        {busy
          ? "Clearingâ€¦"
          : "Clear offline data"}
      </button>

      {message && (
        <p className="mt-3 text-sm text-[var(--tp-muted)]">
          {message}
        </p>
      )}
    </div>
  );
}

