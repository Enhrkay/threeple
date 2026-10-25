"use client";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function LogoutButton({
  compact = false,
}: {
  compact?: boolean;
}) {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();

    await supabase.auth.signOut();

    router.replace("/auth/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={logout}
      className={[
        "inline-flex items-center justify-center rounded-xl border border-[var(--tp-border)] bg-[var(--tp-surface)] font-bold text-[var(--tp-muted)] transition hover:border-[var(--tp-primary-border)] hover:bg-[var(--tp-primary-soft)] hover:text-[var(--tp-primary)]",
        compact
          ? "min-h-10 px-3 text-xs"
          : "min-h-11 w-full px-4 text-sm",
      ].join(" ")}
    >
      Log out
    </button>
  );
}
