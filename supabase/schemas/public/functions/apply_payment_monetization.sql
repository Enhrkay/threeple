CREATE OR REPLACE FUNCTION public.apply_payment_monetization (
  p_payment_id           uuid,
  p_processor_fee_amount numeric DEFAULT 0
)
  RETURNS TABLE (
    payment_id              uuid,
    gross_amount            numeric,
    effective_gross_amount  numeric,
    platform_fee_percentage numeric,
    platform_fee_amount     numeric,
    processor_fee_amount    numeric,
    organizer_net_amount    numeric
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_payment record;
  v_platform_rate numeric;
  v_effective_gross numeric;
  v_platform_fee numeric;
  v_processor_fee numeric;
  v_organizer_net numeric;
begin
  if p_payment_id is null then
    raise exception 'Payment ID is required.';
  end if;

  if coalesce(p_processor_fee_amount, 0) < 0 then
    raise exception 'Processor fee cannot be negative.';
  end if;

  select
    p.id,
    p.amount,
    coalesce(p.refunded_amount, 0) as refunded_amount,
    p.platform_fee_percentage,
    p.status
  into v_payment
  from public.payments p
  where p.id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment not found.';
  end if;

  if v_payment.amount is null or v_payment.amount < 0 then
    raise exception 'Payment amount is invalid.';
  end if;

  -- Preserve the rate already frozen on historical payments.
  if v_payment.platform_fee_percentage is not null then
    v_platform_rate := v_payment.platform_fee_percentage;
  else
    select
      ps.platform_fee_percentage
    into v_platform_rate
    from public.platform_settings ps
    where ps.id = 'global'
    limit 1;

    v_platform_rate := coalesce(v_platform_rate, 0);
  end if;

  if v_platform_rate < 0 or v_platform_rate > 100 then
    raise exception 'Platform fee percentage is invalid.';
  end if;

  v_effective_gross :=
    greatest(
      coalesce(v_payment.amount, 0) -
      coalesce(v_payment.refunded_amount, 0),
      0
    );

  v_platform_fee :=
    round(
      v_effective_gross *
      (v_platform_rate / 100.0),
      2
    );

  v_processor_fee :=
    round(
      coalesce(p_processor_fee_amount, 0),
      2
    );

  v_organizer_net :=
    greatest(
      round(
        v_effective_gross -
        v_platform_fee -
        v_processor_fee,
        2
      ),
      0
    );

  update public.payments
  set
    platform_fee_percentage = v_platform_rate,
    platform_fee_amount = v_platform_fee,
    processor_fee_amount = v_processor_fee,
    organizer_net_amount = v_organizer_net,
    monetization_calculated_at = now()
  where id = p_payment_id;

  return query
  select
    p_payment_id,
    round(coalesce(v_payment.amount, 0), 2),
    round(v_effective_gross, 2),
    round(v_platform_rate, 2),
    v_platform_fee,
    v_processor_fee,
    v_organizer_net;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."apply_payment_monetization"(uuid, numeric) TO "service_role";

REVOKE ALL ON FUNCTION "public"."apply_payment_monetization"(uuid, numeric) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."apply_payment_monetization"(uuid, numeric) TO "postgres";

REVOKE ALL ON FUNCTION "public"."apply_payment_monetization"(uuid, numeric) FROM PUBLIC, "anon", "authenticated";
