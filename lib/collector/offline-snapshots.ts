"use client";

export type OfflineParticipantSnapshot = {
  id: string;
  full_name: string;
  phone: string | null;
  expected_amount: number | string | null;
  payment_status: string | null;
  participation_status: string | null;
};

export type OfflineCollectionSnapshot = {
  collection_id: string;
  title: string;
  organization_name: string;
  collection_mode: string;
  currency: string;
  default_amount: number | string | null;
  prepared_by_user_id: string;
  prepared_at: string;
  participants: OfflineParticipantSnapshot[];
};

const DB_NAME = "threeple-field-collector";
const DB_VERSION = 2;

const EVENT_STORE = "offline-field-events";
const SNAPSHOT_STORE = "offline-collection-snapshots";

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(EVENT_STORE)) {
        const eventStore = db.createObjectStore(EVENT_STORE, {
          keyPath: "device_event_id",
        });

        eventStore.createIndex(
          "lifecycle_status",
          "lifecycle_status",
          { unique: false }
        );

        eventStore.createIndex(
          "created_at",
          "created_at",
          { unique: false }
        );
      }

      if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
        const snapshotStore = db.createObjectStore(SNAPSHOT_STORE, {
          keyPath: "collection_id",
        });

        snapshotStore.createIndex(
          "prepared_at",
          "prepared_at",
          { unique: false }
        );
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineCollectionSnapshot(
  snapshot: OfflineCollectionSnapshot
) {
  const db = await openDb();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SNAPSHOT_STORE, "readwrite");
    tx.objectStore(SNAPSHOT_STORE).put(snapshot);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  db.close();
}

export async function getOfflineCollectionSnapshot(
  collectionId: string
) {
  const db = await openDb();

  const snapshot = await new Promise<
    OfflineCollectionSnapshot | undefined
  >((resolve, reject) => {
    const request = db
      .transaction(SNAPSHOT_STORE, "readonly")
      .objectStore(SNAPSHOT_STORE)
      .get(collectionId);

    request.onsuccess = () => resolve(request.result ?? undefined);
    request.onerror = () => reject(request.error);
  });

  db.close();

  return snapshot;
}

export async function getAllOfflineCollectionSnapshots() {
  const db = await openDb();

  const snapshots = await new Promise<
    OfflineCollectionSnapshot[]
  >((resolve, reject) => {
    const request = db
      .transaction(SNAPSHOT_STORE, "readonly")
      .objectStore(SNAPSHOT_STORE)
      .getAll();

    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });

  db.close();

  return snapshots.sort(
    (a, b) =>
      new Date(b.prepared_at).getTime() -
      new Date(a.prepared_at).getTime()
  );
}

export async function deleteOfflineCollectionSnapshot(
  collectionId: string
) {
  const db = await openDb();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SNAPSHOT_STORE, "readwrite");
    tx.objectStore(SNAPSHOT_STORE).delete(collectionId);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  db.close();
}

