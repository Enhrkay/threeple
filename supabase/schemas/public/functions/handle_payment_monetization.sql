CREATE OR REPLACE FUNCTION public.handle_payment_monetization()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  -- apply_payment_monetization updates the payment row.
  -- Stop that internal update from recursively running this trigger.
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if new.verified_at is null then
    return new;
  end if;

  if new.status in (
    'success',
    'partially_refunded',
    'refunded'
  ) then
    perform public.apply_payment_monetization(
      new.id,
      coalesce(new.processor_fee_amount, 0)
    );
  end if;

  return new;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."handle_payment_monetization"() TO PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."handle_payment_monetization"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."handle_payment_monetization"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."handle_payment_monetization"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."handle_payment_monetization"() FROM "anon", "authenticated";
