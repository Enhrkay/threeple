"use client";

import {
  useEffect,
} from "react";

import {
  createClient,
} from "@/lib/supabase/client";

const DB_NAME =
  "threeple-field-collector";

const OWNER_KEY =
  "threeple:collector-owner";

async function deleteCollectorDatabase() {
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
}

export default function OfflineSessionGuard({
  userId,
}: {
  userId:
    | string
    | null;
}) {
  useEffect(() => {
    let cancelled =
      false;

    async function alignOwner(
      nextUserId:
        | string
        | null
    ) {
      const currentOwner =
        localStorage.getItem(
          OWNER_KEY
        );

      if (!nextUserId) {
        await deleteCollectorDatabase();

        localStorage.removeItem(
          OWNER_KEY
        );

        return;
      }

      if (
        currentOwner &&
        currentOwner !==
          nextUserId
      ) {
        await deleteCollectorDatabase();
      }

      if (!cancelled) {
        localStorage.setItem(
          OWNER_KEY,
          nextUserId
        );
      }
    }

    alignOwner(
      userId
    );

    const supabase =
      createClient();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (
          event,
          session
        ) => {
          if (
            event ===
            "SIGNED_OUT"
          ) {
            alignOwner(
              null
            );
            return;
          }

          if (
            event ===
              "SIGNED_IN" ||
            event ===
              "USER_UPDATED"
          ) {
            alignOwner(
              session?.user
                .id ?? null
            );
          }
        }
      );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [userId]);

  return null;
}

