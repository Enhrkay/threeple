CREATE OR REPLACE FUNCTION public.protect_payment_identity()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin

  if new.collection_id <> old.collection_id then
    raise exception 'Payment collection cannot be changed';
  end if;


  if new.participant_id <> old.participant_id then
    raise exception 'Payment participant cannot be changed';
  end if;


  if new.obligation_id is distinct from old.obligation_id then
    raise exception 'Payment obligation cannot be changed';
  end if;


  if new.provider <> old.provider then
    raise exception 'Payment provider cannot be changed';
  end if;


  if new.provider_reference <> old.provider_reference then
    raise exception 'Payment reference cannot be changed';
  end if;


  if new.amount <> old.amount then
    raise exception 'Payment amount cannot be changed';
  end if;


  if new.currency <> old.currency then
    raise exception 'Payment currency cannot be changed';
  end if;


  return new;

end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."protect_payment_identity"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."protect_payment_identity"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."protect_payment_identity"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."protect_payment_identity"() FROM PUBLIC, "anon", "authenticated";
