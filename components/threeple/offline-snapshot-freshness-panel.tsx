"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  getOfflineSnapshotFreshness,
  formatOfflineSnapshotAge,
} from "@/lib/collector/offline-snapshot-freshness";

type SnapshotSummary = {
  collection_id: string;
  title?: string | null;
  prepared_at?: string | null;
};

const DB_NAME =
  "threeple-field-collector";

const DB_VERSION = 2;

const STORE =
  "offline-collection-snapshots";

function openDb(): Promise<IDBDatabase> {
  return new Promise(
    (resolve, reject) => {
      const request =
        indexedDB.open(
          DB_NAME,
          DB_VERSION
        );

      request.onerror = () =>
        reject(
          request.error ??
            new Error(
              "Could not open offline collector storage."
            )
        );

      request.onsuccess = () =>
        resolve(request.result);
    }
  );
}

async function readSnapshot(
  collectionId: string
): Promise<SnapshotSummary | null> {
  let db: IDBDatabase | null =
    null;

  try {
    db = await openDb();

    if (
      !db.objectStoreNames.contains(
        STORE
      )
    ) {
      return null;
    }

    return await new Promise(
      (resolve, reject) => {
        const transaction =
          db!.transaction(
            STORE,
            "readonly"
          );

        const request =
          transaction
            .objectStore(STORE)
            .get(collectionId);

        request.onerror = () =>
          reject(
            request.error ??
              new Error(
                "Could not read offline snapshot."
              )
          );

        request.onsuccess = () =>
          resolve(
            (request.result ??
              null) as SnapshotSummary | null
          );
      }
    );
  } finally {
    db?.close();
  }
}

export function OfflineSnapshotFreshnessPanel({
  collectionId,
}: {
  collectionId: string;
}) {
  const [
    snapshot,
    setSnapshot,
  ] =
    useState<SnapshotSummary | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result =
          await readSnapshot(
            collectionId
          );

        if (!cancelled) {
          setSnapshot(result);
        }
      } catch {
        if (!cancelled) {
          setSnapshot(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [collectionId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--tp-border)] bg-white p-4 text-sm text-[var(--tp-muted)]">
        Checking offline copyâ€¦
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="rounded-2xl border border-[var(--tp-border)] bg-white p-4">
        <p className="font-black">
          No offline copy prepared
        </p>

        <p className="mt-1 text-sm text-[var(--tp-muted)]">
          Download this collection before heading into an area with unreliable connectivity.
        </p>

        <Link
          href={`/collector/${collectionId}/prepare-offline`}
          className="tp-btn tp-btn-primary mt-4"
        >
          Prepare offline
        </Link>
      </div>
    );
  }

  const freshness =
    getOfflineSnapshotFreshness(
      snapshot.prepared_at
    );

  const toneClass =
    freshness.state === "fresh"
      ? "border-green-200 bg-green-50 text-green-900"
      : freshness.state === "stale"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-red-200 bg-red-50 text-red-900";

  return (
    <div
      className={`rounded-2xl border p-4 ${toneClass}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-black">
            Offline copy: {freshness.label}
          </p>

          <p className="mt-1 text-sm">
            {formatOfflineSnapshotAge(
              freshness.ageHours
            )}
          </p>
        </div>

        <Link
          href={`/collector/${collectionId}/prepare-offline`}
          className="tp-btn tp-btn-secondary"
        >
          Refresh offline copy
        </Link>
      </div>

      <p className="mt-3 text-sm">
        {freshness.message}
      </p>
    </div>
  );
}

