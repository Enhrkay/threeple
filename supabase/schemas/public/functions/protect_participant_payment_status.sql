CREATE OR REPLACE FUNCTION public.protect_participant_payment_status()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin

  if
    new.payment_status is distinct from old.payment_status

    and current_setting(
      'threeple.internal_reconciliation',
      true
    ) is distinct from 'on'

  then

    raise exception
      'Participant payment status is system-managed';

  end if;

  return new;

end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."protect_participant_payment_status"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."protect_participant_payment_status"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."protect_participant_payment_status"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."protect_participant_payment_status"() FROM PUBLIC, "anon", "authenticated";
