export const COLLECTOR_DB_NAME =
  "threeple-field-collector";

export const COLLECTOR_DB_VERSION = 2;

export const FIELD_EVENT_STORE =
  "offline-field-events";

export const SNAPSHOT_STORE =
  "offline-collection-snapshots";

export const OWNER_KEY =
  "threeple:collector-owner";

type OfflineFieldEvent = {
  lifecycle_status?: string | null;
  sync_status?: string | null;
};

function openCollectorDb(): Promise<IDBDatabase> {
  return new Promise(
    (resolve, reject) => {
      const request =
        indexedDB.open(
          COLLECTOR_DB_NAME,
          COLLECTOR_DB_VERSION
        );

      request.onerror = () =>
        reject(
          request.error ??
            new Error(
              "Could not open collector offline database."
            )
        );

      request.onsuccess = () =>
        resolve(request.result);
    }
  );
}

export async function countUnsyncedCollectorEvents() {
  if (
    typeof indexedDB ===
    "undefined"
  ) {
    return 0;
  }

  let db: IDBDatabase | null =
    null;

  try {
    db =
      await openCollectorDb();

    if (
      !db.objectStoreNames.contains(
        FIELD_EVENT_STORE
      )
    ) {
      return 0;
    }

    return await new Promise<number>(
      (resolve, reject) => {
        const transaction =
          db!.transaction(
            FIELD_EVENT_STORE,
            "readonly"
          );

        const store =
          transaction.objectStore(
            FIELD_EVENT_STORE
          );

        const request =
          store.getAll();

        request.onerror = () =>
          reject(
            request.error ??
              new Error(
                "Could not inspect offline collector queue."
              )
          );

        request.onsuccess = () => {
          const rows =
            (
              request.result ??
              []
            ) as OfflineFieldEvent[];

          const unsynced =
            rows.filter(
              (row) => {
                const status =
                  String(
                    row.lifecycle_status ??
                      row.sync_status ??
                      ""
                  ).toLowerCase();

                return (
                  status ===
                    "recorded_offline" ||
                  status ===
                    "pending_sync"
                );
              }
            ).length;

          resolve(unsynced);
        };
      }
    );
  } finally {
    db?.close();
  }
}

export async function clearCollectorSnapshotsOnly() {
  if (
    typeof indexedDB ===
    "undefined"
  ) {
    return;
  }

  let db: IDBDatabase | null =
    null;

  try {
    db =
      await openCollectorDb();

    if (
      !db.objectStoreNames.contains(
        SNAPSHOT_STORE
      )
    ) {
      return;
    }

    await new Promise<void>(
      (resolve, reject) => {
        const transaction =
          db!.transaction(
            SNAPSHOT_STORE,
            "readwrite"
          );

        transaction.oncomplete =
          () => resolve();

        transaction.onerror =
          () =>
            reject(
              transaction.error ??
                new Error(
                  "Could not clear offline snapshots."
                )
            );

        transaction
          .objectStore(
            SNAPSHOT_STORE
          )
          .clear();
      }
    );
  } finally {
    db?.close();
  }
}

export async function clearCollectorDatabaseIfSafe() {
  const unsynced =
    await countUnsyncedCollectorEvents();

  if (unsynced > 0) {
    return {
      cleared: false,
      unsynced,
    };
  }

  await new Promise<void>(
    (resolve, reject) => {
      const request =
        indexedDB.deleteDatabase(
          COLLECTOR_DB_NAME
        );

      request.onsuccess =
        () => resolve();

      request.onerror =
        () =>
          reject(
            request.error ??
              new Error(
                "Could not clear collector offline data."
              )
          );

      request.onblocked =
        () =>
          reject(
            new Error(
              "Collector offline database is still open in another tab."
            )
          );
    }
  );

  return {
    cleared: true,
    unsynced: 0,
  };
}

export async function forceClearCollectorDatabase() {
  await new Promise<void>(
    (resolve, reject) => {
      const request =
        indexedDB.deleteDatabase(
          COLLECTOR_DB_NAME
        );

      request.onsuccess =
        () => resolve();

      request.onerror =
        () =>
          reject(
            request.error ??
              new Error(
                "Could not clear collector offline data."
              )
          );

      request.onblocked =
        () =>
          reject(
            new Error(
              "Collector offline database is still open in another tab."
            )
          );
    }
  );
}

