import {
  supabaseAdmin,
} from "@/lib/supabase/admin";

type MonetizationResult = {
  payment_id: string;
  gross_amount: number | string;
  effective_gross_amount: number | string;
  platform_fee_percentage: number | string;
  platform_fee_amount: number | string;
  processor_fee_amount: number | string;
  organizer_net_amount: number | string;
};

export async function applyPaymentMonetization(
  paymentId: string,
  processorFeeAmount = 0
) {
  if (!paymentId) {
    throw new Error(
      "Payment ID is required."
    );
  }

  if (
    !Number.isFinite(processorFeeAmount) ||
    processorFeeAmount < 0
  ) {
    throw new Error(
      "Processor fee must be a non-negative number."
    );
  }

  const {
    data,
    error,
  } = await supabaseAdmin.rpc(
    "apply_payment_monetization",
    {
      p_payment_id: paymentId,
      p_processor_fee_amount: processorFeeAmount,
    }
  );

  if (error) {
    console.error(
      "APPLY_PAYMENT_MONETIZATION_FAILED",
      {
        paymentId,
        processorFeeAmount,
        errorCode: error.code,
        errorMessage: error.message,
      }
    );

    throw new Error(
      "Payment monetization could not be calculated."
    );
  }

  const row =
    Array.isArray(data)
      ? data[0]
      : data;

  if (!row) {
    throw new Error(
      "Payment monetization returned no result."
    );
  }

  return row as MonetizationResult;
}
