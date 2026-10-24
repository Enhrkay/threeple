"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  deleteOfflineCollectionSnapshot,
  getOfflineCollectionSnapshot,
  saveOfflineCollectionSnapshot,
  type OfflineCollectionSnapshot,
} from "@/lib/collector/offline-snapshots";

type Props = {
  collectionId: string;
};

export default function PrepareOfflineClient({
  collectionId,
}: Props) {
  const [
    snapshot,
    setSnapshot,
  ] = useState<
    OfflineCollectionSnapshot | null
  >(null);

  const [
    status,
    setStatus,
  ] = useState<
    "idle" |
    "preparing" |
    "ready" |
    "error"
  >("idle");

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  useEffect(() => {
    getOfflineCollectionSnapshot(
      collectionId
    )
      .then(
        (existing) => {
          if (existing) {
            setSnapshot(
              existing
            );

            setStatus(
              "ready"
            );
          }
        }
      )
      .catch(() => {});
  }, [collectionId]);

  async function prepare() {
    setStatus(
      "preparing"
    );

    setError(null);

    try {
      const response =
        await fetch(
          `/api/collector/${collectionId}/offline-snapshot`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Could not prepare this collection."
        );
      }

      await saveOfflineCollectionSnapshot(
        data
      );

      setSnapshot(
        data
      );

      setStatus(
        "ready"
      );
    }
    catch (
      err
    ) {
      setStatus(
        "error"
      );

      setError(
        err instanceof Error
          ? err.message
          : "Could not prepare this collection."
      );
    }
  }

  async function remove() {
    await deleteOfflineCollectionSnapshot(
      collectionId
    );

    setSnapshot(
      null
    );

    setStatus(
      "idle"
    );
  }

  const preparedAt =
    snapshot?.prepared_at
      ? new Intl.DateTimeFormat(
          "en-NG",
          {
            dateStyle:
              "medium",
            timeStyle:
              "short",
            timeZone:
              "Africa/Lagos",
          }
        ).format(
          new Date(
            snapshot.prepared_at
          )
        )
      : null;

  return (
    <div>
      <section className="tp-card p-6 sm:p-8">
        <p className="tp-kicker">
          Prepare route
        </p>

        <h2 className="tp-heading mt-2 text-2xl">
          Download this collection for field use.
        </h2>

        <p className="tp-body mt-3 text-sm leading-7">
          Threeple will save the current member roster and collection details on this device. Sensitive field data stays in the browser&apos;s local IndexedDB store instead of authenticated HTML cache.
        </p>

        {snapshot && (
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[var(--tp-bg-soft)] p-5">
              <p className="tp-kicker">
                Members
              </p>

              <p className="mt-2 text-2xl font-black">
                {
                  snapshot
                    .participants
                    .length
                }
              </p>
            </div>

            <div className="rounded-2xl bg-[var(--tp-bg-soft)] p-5">
              <p className="tp-kicker">
                Prepared
              </p>

              <p className="mt-2 text-sm font-black">
                {preparedAt}
              </p>
            </div>

            <div className="rounded-2xl bg-[var(--tp-success-soft)] p-5">
              <p className="tp-kicker">
                Device status
              </p>

              <p className="mt-2 font-black text-[var(--tp-success)]">
                Ready offline
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-2xl bg-[var(--tp-danger-soft)] p-4 text-sm font-medium text-[var(--tp-danger)]">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={
              prepare
            }
            disabled={
              status ===
              "preparing"
            }
            className="tp-btn tp-btn-primary min-h-12"
          >
            {status ===
            "preparing"
              ? "Preparingâ€¦"
              : snapshot
                ? "Refresh offline copy"
                : "Download for offline"}
          </button>

          {snapshot && (
            <a
              href={`/collector-offline.html?collectionId=${encodeURIComponent(collectionId)}`}
              className="tp-btn tp-btn-secondary min-h-12"
            >
              Open offline workspace
            </a>
          )}
          {snapshot && (
            <button
              type="button"
              onClick={
                remove
              }
              className="tp-btn tp-btn-secondary min-h-12"
            >
              Remove offline copy
            </button>
          )}
        </div>
      </section>

      <div className="mt-5 rounded-2xl bg-[var(--tp-warning-soft)] p-5 text-sm leading-6 text-[var(--tp-warning)]">
        Refresh the offline copy before entering a low-connectivity area if members or expected amounts have changed.
      </div>
    </div>
  );
}


