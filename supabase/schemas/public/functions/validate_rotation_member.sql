CREATE OR REPLACE FUNCTION public.validate_rotation_member()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  v_mode text;
  v_participant_collection uuid;
begin

  select collection_mode
  into v_mode
  from public.collections
  where id = new.collection_id;

  if v_mode <> 'rotating_pool' then
    raise exception
      'Rotation order can only be used with rotating_pool collections';
  end if;


  select collection_id
  into v_participant_collection
  from public.participants
  where id = new.participant_id;


  if v_participant_collection <> new.collection_id then
    raise exception
      'Participant does not belong to this rotating collection';
  end if;


  return new;

end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."validate_rotation_member"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."validate_rotation_member"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."validate_rotation_member"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."validate_rotation_member"() FROM PUBLIC, "anon", "authenticated";
