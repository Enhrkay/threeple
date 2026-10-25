import {
  createClient,
} from "@/lib/supabase/server";

import { OfflineSessionGuard } from "@/components/threeple/offline-session-guard";

export const instant = false;

export default async function CollectorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase =
    await createClient();

  const {
    data: claimsData,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub ??
    null;

  return (
    <>
      <OfflineSessionGuard
        userId={userId}
      />
      {children}
    </>
  );
}


