CREATE OR REPLACE FUNCTION public.validate_rotation_payment_link()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  v_cycle_collection_id uuid;
  v_obligation_cycle_id uuid;
  v_obligation_participant_id uuid;
begin
  if new.rotation_cycle_id is null
     and new.rotation_obligation_id is null then
    return new;
  end if;

  if new.rotation_cycle_id is null
     or new.rotation_obligation_id is null then
    raise exception
      'Rotation cycle and rotation obligation must be supplied together.';
  end if;

  select
    rc.collection_id
  into v_cycle_collection_id
  from public.rotation_cycles rc
  where rc.id = new.rotation_cycle_id;

  if not found then
    raise exception 'Rotation cycle not found.';
  end if;

  select
    rco.cycle_id,
    rco.participant_id
  into
    v_obligation_cycle_id,
    v_obligation_participant_id
  from public.rotation_cycle_obligations rco
  where rco.id = new.rotation_obligation_id;

  if not found then
    raise exception 'Rotation obligation not found.';
  end if;

  if v_obligation_cycle_id <> new.rotation_cycle_id then
    raise exception
      'Rotation obligation does not belong to the supplied cycle.';
  end if;

  if v_cycle_collection_id <> new.collection_id then
    raise exception
      'Rotation cycle does not belong to the payment Collection.';
  end if;

  if v_obligation_participant_id <> new.participant_id then
    raise exception
      'Rotation obligation does not belong to the payment participant.';
  end if;

  return new;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."validate_rotation_payment_link"() TO PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."validate_rotation_payment_link"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."validate_rotation_payment_link"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."validate_rotation_payment_link"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."validate_rotation_payment_link"() FROM "anon", "authenticated";
