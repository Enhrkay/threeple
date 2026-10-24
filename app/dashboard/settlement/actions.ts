"use server";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  createOrganizerPaystackSubaccount,
} from "@/lib/payments/paystack";

function clean(
  formData: FormData,
  key: string
) {
  return String(
    formData.get(key) ?? ""
  ).trim();
}

function returnToSettlement(
  organizationId: string,
  result: string
): never {
  redirect(
    `/dashboard/settlement?organizationId=${encodeURIComponent(
      organizationId
    )}&result=${encodeURIComponent(
      result
    )}`
  );
}

export async function connectSettlementAccount(
  formData: FormData
) {
  const organizationId =
    clean(
      formData,
      "organization_id"
    );

  const bankCode =
    clean(
      formData,
      "bank_code"
    );

  const accountNumber =
    clean(
      formData,
      "account_number"
    ).replace(/\s+/g, "");

  if (
    !organizationId
  ) {
    redirect(
      "/dashboard/settlement?result=organization_required"
    );
  }

  if (
    !bankCode ||
    !/^\d{10}$/.test(
      accountNumber
    )
  ) {
    returnToSettlement(
      organizationId,
      "invalid_bank_details"
    );
  }

  const supabase =
    await createClient();

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
    redirect(
      "/auth/login"
    );
  }

  const {
    data: organization,
    error: organizationError,
  } = await supabase
    .from("organizations")
    .select(`
      id,
      name,
      owner_id,
      settlement_status,
      settlement_subaccount_code
    `)
    .eq(
      "id",
      organizationId
    )
    .eq(
      "owner_id",
      userId
    )
    .maybeSingle();

  if (
    organizationError ||
    !organization
  ) {
    returnToSettlement(
      organizationId,
      "not_allowed"
    );
  }

  if (
    organization.settlement_status ===
      "active" &&
    organization.settlement_subaccount_code
  ) {
    returnToSettlement(
      organizationId,
      "already_connected"
    );
  }

  const {
    data: profile,
  } = await supabase
    .from("profiles")
    .select(`
      full_name,
      phone
    `)
    .eq(
      "id",
      userId
    )
    .maybeSingle();

  const email =
    typeof claimsData.claims.email ===
      "string"
      ? claimsData.claims.email
      : null;

  try {
    await createOrganizerPaystackSubaccount({
      organizationId:
        organization.id,
      businessName:
        organization.name,
      bankCode,
      accountNumber,
      contactEmail:
        email,
      contactName:
        profile?.full_name ??
        null,
      contactPhone:
        profile?.phone ??
        null,
    });
  } catch (error) {
    console.error(
      "CONNECT_SETTLEMENT_ACCOUNT_FAILED",
      {
        organizationId,
        error,
      }
    );

    returnToSettlement(
      organizationId,
      "connection_failed"
    );
  }

  returnToSettlement(
    organizationId,
    "connected"
  );
}
