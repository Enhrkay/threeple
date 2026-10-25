CREATE OR REPLACE FUNCTION public.get_current_platform_fee_percentage()
  RETURNS numeric
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  select
    case
      when monetization_enabled then platform_fee_percentage
      else 0
    end
  from public.platform_settings
  where id = 'global'
  limit 1
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_current_platform_fee_percentage"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."get_current_platform_fee_percentage"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_current_platform_fee_percentage"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."get_current_platform_fee_percentage"() FROM PUBLIC, "anon", "authenticated";
