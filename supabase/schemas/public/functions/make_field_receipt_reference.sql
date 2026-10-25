CREATE OR REPLACE FUNCTION public.make_field_receipt_reference()
  RETURNS text
  LANGUAGE plpgsql
  AS $function$
begin
  return
    'TP-' ||
    to_char(now() at time zone 'UTC', 'YYYYMMDD') ||
    '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."make_field_receipt_reference"() TO PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."make_field_receipt_reference"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."make_field_receipt_reference"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."make_field_receipt_reference"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."make_field_receipt_reference"() FROM "anon", "authenticated";
