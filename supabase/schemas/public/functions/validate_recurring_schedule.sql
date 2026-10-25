CREATE OR REPLACE FUNCTION public.validate_recurring_schedule()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  v_mode text;
begin

  select collection_mode
  into v_mode
  from public.collections
  where id = new.collection_id;

  if v_mode not in ('recurring_dues', 'rotating_pool') then
    raise exception
      'Recurring schedules can only be used with recurring_dues or rotating_pool collections';
  end if;

  return new;

end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."validate_recurring_schedule"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."validate_recurring_schedule"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."validate_recurring_schedule"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."validate_recurring_schedule"() FROM PUBLIC, "anon", "authenticated";
