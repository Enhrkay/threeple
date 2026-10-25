CREATE OR REPLACE FUNCTION public.validate_trust_safety_resolution()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
begin

  if
    new.status in (
      'resolved',
      'dismissed'
    )
  then

    if new.resolved_at is null then
      new.resolved_at := now();
    end if;

  else

    new.resolved_at := null;
    new.resolved_by := null;

  end if;

  return new;

end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."validate_trust_safety_resolution"() TO PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."validate_trust_safety_resolution"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."validate_trust_safety_resolution"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."validate_trust_safety_resolution"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."validate_trust_safety_resolution"() FROM "anon", "authenticated";
