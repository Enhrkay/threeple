"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  requirePlatformAdmin,
} from "@/lib/admin/server";

import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

function field(
  formData: FormData,
  key: string
) {
  return String(
    formData.get(key) ?? ""
  ).trim();
}

function returnToUser(
  userId: string,
  result: string
): never {
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath(
    `/admin/users/${userId}`
  );
  revalidatePath(
    `/admin/users/${userId}/lifecycle`
  );

  redirect(
    `/admin/users/${userId}/lifecycle?result=${encodeURIComponent(
      result
    )}`
  );
}

async function assertLifecycleAdmin(
  targetUserId: string
) {
  const admin =
    await requirePlatformAdmin();

  if (
    ![
      "super_admin",
      "admin",
    ].includes(admin.role)
  ) {
    returnToUser(
      targetUserId,
      "not_authorized"
    );
  }

  if (
    admin.userId ===
    targetUserId
  ) {
    returnToUser(
      targetUserId,
      "cannot_manage_self"
    );
  }

  const {
    data:
      targetAdmin,
  } = await supabaseAdmin
    .from("platform_admins")
    .select(`
      id,
      role,
      is_active
    `)
    .eq(
      "user_id",
      targetUserId
    )
    .eq(
      "is_active",
      true
    )
    .maybeSingle();

  if (targetAdmin) {
    returnToUser(
      targetUserId,
      "admin_account_protected"
    );
  }

  return admin;
}

export async function deactivateUserAccount(
  formData: FormData
) {
  const userId =
    field(
      formData,
      "user_id"
    );

  const reason =
    field(
      formData,
      "reason"
    );

  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  if (
    reason.length < 10
  ) {
    returnToUser(
      userId,
      "reason_required"
    );
  }

  const admin =
    await assertLifecycleAdmin(
      userId
    );

  const {
    error: authError,
  } =
    await supabaseAdmin
      .auth
      .admin
      .updateUserById(
        userId,
        {
          ban_duration:
            "876000h",
        }
      );

  if (authError) {
    console.error(
      "ADMIN_USER_DEACTIVATE_AUTH_FAILED",
      authError
    );

    returnToUser(
      userId,
      "deactivate_failed"
    );
  }

  const now =
    new Date().toISOString();

  const {
    error:
      lifecycleError,
  } = await supabaseAdmin
    .from(
      "user_account_lifecycle"
    )
    .upsert(
      {
        user_id:
          userId,
        status:
          "deactivated",
        reason,
        changed_by:
          admin.userId,
        deactivated_at:
          now,
        restored_at:
          null,
        updated_at:
          now,
      },
      {
        onConflict:
          "user_id",
      }
    );

  if (
    lifecycleError
  ) {
    console.error(
      "ADMIN_USER_DEACTIVATE_AUDIT_FAILED",
      lifecycleError
    );

    returnToUser(
      userId,
      "audit_failed"
    );
  }

  returnToUser(
    userId,
    "deactivated"
  );
}

export async function restoreUserAccount(
  formData: FormData
) {
  const userId =
    field(
      formData,
      "user_id"
    );

  const reason =
    field(
      formData,
      "reason"
    );

  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  if (
    reason.length < 10
  ) {
    returnToUser(
      userId,
      "reason_required"
    );
  }

  const admin =
    await assertLifecycleAdmin(
      userId
    );

  const {
    error: authError,
  } =
    await supabaseAdmin
      .auth
      .admin
      .updateUserById(
        userId,
        {
          ban_duration:
            "none",
        }
      );

  if (authError) {
    console.error(
      "ADMIN_USER_RESTORE_AUTH_FAILED",
      authError
    );

    returnToUser(
      userId,
      "restore_failed"
    );
  }

  const now =
    new Date().toISOString();

  const {
    error,
  } = await supabaseAdmin
    .from(
      "user_account_lifecycle"
    )
    .upsert(
      {
        user_id:
          userId,
        status:
          "active",
        reason,
        changed_by:
          admin.userId,
        restored_at:
          now,
        updated_at:
          now,
      },
      {
        onConflict:
          "user_id",
      }
    );

  if (error) {
    console.error(
      "ADMIN_USER_RESTORE_AUDIT_FAILED",
      error
    );

    returnToUser(
      userId,
      "audit_failed"
    );
  }

  returnToUser(
    userId,
    "restored"
  );
}

export async function deleteUserAccount(
  formData: FormData
) {
  const userId =
    field(
      formData,
      "user_id"
    );

  const reason =
    field(
      formData,
      "reason"
    );

  const confirmation =
    field(
      formData,
      "confirmation"
    );

  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  if (
    reason.length < 10
  ) {
    returnToUser(
      userId,
      "reason_required"
    );
  }

  if (
    confirmation !==
    "DELETE ACCOUNT"
  ) {
    returnToUser(
      userId,
      "confirmation_required"
    );
  }

  const admin =
    await assertLifecycleAdmin(
      userId
    );

  const now =
    new Date().toISOString();

  const {
    error:
      lifecycleError,
  } = await supabaseAdmin
    .from(
      "user_account_lifecycle"
    )
    .upsert(
      {
        user_id:
          userId,
        status:
          "deleted",
        reason,
        changed_by:
          admin.userId,
        deleted_at:
          now,
        updated_at:
          now,
      },
      {
        onConflict:
          "user_id",
      }
    );

  if (
    lifecycleError
  ) {
    console.error(
      "ADMIN_USER_DELETE_AUDIT_FAILED",
      lifecycleError
    );

    returnToUser(
      userId,
      "audit_failed"
    );
  }

  // Soft-delete the Auth account.
  // This intentionally preserves domain rows that reference user_id.
  const {
    error: deleteError,
  } =
    await supabaseAdmin
      .auth
      .admin
      .deleteUser(
        userId,
        true
      );

  if (deleteError) {
    console.error(
      "ADMIN_USER_SOFT_DELETE_FAILED",
      deleteError
    );

    returnToUser(
      userId,
      "delete_failed"
    );
  }

  returnToUser(
    userId,
    "deleted"
  );
}
