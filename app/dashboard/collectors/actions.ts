import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function requireAssigner(
  organizationId: string
) {
  const supabase = await createClient();

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect(
      `/auth/login?next=${encodeURIComponent("/dashboard/collectors")}`
    );
  }

  const { data: organization } =
    await supabaseAdmin
      .from("organizations")
      .select("id, owner_id")
      .eq("id", organizationId)
      .maybeSingle();

  if (!organization) {
    throw new Error("Organization not found.");
  }

  if (organization.owner_id === userId) {
    return userId;
  }

  const { data: membership } =
    await supabaseAdmin
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

  if (!membership) {
    throw new Error(
      "Only the organization owner or an admin can manage collectors."
    );
  }

  return userId;
}

function go(result: string): never {
  revalidatePath("/dashboard/collectors");
  redirect(
    `/dashboard/collectors?result=${encodeURIComponent(result)}`
  );
}

export async function assignCollector(
  formData: FormData
) {
  "use server";

  const organizationId =
    String(formData.get("organization_id") ?? "").trim();

  const email =
    String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();

  if (!organizationId || !email) {
    go("missing_fields");
  }

  const assignerId =
    await requireAssigner(organizationId);

  let page = 1;
  let foundUser:
    | { id: string; email?: string }
    | null = null;

  while (page <= 10 && !foundUser) {
    const { data, error } =
      await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 100,
      });

    if (error) {
      console.error(
        "LIST_USERS_FOR_COLLECTOR_FAILED",
        error
      );
      go("lookup_failed");
    }

    foundUser =
      data.users.find(
        (user) =>
          user.email?.toLowerCase() === email
      ) ?? null;

    if (data.users.length < 100) {
      break;
    }

    page += 1;
  }

  if (!foundUser) {
    go("user_not_found");
  }

  const { error } =
    await supabaseAdmin
      .from("organization_collectors")
      .upsert(
        {
          organization_id: organizationId,
          user_id: foundUser.id,
          is_active: true,
          assigned_by_user_id: assignerId,
          assigned_at: new Date().toISOString(),
          revoked_at: null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "organization_id,user_id",
        }
      );

  if (error) {
    console.error(
      "ASSIGN_COLLECTOR_FAILED",
      error
    );
    go("assign_failed");
  }

  go("collector_assigned");
}

export async function revokeCollector(
  formData: FormData
) {
  "use server";

  const organizationId =
    String(formData.get("organization_id") ?? "").trim();

  const assignmentId =
    String(formData.get("assignment_id") ?? "").trim();

  if (!organizationId || !assignmentId) {
    go("missing_fields");
  }

  await requireAssigner(organizationId);

  const { error } =
    await supabaseAdmin
      .from("organization_collectors")
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", assignmentId)
      .eq("organization_id", organizationId);

  if (error) {
    console.error(
      "REVOKE_COLLECTOR_FAILED",
      error
    );
    go("revoke_failed");
  }

  go("collector_revoked");
}

