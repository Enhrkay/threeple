import { supabaseAdmin } from "@/lib/supabase/admin";

export async function hasCollectorOrganizationAccess(
  userId: string,
  organizationId: string
) {
  const { data: organization } =
    await supabaseAdmin
      .from("organizations")
      .select("owner_id")
      .eq("id", organizationId)
      .maybeSingle();

  if (organization?.owner_id === userId) {
    return true;
  }

  const { data: manager } =
    await supabaseAdmin
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .in("role", ["admin", "treasurer"])
      .maybeSingle();

  if (manager) {
    return true;
  }

  const { data: collector } =
    await supabaseAdmin
      .from("organization_collectors")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .is("revoked_at", null)
      .maybeSingle();

  return Boolean(collector);
}

export async function getCollectorOrganizationIds(
  userId: string
) {
  const { data: owned } =
    await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("owner_id", userId);

  const { data: managed } =
    await supabaseAdmin
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", userId)
      .in("role", ["admin", "treasurer"]);

  const { data: collected } =
    await supabaseAdmin
      .from("organization_collectors")
      .select("organization_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .is("revoked_at", null);

  return Array.from(
    new Set([
      ...(owned ?? []).map((row) => row.id),
      ...(managed ?? []).map((row) => row.organization_id),
      ...(collected ?? []).map((row) => row.organization_id),
    ])
  );
}

