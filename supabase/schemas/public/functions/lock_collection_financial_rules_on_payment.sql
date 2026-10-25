CREATE OR REPLACE FUNCTION public.lock_collection_financial_rules_on_payment()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if new.verified_at is not null
     and new.status in ('success', 'partially_refunded', 'refunded')
  then
    update public.collections
    set
      financial_rules_locked = true,
      financial_rules_locked_at =
        coalesce(financial_rules_locked_at, now()),
      financial_rules_locked_reason =
        coalesce(
          financial_rules_locked_reason,
          'verified_payment_started'
        )
    where id = new.collection_id
      and financial_rules_locked = false;
  end if;

  return new;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."lock_collection_financial_rules_on_payment"() TO PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."lock_collection_financial_rules_on_payment"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."lock_collection_financial_rules_on_payment"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."lock_collection_financial_rules_on_payment"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."lock_collection_financial_rules_on_payment"() FROM "anon", "authenticated";
