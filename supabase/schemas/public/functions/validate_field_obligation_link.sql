CREATE OR REPLACE FUNCTION public.validate_field_obligation_link()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  v_collection_id uuid;
  v_participant_id uuid;
begin
  if new.correction_of_event_id is not null then
    return new;
  end if;

  if new.obligation_type is null
     and new.obligation_id is null then
    return new;
  end if;

  if new.obligation_type is null
     or new.obligation_id is null then
    raise exception
      'obligation_type and obligation_id must be supplied together';
  end if;

  if new.obligation_type = 'recurring' then
    select
      collection_id,
      participant_id
    into
      v_collection_id,
      v_participant_id
    from public.recurring_cycle_obligations
    where id = new.obligation_id;

  elsif new.obligation_type = 'rotation' then
    select
      collection_id,
      participant_id
    into
      v_collection_id,
      v_participant_id
    from public.rotation_cycle_obligations
    where id = new.obligation_id;

  else
    raise exception
      'Unsupported obligation type: %',
      new.obligation_type;
  end if;

  if v_collection_id is null then
    raise exception
      'Linked obligation was not found';
  end if;

  if v_collection_id <> new.collection_id then
    raise exception
      'Field receipt collection does not match linked obligation';
  end if;

  if v_participant_id <> new.participant_id then
    raise exception
      'Field receipt participant does not match linked obligation';
  end if;

  return new;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."validate_field_obligation_link"() TO PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."validate_field_obligation_link"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."validate_field_obligation_link"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."validate_field_obligation_link"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."validate_field_obligation_link"() FROM "anon", "authenticated";
