import "server-only";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

export type PlatformAdminRole =
  | "super_admin"
  | "admin"
  | "support"
  | "risk_ops";

// =========================================================
// REQUIRE PLATFORM ADMIN
// =========================================================

export async function requirePlatformAdmin(
  allowedRoles?: PlatformAdminRole[]
) {
  const supabase =
    await createClient();

  // =======================================================
  // AUTHENTICATED USER
  // =======================================================

  const {
    data: claimsData,
    error: claimsError,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (
    claimsError ||
    !userId
  ) {
    redirect("/auth/login");
  }

  // =======================================================
  // PLATFORM ADMIN RECORD
  //
  // platform_admins has no browser policies.
  // Therefore this check uses the trusted server client.
  // =======================================================

  const {
    data: admin,
    error: adminError,
  } = await supabaseAdmin
    .from("platform_admins")
    .select(`
      id,
      user_id,
      role,
      is_active,
      created_at
    `)
    .eq(
      "user_id",
      userId
    )
    .maybeSingle();

  if (
    adminError ||
    !admin ||
    !admin.is_active
  ) {
    notFound();
  }

  const role =
    admin.role as PlatformAdminRole;

  // =======================================================
  // OPTIONAL ROLE RESTRICTION
  // =======================================================

  if (
    allowedRoles &&
    !allowedRoles.includes(
      role
    )
  ) {
    notFound();
  }

  // =======================================================
  // PROFILE
  // =======================================================

  const {
    data: profile,
  } = await supabaseAdmin
    .from("profiles")
    .select(`
      full_name
    `)
    .eq(
      "id",
      userId
    )
    .maybeSingle();

  return {
    userId,

    role,

    adminId:
      admin.id,

    fullName:
      profile?.full_name ??
      "Threeple Admin",

    email:
      typeof claimsData
        ?.claims?.email ===
      "string"
        ? claimsData.claims.email
        : null,
  };
}