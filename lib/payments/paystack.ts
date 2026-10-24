import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

type CreatePaystackSubaccountInput = {
  organizationId: string;
  rotationCycleId?: string | null;
  rotationObligationId?: string | null;
  businessName: string;
  bankCode: string;
  accountNumber: string;
  contactEmail?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
};

type InitializePaystackSplitPaymentInput = {
  email: string;
  amountMajor: number;
  currency: string;
  subaccountCode: string;
  platformFeeMajor: number;
  platformFeePercentage: number;
  reference: string;
  callbackUrl: string;
  participantId: string;
  collectionId: string;
  organizationId: string;
  rotationCycleId?: string | null;
  rotationObligationId?: string | null;
};

type PaystackSubaccountResponse = {
  status: boolean;
  message: string;
  data?: {
    subaccount_code?: string;
    account_name?: string;
    account_number?: string;
    settlement_bank?: string;
    currency?: string;
  };
};

type PaystackInitializeResponse = {
  status: boolean;
  message: string;
  data?: {
    authorization_url?: string;
    access_code?: string;
    reference?: string;
  };
};

type PaystackBank = {
  name: string;
  code: string;
  currency: string;
  country: string;
  active: boolean;
};

type PaystackBanksResponse = {
  status: boolean;
  message: string;
  data?: PaystackBank[];
};

function getPaystackSecretKey() {
  const key =
    process.env.PAYSTACK_SECRET_KEY;

  if (!key) {
    throw new Error(
      "PAYSTACK_SECRET_KEY is not configured."
    );
  }

  return key;
}

function toSubunit(
  amountMajor: number
) {
  return Math.round(
    amountMajor * 100
  );
}

export async function getPaystackBanks() {
  const secretKey =
    getPaystackSecretKey();

  const response =
    await fetch(
      "https://api.paystack.co/bank?country=nigeria&currency=NGN&perPage=100",
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${secretKey}`,
        },
        cache: "no-store",
      }
    );

  const result =
    await response.json() as
      PaystackBanksResponse;

  if (
    !response.ok ||
    !result.status
  ) {
    throw new Error(
      result.message ||
      "Could not load banks from Paystack."
    );
  }

  const activeBanks =
    (
      result.data ??
      []
    ).filter(
      (bank) =>
        bank.active &&
        bank.currency === "NGN"
    );

  const uniqueBanks =
    Array.from(
      new Map(
        activeBanks.map(
          (bank) => [
            bank.code,
            bank,
          ]
        )
      ).values()
    );

  return uniqueBanks.sort(
    (a, b) =>
      a.name.localeCompare(
        b.name
      )
  );
}

export async function createOrganizerPaystackSubaccount(
  input: CreatePaystackSubaccountInput
) {
  const {
    organizationId,
    rotationCycleId,
    rotationObligationId,
    businessName,
    bankCode,
    accountNumber,
    contactEmail,
    contactName,
    contactPhone,
  } = input;

  if (
    !organizationId ||
    !businessName ||
    !bankCode ||
    !accountNumber
  ) {
    throw new Error(
      "Organization, business name, bank and account number are required."
    );
  }

  const secretKey =
    getPaystackSecretKey();

  const response =
    await fetch(
      "https://api.paystack.co/subaccount",
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${secretKey}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          business_name:
            businessName,
          bank_code:
            bankCode,
          account_number:
            accountNumber,
          percentage_charge:
            0,
          description:
            `Threeple settlement account for ${businessName}`,
          primary_contact_email:
            contactEmail ??
            undefined,
          primary_contact_name:
            contactName ??
            undefined,
          primary_contact_phone:
            contactPhone ??
            undefined,
        }),
      }
    );

  const result =
    await response.json() as
      PaystackSubaccountResponse;

  if (
    !response.ok ||
    !result.status ||
    !result.data?.subaccount_code
  ) {
    await supabaseAdmin
      .from("organizations")
      .update({
        settlement_provider:
          "paystack",
        settlement_status:
          "failed",
      })
      .eq(
        "id",
        organizationId
      );

    throw new Error(
      result.message ||
      "Paystack subaccount creation failed."
    );
  }

  const last4 =
    accountNumber.slice(-4);

  const {
    error: updateError,
  } = await supabaseAdmin
    .from("organizations")
    .update({
      settlement_provider:
        "paystack",
      settlement_subaccount_code:
        result.data.subaccount_code,
      settlement_bank_code:
        bankCode,
      settlement_account_name:
        result.data.account_name ??
        null,
      settlement_account_last4:
        last4,
      settlement_currency:
        result.data.currency ??
        "NGN",
      settlement_status:
        "active",
      settlement_configured_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      organizationId
    );

  if (updateError) {
    throw new Error(
      "Paystack subaccount was created but Threeple could not save the settlement profile."
    );
  }

  return {
    subaccountCode:
      result.data.subaccount_code,
    accountName:
      result.data.account_name ??
      null,
    accountLast4:
      last4,
    currency:
      result.data.currency ??
      "NGN",
  };
}

export async function initializePaystackSplitPayment(
  input: InitializePaystackSplitPaymentInput
) {
  const {
    email,
    amountMajor,
    currency,
    subaccountCode,
    platformFeeMajor,
    platformFeePercentage,
    reference,
    callbackUrl,
    participantId,
    collectionId,
    organizationId,
    rotationCycleId,
    rotationObligationId,
  } = input;

  if (
    !email ||
    !subaccountCode ||
    !reference ||
    !callbackUrl
  ) {
    throw new Error(
      "Payment initialization information is incomplete."
    );
  }

  if (
    !Number.isFinite(
      amountMajor
    ) ||
    amountMajor <= 0
  ) {
    throw new Error(
      "Payment amount is invalid."
    );
  }

  if (
    !Number.isFinite(
      platformFeeMajor
    ) ||
    platformFeeMajor < 0 ||
    platformFeeMajor >=
      amountMajor
  ) {
    throw new Error(
      "Platform fee is invalid."
    );
  }

  const secretKey =
    getPaystackSecretKey();

  const response =
    await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${secretKey}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          email,
          amount:
            toSubunit(
              amountMajor
            ),
          currency,
          reference,
          callback_url:
            callbackUrl,
          subaccount:
            subaccountCode,
          transaction_charge:
            toSubunit(
              platformFeeMajor
            ),
          bearer:
            "subaccount",
          metadata: {
            threeple_reference:
              reference,
            participant_id:
              participantId,
            collection_id:
              collectionId,
            organization_id:
              organizationId,
            rotation_cycle_id:
              rotationCycleId ?? null,
            rotation_obligation_id:
              rotationObligationId ?? null,
    rotationCycleId,
    rotationObligationId,
            gross_amount:
              amountMajor,
            platform_fee_amount:
              platformFeeMajor,
            platform_fee_percentage:
              platformFeePercentage,
          },
        }),
      }
    );

  const result =
    await response.json() as
      PaystackInitializeResponse;

  if (
    !response.ok ||
    !result.status ||
    !result.data?.authorization_url ||
    !result.data.reference
  ) {
    throw new Error(
      result.message ||
      "Paystack payment initialization failed."
    );
  }

  return {
    authorizationUrl:
      result.data.authorization_url,
    accessCode:
      result.data.access_code ??
      null,
    reference:
      result.data.reference,
  };
}


