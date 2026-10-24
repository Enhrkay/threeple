"use client";

export type OfflineFieldEvent = {
  device_event_id: string;
  receipt_reference: string;
  collection_id: string;
  collection_title: string;
  participant_id: string;
  participant_name: string;
  amount: number;
  currency: string;
  payment_method:
    | "cash"
    | "bank_transfer_manual"
    | "pos_manual"
    | "other_manual";
  local_recorded_at: string;
  note: string | null;
  lifecycle_status:
    | "recorded_offline"
    | "pending_sync"
    | "synced";
  created_at: string;
  synced_at: string | null;
  sync_error: string | null;
};

const DB_NAME =
  "threeple-field-collector";

const DB_VERSION = 1;

const STORE_NAME =
  "offline-field-events";

function openDb() {
  return new Promise<IDBDatabase>(
    (resolve, reject) => {
      const request =
        indexedDB.open(
          DB_NAME,
          DB_VERSION
        );

      request.onupgradeneeded =
        () => {
          const db =
            request.result;

          if (
            !db.objectStoreNames.contains(
              STORE_NAME
            )
          ) {
            const store =
              db.createObjectStore(
                STORE_NAME,
                {
                  keyPath:
                    "device_event_id",
                }
              );

            store.createIndex(
              "lifecycle_status",
              "lifecycle_status",
              {
                unique: false,
              }
            );

            store.createIndex(
              "created_at",
              "created_at",
              {
                unique: false,
              }
            );
          }
        };

      request.onsuccess =
        () =>
          resolve(
            request.result
          );

      request.onerror =
        () =>
          reject(
            request.error
          );
    }
  );
}

export function createDeviceEventId() {
  return crypto.randomUUID();
}

export function createOfflineReceiptReference() {
  const stamp =
    new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "");

  const suffix =
    crypto
      .randomUUID()
      .replaceAll("-", "")
      .slice(0, 10)
      .toUpperCase();

  return `TP-OFF-${stamp}-${suffix}`;
}

export async function saveOfflineFieldEvent(
  event: OfflineFieldEvent
) {
  const db =
    await openDb();

  await new Promise<void>(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          STORE_NAME,
          "readwrite"
        );

      transaction
        .objectStore(
          STORE_NAME
        )
        .put(event);

      transaction.oncomplete =
        () => resolve();

      transaction.onerror =
        () =>
          reject(
            transaction.error
          );
    }
  );

  db.close();
}

export async function getOfflineFieldEvents() {
  const db =
    await openDb();

  const events =
    await new Promise<
      OfflineFieldEvent[]
    >(
      (resolve, reject) => {
        const request =
          db
            .transaction(
              STORE_NAME,
              "readonly"
            )
            .objectStore(
              STORE_NAME
            )
            .getAll();

        request.onsuccess =
          () =>
            resolve(
              request.result ?? []
            );

        request.onerror =
          () =>
            reject(
              request.error
            );
      }
    );

  db.close();

  return events.sort(
    (a, b) =>
      new Date(
        b.created_at
      ).getTime() -
      new Date(
        a.created_at
      ).getTime()
  );
}

export async function updateOfflineFieldEvent(
  deviceEventId: string,
  patch: Partial<OfflineFieldEvent>
) {
  const db =
    await openDb();

  await new Promise<void>(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          STORE_NAME,
          "readwrite"
        );

      const store =
        transaction.objectStore(
          STORE_NAME
        );

      const getRequest =
        store.get(
          deviceEventId
        );

      getRequest.onsuccess =
        () => {
          const current =
            getRequest.result as
              | OfflineFieldEvent
              | undefined;

          if (!current) {
            return;
          }

          store.put({
            ...current,
            ...patch,
          });
        };

      transaction.oncomplete =
        () => resolve();

      transaction.onerror =
        () =>
          reject(
            transaction.error
          );
    }
  );

  db.close();
}
