export const OFFLINE_SNAPSHOT_FRESH_HOURS = 12;
export const OFFLINE_SNAPSHOT_EXPIRED_HOURS = 72;

export type OfflineSnapshotFreshness =
  | "fresh"
  | "stale"
  | "expired"
  | "unknown";

export function getOfflineSnapshotFreshness(
  preparedAt: string | null | undefined,
  now = new Date()
): {
  state: OfflineSnapshotFreshness;
  ageHours: number | null;
  label: string;
  message: string;
} {
  if (!preparedAt) {
    return {
      state: "unknown",
      ageHours: null,
      label: "Unknown",
      message:
        "Threeple cannot confirm when this offline copy was prepared.",
    };
  }

  const prepared = new Date(preparedAt);

  if (Number.isNaN(prepared.getTime())) {
    return {
      state: "unknown",
      ageHours: null,
      label: "Unknown",
      message:
        "Threeple cannot confirm when this offline copy was prepared.",
    };
  }

  const ageHours =
    Math.max(
      0,
      (now.getTime() - prepared.getTime()) /
        (1000 * 60 * 60)
    );

  if (ageHours >= OFFLINE_SNAPSHOT_EXPIRED_HOURS) {
    return {
      state: "expired",
      ageHours,
      label: "Expired",
      message:
        "This offline roster is over 72 hours old. Refresh it before relying on member or contribution information.",
    };
  }

  if (ageHours >= OFFLINE_SNAPSHOT_FRESH_HOURS) {
    return {
      state: "stale",
      ageHours,
      label: "Stale",
      message:
        "This offline roster is more than 12 hours old. Refresh it when connectivity is available.",
    };
  }

  return {
    state: "fresh",
    ageHours,
    label: "Fresh",
    message:
      "This offline roster was prepared recently.",
  };
}

export function formatOfflineSnapshotAge(
  ageHours: number | null
) {
  if (ageHours === null) {
    return "Age unknown";
  }

  if (ageHours < 1) {
    return "Prepared less than 1 hour ago";
  }

  if (ageHours < 24) {
    const hours = Math.floor(ageHours);
    return `Prepared ${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(ageHours / 24);
  return `Prepared ${days} day${days === 1 ? "" : "s"} ago`;
}

