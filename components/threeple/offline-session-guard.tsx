"use client";

import {
  useEffect,
} from "react";

import {
  OWNER_KEY,
  clearCollectorDatabaseIfSafe,
  clearCollectorSnapshotsOnly,
} from "@/lib/collector/offline-device-safety";

type OfflineSessionGuardProps = {
  userId:
    | string
    | null;
};

export function OfflineSessionGuard({
  userId,
}: OfflineSessionGuardProps) {
  useEffect(() => {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    let cancelled =
      false;

    async function reconcileOwner() {
      const previousOwner =
        window.localStorage.getItem(
          OWNER_KEY
        );

      if (!userId) {
        if (!previousOwner) {
          return;
        }

        try {
          const result =
            await clearCollectorDatabaseIfSafe();

          if (
            !cancelled &&
            result.cleared
          ) {
            window.localStorage.removeItem(
              OWNER_KEY
            );
          }

          if (
            !cancelled &&
            !result.cleared
          ) {
            // Preserve queued receipts. Remove roster snapshots
            // so another account cannot read cached participant data.
            await clearCollectorSnapshotsOnly();

            window.localStorage.removeItem(
              OWNER_KEY
            );

            window.localStorage.setItem(
              "threeple:collector-unsynced-preserved",
              String(
                result.unsynced
              )
            );
          }
        } catch (error) {
          console.error(
            "OFFLINE_SIGNOUT_CLEANUP_FAILED",
            error
          );
        }

        return;
      }

      if (
        !previousOwner
      ) {
        window.localStorage.setItem(
          OWNER_KEY,
          userId
        );
        return;
      }

      if (
        previousOwner ===
        userId
      ) {
        return;
      }

      try {
        const result =
          await clearCollectorDatabaseIfSafe();

        if (
          cancelled
        ) {
          return;
        }

        if (
          result.cleared
        ) {
          window.localStorage.setItem(
            OWNER_KEY,
            userId
          );

          window.localStorage.removeItem(
            "threeple:collector-unsynced-preserved"
          );
          return;
        }

        // Account changed but unsynced events exist.
        // Preserve the immutable queue and remove participant snapshots.
        await clearCollectorSnapshotsOnly();

        window.localStorage.setItem(
          OWNER_KEY,
          userId
        );

        window.localStorage.setItem(
          "threeple:collector-unsynced-preserved",
          String(
            result.unsynced
          )
        );
      } catch (error) {
        console.error(
          "OFFLINE_ACCOUNT_SWITCH_CLEANUP_FAILED",
          error
        );
      }
    }

    void reconcileOwner();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return null;
}

