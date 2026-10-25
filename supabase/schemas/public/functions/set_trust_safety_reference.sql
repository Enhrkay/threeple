CREATE OR REPLACE FUNCTION public.set_trust_safety_reference()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
begin

  if
    new.report_reference is null
    or trim(
      new.report_reference
    ) = ''
  then

    new.report_reference :=
      public.generate_trust_safety_reference();

  end if;

  return new;

end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."set_trust_safety_reference"() TO PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."set_trust_safety_reference"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."set_trust_safety_reference"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."set_trust_safety_reference"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."set_trust_safety_reference"() FROM "anon", "authenticated";
