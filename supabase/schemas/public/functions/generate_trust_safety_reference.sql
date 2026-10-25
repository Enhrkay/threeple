CREATE OR REPLACE FUNCTION public.generate_trust_safety_reference()
  RETURNS text
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
declare
  reference_value text;
begin

  loop

    reference_value :=
      'TSR-' ||
      to_char(
        now(),
        'YYYYMMDD'
      ) ||
      '-' ||
      upper(
        substr(
          replace(
            gen_random_uuid()::text,
            '-',
            ''
          ),
          1,
          6
        )
      );

    exit when not exists (
      select 1
      from public.trust_safety_reports
      where report_reference =
        reference_value
    );

  end loop;

  return reference_value;

end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."generate_trust_safety_reference"() TO PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."generate_trust_safety_reference"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."generate_trust_safety_reference"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."generate_trust_safety_reference"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."generate_trust_safety_reference"() FROM "anon", "authenticated";
