"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getOfflineFieldEvents,
  updateOfflineFieldEvent,
  type OfflineFieldEvent,
} from "@/lib/collector/offline-queue";

function money(
  amount: number,
  currency: string
) {
  return new Intl.NumberFormat(
    "en-NG",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }
  ).format(amount);
}

export default function OfflineQueueClient() {
  const [
    events,
    setEvents,
  ] = useState<
    OfflineFieldEvent[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    syncing,
    setSyncing,
  ] = useState(false);

  const [
    online,
    setOnline,
  ] = useState(true);

  const load =
    useCallback(
      async () => {
        const rows =
          await getOfflineFieldEvents();

        setEvents(rows);
        setLoading(false);
      },
      []
    );

  useEffect(() => {
    setOnline(
      navigator.onLine
    );

    const handleOnline =
      () => setOnline(true);

    const handleOffline =
      () => setOnline(false);

    window.addEventListener(
      "online",
      handleOnline
    );

    window.addEventListener(
      "offline",
      handleOffline
    );

    load();

    return () => {
      window.removeEventListener(
        "online",
        handleOnline
      );

      window.removeEventListener(
        "offline",
        handleOffline
      );
    };
  }, [load]);

  async function syncOne(
    event: OfflineFieldEvent
  ) {
    await updateOfflineFieldEvent(
      event.device_event_id,
      {
        lifecycle_status:
          "pending_sync",
        sync_error:
          null,
      }
    );

    try {
      const response =
        await fetch(
          "/api/collector/sync",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(
                event
              ),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Sync failed."
        );
      }

      await updateOfflineFieldEvent(
        event.device_event_id,
        {
          lifecycle_status:
            "synced",
          synced_at:
            result.server_synced_at ??
            new Date().toISOString(),
          sync_error:
            null,
        }
      );
    }
    catch (
      error
    ) {
      await updateOfflineFieldEvent(
        event.device_event_id,
        {
          lifecycle_status:
            "recorded_offline",
          sync_error:
            error instanceof Error
              ? error.message
              : "Sync failed.",
        }
      );
    }
  }

  async function syncAll() {
    if (!online) {
      return;
    }

    setSyncing(true);

    const pending =
      (
        await getOfflineFieldEvents()
      ).filter(
        (event) =>
          event.lifecycle_status !==
          "synced"
      );

    for (
      const event
      of pending
    ) {
      await syncOne(
        event
      );
    }

    await load();
    setSyncing(false);
  }

  const pendingCount =
    events.filter(
      (event) =>
        event.lifecycle_status !==
        "synced"
    ).length;

  if (loading) {
    return (
      <div className="tp-card p-6">
        Loading offline queueâ€¦
      </div>
    );
  }

  return (
    <div>
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="tp-card p-5">
          <p className="tp-kicker">
            Waiting
          </p>

          <p className="mt-2 text-3xl font-black">
            {pendingCount}
          </p>

          <p className="mt-1 text-xs text-[var(--tp-muted)]">
            Device records not yet synced.
          </p>
        </div>

        <div className="tp-card p-5">
          <p className="tp-kicker">
            Connection
          </p>

          <p className="mt-2 text-lg font-black">
            {online
              ? "Online"
              : "Offline"}
          </p>

          <p className="mt-1 text-xs text-[var(--tp-muted)]">
            Browser network status.
          </p>
        </div>

        <div className="tp-card p-5">
          <p className="tp-kicker">
            Total local
          </p>

          <p className="mt-2 text-3xl font-black">
            {events.length}
          </p>

          <p className="mt-1 text-xs text-[var(--tp-muted)]">
            Includes synced receipts retained on this device.
          </p>
        </div>
      </section>

      <button
        type="button"
        onClick={
          syncAll
        }
        disabled={
          !online ||
          syncing ||
          pendingCount ===
            0
        }
        className="tp-btn tp-btn-primary mt-5 min-h-12 w-full disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {syncing
          ? "Syncingâ€¦"
          : `Sync now${
              pendingCount >
              0
                ? ` (${pendingCount})`
                : ""
            }`}
      </button>

      {events.length ===
      0 ? (
        <div className="tp-card mt-6 p-8 text-center">
          <p className="font-black">
            Offline queue is empty.
          </p>

          <p className="mt-2 text-sm text-[var(--tp-muted)]">
            Records saved without connectivity will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {events.map(
            (event) => (
              <article
                key={
                  event.device_event_id
                }
                className="tp-card p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-black">
                      {
                        event.participant_name
                      }
                    </p>

                    <p className="mt-1 truncate text-sm text-[var(--tp-muted)]">
                      {
                        event.collection_title
                      }
                    </p>

                    <p className="mt-3 font-mono text-xs font-black tracking-wider text-[var(--tp-primary)]">
                      {
                        event.receipt_reference
                      }
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-lg font-black">
                      {money(
                        event.amount,
                        event.currency
                      )}
                    </p>

                    <span
                      className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${
                        event.lifecycle_status ===
                        "synced"
                          ? "bg-[var(--tp-success-soft)] text-[var(--tp-success)]"
                          : event.lifecycle_status ===
                              "pending_sync"
                            ? "bg-[var(--tp-info-soft)] text-[var(--tp-info)]"
                            : "bg-[var(--tp-warning-soft)] text-[var(--tp-warning)]"
                      }`}
                    >
                      {event.lifecycle_status ===
                      "synced"
                        ? "Synced"
                        : event.lifecycle_status ===
                            "pending_sync"
                          ? "Pending sync"
                          : "Recorded offline"}
                    </span>
                  </div>
                </div>

                {event.sync_error && (
                  <div className="mt-4 rounded-2xl bg-[var(--tp-danger-soft)] p-3 text-xs font-medium text-[var(--tp-danger)]">
                    {
                      event.sync_error
                    }
                  </div>
                )}

                {event.lifecycle_status !==
                  "synced" && (
                  <button
                    type="button"
                    disabled={
                      !online ||
                      syncing
                    }
                    onClick={async () => {
                      setSyncing(
                        true
                      );

                      await syncOne(
                        event
                      );

                      await load();

                      setSyncing(
                        false
                      );
                    }}
                    className="tp-btn tp-btn-secondary mt-4 min-h-11 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Sync this receipt
                  </button>
                )}
              </article>
            )
          )}
        </div>
      )}
    </div>
  );
}

