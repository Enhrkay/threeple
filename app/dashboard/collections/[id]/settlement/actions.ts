"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

import {
  createPaystackSubaccount,
  PaystackApiError,
  resolveNigeriaAccount,
} from "@/lib/paystack/server";

type OwnerContext = {
  userId: string;

  collection: {
    id: string;
    title: string;
    organization_id: string;
  };

  organization: {
    id: string;
    name: string;
    owner_id: string;
  };
};

type ResolveSettlementResult =
  | {
      success: true;
      accountName: string;
      bankCode: string;
      last4: string;
    }
  | {
      success: false;
      error: string;
    };

type ConnectSettlementResult =
  | {
      success: true;
      accountName: string;
      bankName: string;
      last4: string;
      providerReference: string;
      verificationStatus: string;
    }
  | {
      success: false;
      error: string;
    };

// =========================================================
// OWNER CONTEXT
// =========================================================

async function getOwnerContext(
  collectionId: string
): Promise<OwnerContext | null> {
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
    return null;
  }

  const {
    data: collection,
    error: collectionError,
  } = await supabase
    .from("collections")
    .select(`
      id,
      title,
      organization_id
    `)
    .eq(
      "id",
      collectionId
    )
    .maybeSingle();

  if (
    collectionError ||
    !collection
  ) {
    return null;
  }

  const {
    data: organization,
    error: organizationError,
  } = await supabase
    .from("organizations")
    .select(`
      id,
      name,
      owner_id
    `)
    .eq(
      "id",
      collection.organization_id
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
    return null;
  }

  return {
    userId,
    collection,
    organization,
  };
}

// =========================================================
// STEP 2
// RESOLVE ACCOUNT
// =========================================================

export async function resolveSettlementAccount(
  collectionId: string,
  accountNumber: string,
  bankCode: string
): Promise<ResolveSettlementResult> {
  const cleanCollectionId =
    collectionId.trim();

  const cleanAccountNumber =
    accountNumber.replace(
      /\D/g,
      ""
    );

  const cleanBankCode =
    bankCode.trim();

  if (
    cleanAccountNumber.length !==
    10
  ) {
    return {
      success: false,
      error:
        "Enter a valid 10-digit Nigerian bank account number.",
    };
  }

  if (!cleanBankCode) {
    return {
      success: false,
      error:
        "Please select your bank.",
    };
  }

  const context =
    await getOwnerContext(
      cleanCollectionId
    );

  if (!context) {
    return {
      success: false,
      error:
        "You do not have permission to manage settlement for this Collection.",
    };
  }

  try {
    const resolved =
      await resolveNigeriaAccount(
        cleanAccountNumber,
        cleanBankCode
      );

    if (
      !resolved.account_name
    ) {
      return {
        success: false,
        error:
          "We could not verify this bank account.",
      };
    }

    return {
      success: true,

      accountName:
        resolved.account_name,

      bankCode:
        cleanBankCode,

      last4:
        cleanAccountNumber.slice(
          -4
        ),
    };
  } catch (error) {
    console.error(
      "SETTLEMENT_ACCOUNT_RESOLUTION_FAILED",
      {
        collectionId:
          cleanCollectionId,

        statusCode:
          error instanceof
          PaystackApiError
            ? error.statusCode
            : null,

        providerCode:
          error instanceof
          PaystackApiError
            ? error.providerCode
            : null,
      }
    );

    if (
      error instanceof
        PaystackApiError &&
      error.statusCode === 429
    ) {
      const usingTestMode =
        process.env
          .PAYSTACK_SECRET_KEY
          ?.startsWith(
            "sk_test_"
          ) ?? false;

      return {
        success: false,

        error: usingTestMode
          ? "Paystack test-mode bank verification limit has been reached. Your account details may still be correct. Please try again after the test limit resets."
          : "Bank verification is temporarily busy. Please try again shortly.",
      };
    }

    if (
      error instanceof
        PaystackApiError &&
      (
        error.statusCode === 401 ||
        error.statusCode === 403
      )
    ) {
      return {
        success: false,

        error:
          "Bank verification is temporarily unavailable because the payment service is not properly connected.",
      };
    }

    if (
      error instanceof
        PaystackApiError &&
      error.statusCode >= 500
    ) {
      return {
        success: false,

        error:
          "Our payment provider is temporarily unavailable. Please try again.",
      };
    }

    return {
      success: false,

      error:
        "This account could not be verified. Confirm the account number and selected bank.",
    };
  }
}

// =========================================================
// STEP 4
// CONNECT SETTLEMENT ACCOUNT
// =========================================================

export async function connectSettlementAccount(
  collectionId: string,
  accountNumber: string,
  bankCode: string
): Promise<ConnectSettlementResult> {
  const cleanCollectionId =
    collectionId.trim();

  const cleanAccountNumber =
    accountNumber.replace(
      /\D/g,
      ""
    );

  const cleanBankCode =
    bankCode.trim();

  // -------------------------------------------------------
  // VALIDATION
  // -------------------------------------------------------

  if (
    cleanAccountNumber.length !==
    10
  ) {
    return {
      success: false,

      error:
        "The settlement account number is invalid.",
    };
  }

  if (!cleanBankCode) {
    return {
      success: false,

      error:
        "The settlement bank is missing.",
    };
  }

  // -------------------------------------------------------
  // AUTHORIZATION
  // -------------------------------------------------------

  const context =
    await getOwnerContext(
      cleanCollectionId
    );

  if (!context) {
    return {
      success: false,

      error:
        "You do not have permission to connect settlement for this Collection.",
    };
  }

  const {
    userId,
    collection,
    organization,
  } = context;

  // -------------------------------------------------------
  // PREVENT SECOND ACTIVE SETTLEMENT DESTINATION
  // -------------------------------------------------------

  const {
    data: existingBeneficiary,
  } = await supabaseAdmin
    .from(
      "collection_beneficiaries"
    )
    .select(`
      id,
      settlement_profile_id
    `)
    .eq(
      "collection_id",
      collection.id
    )
    .eq(
      "beneficiary_role",
      "primary"
    )
    .eq(
      "is_active",
      true
    )
    .maybeSingle();

  if (existingBeneficiary) {
    return {
      success: false,

      error:
        "This Collection already has an active settlement account.",
    };
  }

  const now =
    new Date().toISOString();

  // -------------------------------------------------------
  // CREATE LOCAL PENDING SETTLEMENT PROFILE FIRST
  //
  // This reserves the Collection settlement destination
  // BEFORE we create anything at Paystack.
  //
  // Full account number is NOT stored.
  // -------------------------------------------------------

  const {
    data: settlementProfile,
    error: settlementProfileError,
  } = await supabaseAdmin
    .from(
      "settlement_profiles"
    )
    .insert({
      beneficiary_type:
        "organization",

      organization_id:
        organization.id,

      participant_id:
        null,

      created_by:
        userId,

      display_name:
        collection.title,

      provider:
        "paystack",

      currency:
        "NGN",

      country_code:
        "NG",

      bank_code:
        cleanBankCode,

      bank_name:
        null,

      account_name:
        null,

      account_last4:
        cleanAccountNumber.slice(
          -4
        ),

      provider_recipient_reference:
        null,

      verification_status:
        "account_resolved",

      account_resolved_at:
        now,

      provider_connected_at:
        null,

      provider_verified_at:
        null,

      is_active:
        true,

      metadata: {
        connection_state:
          "pending_provider_connection",
      },
    })
    .select("id")
    .single();

  if (
    settlementProfileError ||
    !settlementProfile
  ) {
    console.error(
      "SETTLEMENT_PROFILE_CREATE_FAILED",
      {
        collectionId:
          collection.id,
      }
    );

    return {
      success: false,

      error:
        "Threeple could not prepare the settlement connection.",
    };
  }

  // -------------------------------------------------------
  // ATTACH PROFILE TO COLLECTION
  //
  // Our unique database index prevents two active
  // primary beneficiaries.
  // -------------------------------------------------------

  const {
    error: beneficiaryError,
  } = await supabaseAdmin
    .from(
      "collection_beneficiaries"
    )
    .insert({
      collection_id:
        collection.id,

      settlement_profile_id:
        settlementProfile.id,

      beneficiary_role:
        "primary",

      is_active:
        true,
    });

  if (beneficiaryError) {
    // Keep audit history but disable the unused profile.
    await supabaseAdmin
      .from(
        "settlement_profiles"
      )
      .update({
        verification_status:
          "disabled",

        is_active:
          false,
      })
      .eq(
        "id",
        settlementProfile.id
      );

    return {
      success: false,

      error:
        "A settlement account is already being connected to this Collection.",
    };
  }

  // -------------------------------------------------------
  // CREATE PAYSTACK SUBACCOUNT
  // -------------------------------------------------------

  try {
    const subaccount =
      await createPaystackSubaccount(
        {
          businessName:
            collection.title,

          bankCode:
            cleanBankCode,

          accountNumber:
            cleanAccountNumber,

          description:
            `Threeple settlement for ${collection.title}`,
        }
      );

    if (
      !subaccount.subaccount_code
    ) {
      throw new Error(
        "Paystack did not return a subaccount code."
      );
    }

    const verificationStatus =
      subaccount.is_verified
        ? "provider_verified"
        : "provider_connected";

    // -----------------------------------------------------
    // UPDATE THREEPLE WITH SAFE PROVIDER DATA
    //
    // Notice:
    // full account number is NOT saved.
    // -----------------------------------------------------

    const {
      error: updateError,
    } = await supabaseAdmin
      .from(
        "settlement_profiles"
      )
      .update({
        display_name:
          subaccount.account_name ||
          collection.title,

        bank_name:
          subaccount.settlement_bank,

        account_name:
          subaccount.account_name,

        provider_recipient_reference:
          subaccount.subaccount_code,

        verification_status:
          verificationStatus,

        provider_connected_at:
          now,

        provider_verified_at:
          subaccount.is_verified
            ? now
            : null,

        metadata: {
          connection_state:
            "connected",

          paystack_subaccount_id:
            subaccount.id,

          settlement_schedule:
            subaccount.settlement_schedule ??
            null,
        },
      })
      .eq(
        "id",
        settlementProfile.id
      );

    if (updateError) {
      // IMPORTANT:
      // Paystack has already created the subaccount.
      // We deliberately DO NOT allow another automatic
      // creation attempt here because that could create
      // duplicate provider resources.
      console.error(
        "SETTLEMENT_LOCAL_FINALIZATION_FAILED",
        {
          collectionId:
            collection.id,

          settlementProfileId:
            settlementProfile.id,

          providerReference:
            subaccount.subaccount_code,
        }
      );

      return {
        success: false,

        error:
          "The payment provider connection was created, but Threeple could not finish saving it. Please do not retry the connection.",
      };
    }

    // -----------------------------------------------------
    // REFRESH COLLECTION
    // -----------------------------------------------------

    revalidatePath(
      `/dashboard/collections/${collection.id}`
    );

    revalidatePath(
      `/dashboard/collections/${collection.id}/settlement`
    );

    return {
      success: true,

      accountName:
        subaccount.account_name,

      bankName:
        subaccount.settlement_bank,

      last4:
        cleanAccountNumber.slice(
          -4
        ),

      providerReference:
        subaccount.subaccount_code,

      verificationStatus,
    };
  } catch (error) {
    console.error(
      "PAYSTACK_SUBACCOUNT_CREATE_FAILED",
      {
        collectionId:
          collection.id,

        settlementProfileId:
          settlementProfile.id,

        statusCode:
          error instanceof
          PaystackApiError
            ? error.statusCode
            : null,

        providerCode:
          error instanceof
          PaystackApiError
            ? error.providerCode
            : null,
      }
    );

    // -----------------------------------------------------
    // RELEASE FAILED LOCAL RESERVATION
    // -----------------------------------------------------

    await supabaseAdmin
      .from(
        "collection_beneficiaries"
      )
      .update({
        is_active:
          false,
      })
      .eq(
        "settlement_profile_id",
        settlementProfile.id
      );

    await supabaseAdmin
      .from(
        "settlement_profiles"
      )
      .update({
        verification_status:
          "rejected",

        is_active:
          false,

        metadata: {
          connection_state:
            "provider_connection_failed",
        },
      })
      .eq(
        "id",
        settlementProfile.id
      );

    // -----------------------------------------------------
    // SAFE USER ERRORS
    // -----------------------------------------------------

    if (
      error instanceof
        PaystackApiError &&
      error.statusCode === 429
    ) {
      return {
        success: false,

        error:
          "Paystack's test or API limit has been reached. No settlement account was connected.",
      };
    }

    if (
      error instanceof
        PaystackApiError &&
      (
        error.statusCode === 401 ||
        error.statusCode === 403
      )
    ) {
      return {
        success: false,

        error:
          "The payment provider connection is currently unavailable.",
      };
    }

    if (
      error instanceof
        PaystackApiError &&
      error.statusCode >= 500
    ) {
      return {
        success: false,

        error:
          "The payment provider is temporarily unavailable. No settlement account was connected.",
      };
    }

    return {
      success: false,

      error:
        "Threeple could not connect this settlement account. No settlement has been activated.",
    };
  }
}