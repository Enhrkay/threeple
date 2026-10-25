CREATE OR REPLACE FUNCTION public.reconcile_field_obligation_from_event()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  v_root_id uuid;
  v_type text;
  v_obligation_id uuid;
begin
  v_root_id :=
    coalesce(new.correction_of_event_id, new.id);

  select
    obligation_type,
    obligation_id
  into
    v_type,
    v_obligation_id
  from public.field_contribution_events
  where id = v_root_id;

  if v_type is not null
     and v_obligation_id is not null then
    perform public.reconcile_field_obligation(
      v_type,
      v_obligation_id
    );
  end if;

  return new;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."reconcile_field_obligation_from_event"() TO PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."reconcile_field_obligation_from_event"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."reconcile_field_obligation_from_event"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."reconcile_field_obligation_from_event"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."reconcile_field_obligation_from_event"() FROM "anon", "authenticated";
