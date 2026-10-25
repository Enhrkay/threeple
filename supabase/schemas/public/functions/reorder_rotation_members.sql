CREATE OR REPLACE FUNCTION public.reorder_rotation_members (
  p_collection_id   uuid,
  p_participant_ids uuid[]
)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_existing_count integer;
  v_requested_count integer;
  v_distinct_count integer;
  v_missing_count integer;
  v_index integer;
begin
  if p_collection_id is null then
    raise exception 'Collection ID is required.';
  end if;

  if p_participant_ids is null
     or array_length(p_participant_ids, 1) is null then
    raise exception 'Recipient order is required.';
  end if;

  if exists (
    select 1
    from public.rotation_cycles rc
    where rc.collection_id = p_collection_id
  ) then
    raise exception 'Recipient order cannot be changed after rotation cycles exist.';
  end if;

  perform 1
  from public.collections c
  where c.id = p_collection_id
  for update;

  if not found then
    raise exception 'Collection not found.';
  end if;

  select count(*)::integer
  into v_existing_count
  from public.rotation_members rm
  where rm.collection_id = p_collection_id
    and rm.is_active = true;

  v_requested_count :=
    cardinality(p_participant_ids);

  select count(distinct x)::integer
  into v_distinct_count
  from unnest(p_participant_ids) as t(x);

  if v_requested_count <> v_existing_count then
    raise exception 'Recipient order must include every active rotation member.';
  end if;

  if v_distinct_count <> v_requested_count then
    raise exception 'Recipient order contains duplicate participants.';
  end if;

  select count(*)::integer
  into v_missing_count
  from unnest(p_participant_ids) as t(participant_id)
  where not exists (
    select 1
    from public.rotation_members rm
    where rm.collection_id = p_collection_id
      and rm.participant_id = t.participant_id
      and rm.is_active = true
  );

  if v_missing_count > 0 then
    raise exception 'Recipient order contains an invalid rotation member.';
  end if;

  -- Move positions out of the normal range first, avoiding
  -- unique(collection_id, recipient_position) collisions.
  update public.rotation_members
  set recipient_position =
    recipient_position + 100000
  where collection_id = p_collection_id
    and is_active = true;

  for v_index in
    1..v_requested_count
  loop
    update public.rotation_members
    set recipient_position =
      v_index
    where collection_id =
      p_collection_id
      and participant_id =
        p_participant_ids[v_index]
      and is_active = true;

    if not found then
      raise exception 'Could not update rotation member position.';
    end if;
  end loop;

  return v_requested_count;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."reorder_rotation_members"(uuid, uuid[]) TO "service_role";

REVOKE ALL ON FUNCTION "public"."reorder_rotation_members"(uuid, uuid[]) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."reorder_rotation_members"(uuid, uuid[]) TO "postgres";

REVOKE ALL ON FUNCTION "public"."reorder_rotation_members"(uuid, uuid[]) FROM PUBLIC, "anon", "authenticated";
