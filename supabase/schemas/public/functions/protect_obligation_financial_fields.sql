CREATE OR REPLACE FUNCTION public.protect_obligation_financial_fields()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin

  if (
    new.amount_paid is distinct from old.amount_paid
    or new.status is distinct from old.status
  )
  and current_setting(
        'threeple.internal_reconciliation',
        true
      ) is distinct from 'on'
  then

    raise exception
      'Obligation financial fields are system-managed';

  end if;

  return new;

end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."protect_obligation_financial_fields"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."protect_obligation_financial_fields"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."protect_obligation_financial_fields"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."protect_obligation_financial_fields"() FROM PUBLIC, "anon", "authenticated";
