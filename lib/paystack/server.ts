import "server-only";

const PAYSTACK_BASE_URL =
  "https://api.paystack.co";

// =========================================================
// TYPES
// =========================================================

type PaystackSuccess<T> = {
  status: true;
  message: string;
  data: T;
};

type PaystackFailure = {
  status?: false;
  message?: string;
  code?: string;
};

export type PaystackBank = {
  id: number;
  name: string;
  code: string;
  active: boolean;
  country?: string;
  currency?: string;
  type?: string;
};

export type ResolvedAccount = {
  account_number: string;
  account_name: string;
  bank_id?: number;
};

export type PaystackSubaccount = {
  id: number;
  subaccount_code: string;
  business_name: string;
  account_name: string;
  settlement_bank: string;
  currency: string;
  percentage_charge: number;
  active: boolean;
  is_verified: boolean;
  settlement_schedule?: string;
};

export type PaystackInitializedTransaction = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

// =========================================================
// PAYSTACK ERROR
// =========================================================

export class PaystackApiError extends Error {
  statusCode: number;
  providerCode: string | null;
  retryAfterSeconds: number | null;

  constructor(
    message: string,
    statusCode: number,
    providerCode: string | null = null,
    retryAfterSeconds: number | null = null
  ) {
    super(message);

    this.name =
      "PaystackApiError";

    this.statusCode =
      statusCode;

    this.providerCode =
      providerCode;

    this.retryAfterSeconds =
      retryAfterSeconds;
  }
}

// =========================================================
// SECRET KEY
// =========================================================

function getSecretKey() {
  const key =
    process.env
      .PAYSTACK_SECRET_KEY;

  if (!key) {
    throw new Error(
      "PAYSTACK_SECRET_KEY is not configured."
    );
  }

  if (
    process.env.NODE_ENV !==
      "production" &&
    !key.startsWith("sk_test_")
  ) {
    throw new Error(
      "Local Threeple development must use a Paystack test key."
    );
  }

  return key;
}

// =========================================================
// BASE PAYSTACK REQUEST
// =========================================================

async function paystackRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const secretKey =
    getSecretKey();

  let response: Response;

  try {
    response =
      await fetch(
        `${PAYSTACK_BASE_URL}${path}`,
        {
          ...options,

          headers: {
            Authorization:
              `Bearer ${secretKey}`,

            "Content-Type":
              "application/json",

            ...(options.headers ??
              {}),
          },

          cache: "no-store",

          signal:
            AbortSignal.timeout(
              15000
            ),
        }
      );
  } catch {
    console.error(
      "PAYSTACK_NETWORK_ERROR",
      {
        endpoint:
          path.split("?")[0],
      }
    );

    throw new PaystackApiError(
      "Payment provider is temporarily unavailable.",
      503
    );
  }

  let result:
    | PaystackSuccess<T>
    | PaystackFailure;

  try {
    result =
      await response.json();
  } catch {
    console.error(
      "PAYSTACK_INVALID_RESPONSE",
      {
        endpoint:
          path.split("?")[0],

        statusCode:
          response.status,
      }
    );

    throw new PaystackApiError(
      "Payment provider returned an invalid response.",
      response.status
    );
  }

  if (
    !response.ok ||
    result.status !== true ||
    !("data" in result)
  ) {
    const retryHeader =
      response.headers.get(
        "x-ratelimit-reset"
      );

    const retryAfterSeconds =
      retryHeader
        ? Number(retryHeader)
        : null;

        const providerCode =
      "code" in result
        ? result.code ?? null
        : null;

    console.error(
      "PAYSTACK_API_ERROR",
      {
        endpoint:
          path.split("?")[0],

        statusCode:
          response.status,

        providerCode,

        retryAfterSeconds,
      }
    );

    throw new PaystackApiError(
      result.message ??
        "Paystack request failed.",
      response.status,
      providerCode,
      retryAfterSeconds
    );
  }

  return result.data;
}

// =========================================================
// 1. LIST NIGERIAN BANKS
// =========================================================

export async function listNigeriaBanks() {
  const banks =
    await paystackRequest<
      PaystackBank[]
    >(
      "/bank?country=nigeria&currency=NGN&perPage=100"
    );

  return banks
    .filter(
      (bank) =>
        bank.active !== false
    )
    .sort((a, b) =>
      a.name.localeCompare(
        b.name
      )
    );
}

// =========================================================
// 2. RESOLVE ACCOUNT
// =========================================================

export async function resolveNigeriaAccount(
  accountNumber: string,
  bankCode: string
) {
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
    throw new Error(
      "A valid 10-digit Nigerian account number is required."
    );
  }

  if (!cleanBankCode) {
    throw new Error(
      "Bank code is required."
    );
  }

  const query =
    new URLSearchParams({
      account_number:
        cleanAccountNumber,

      bank_code:
        cleanBankCode,
    });

  return paystackRequest<
    ResolvedAccount
  >(
    `/bank/resolve?${query.toString()}`
  );
}

// =========================================================
// 3. CREATE SUBACCOUNT
// =========================================================

export async function createPaystackSubaccount(
  input: {
    businessName: string;
    bankCode: string;
    accountNumber: string;
    description?: string;
  }
) {
  const cleanAccountNumber =
    input.accountNumber.replace(
      /\D/g,
      ""
    );

  const cleanBankCode =
    input.bankCode.trim();

  if (
    cleanAccountNumber.length !==
    10
  ) {
    throw new Error(
      "A valid 10-digit settlement account number is required."
    );
  }

  if (!cleanBankCode) {
    throw new Error(
      "Bank code is required."
    );
  }

  return paystackRequest<
    PaystackSubaccount
  >(
    "/subaccount",
    {
      method: "POST",

      body: JSON.stringify({
        business_name:
          input.businessName,

        bank_code:
          cleanBankCode,

        account_number:
          cleanAccountNumber,

        // No Threeple platform fee yet.
        percentage_charge:
          0,

        description:
          input.description ??
          "Threeple Collection settlement",
      }),
    }
  );
}

// =========================================================
// 4. INITIALIZE PAYMENT
// =========================================================

export async function initializePaystackTransaction(
  input: {
    email: string;

    // Paystack expects the amount in the
    // currency's smallest unit.
    // For NGN this means kobo.
    amountInSubunit: number;

    currency: string;

    reference: string;

    callbackUrl: string;

    subaccountCode: string;

    // Optional future Threeple flat fee.
    // Also expressed in the currency's
    // smallest unit.
    transactionChargeInSubunit?: number;

    metadata?: Record<
      string,
      unknown
    >;
  }
) {
  const email =
    input.email
      .trim()
      .toLowerCase();

  const currency =
    input.currency
      .trim()
      .toUpperCase();

  const reference =
    input.reference.trim();

  const subaccountCode =
    input.subaccountCode.trim();

  // -------------------------------------------------------
  // VALIDATION
  // -------------------------------------------------------

  if (
    !email ||
    !email.includes("@")
  ) {
    throw new Error(
      "A valid customer email is required."
    );
  }

  if (
    !Number.isInteger(
      input.amountInSubunit
    ) ||
    input.amountInSubunit <= 0
  ) {
    throw new Error(
      "Payment amount must be a positive integer in the currency subunit."
    );
  }

  if (!currency) {
    throw new Error(
      "Payment currency is required."
    );
  }

  // Paystack transaction references may
  // contain alphanumeric characters,
  // hyphens, dots and equals signs.
  if (
    !reference ||
    !/^[A-Za-z0-9.\-=]+$/.test(
      reference
    )
  ) {
    throw new Error(
      "Invalid payment reference."
    );
  }

  if (
    !input.callbackUrl.startsWith(
      "http://"
    ) &&
    !input.callbackUrl.startsWith(
      "https://"
    )
  ) {
    throw new Error(
      "A valid payment callback URL is required."
    );
  }

  if (
    !subaccountCode.startsWith(
      "ACCT_"
    )
  ) {
    throw new Error(
      "A valid Paystack settlement subaccount is required."
    );
  }

  if (
    input.transactionChargeInSubunit !==
      undefined &&
    (
      !Number.isInteger(
        input.transactionChargeInSubunit
      ) ||
      input.transactionChargeInSubunit <
        0
    )
  ) {
    throw new Error(
      "Transaction charge must be a non-negative integer."
    );
  }

  // -------------------------------------------------------
  // PAYSTACK BODY
  // -------------------------------------------------------

  const body: Record<
    string,
    unknown
  > = {
    email,

    amount:
      String(
        input.amountInSubunit
      ),

    currency,

    reference,

    callback_url:
      input.callbackUrl,

    subaccount:
      subaccountCode,

    metadata:
      JSON.stringify(
        input.metadata ??
          {}
      ),
  };

  // We intentionally do not invent
  // Threeple's fee here.
  //
  // Once the business fee is approved,
  // this allows us to specify a flat
  // platform amount for each transaction.
  if (
    input.transactionChargeInSubunit !==
    undefined &&
    input.transactionChargeInSubunit > 0
  ) {
    body.transaction_charge =
      input.transactionChargeInSubunit;
  }

  return paystackRequest<
    PaystackInitializedTransaction
  >(
    "/transaction/initialize",
    {
      method: "POST",

      body:
        JSON.stringify(
          body
        ),
    }
  );
}