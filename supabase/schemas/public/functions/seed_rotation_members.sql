CREATE OR REPLACE FUNCTION public.seed_rotation_members (
  p_collection_id uuid
)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_count integer;
begin
  if p_collection_id is null then
    raise exception 'Collection ID is required.';
  end if;

  if exists (
    select 1
    from public.rotation_cycles rc
    where rc.collection_id = p_collection_id
  ) then
    raise exception 'Rotation member order cannot be reseeded after cycles exist.';
  end if;

  delete from public.rotation_members
  where collection_id = p_collection_id;

  insert into public.rotation_members (
    collection_id,
    participant_id,
    recipient_position
  )
  select
    p_collection_id,
    p.id,
    row_number() over (
      order by p.created_at asc, p.id asc
    )::integer
  from public.participants p
  where p.collection_id = p_collection_id
    and p.is_active = true;

  get diagnostics v_count = row_count;

  if v_count < 2 then
    raise exception 'A rotational Collection requires at least two active participants.';
  end if;

  return v_count;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."seed_rotation_members"(uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."seed_rotation_members"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."seed_rotation_members"(uuid) TO "postgres";

REVOKE ALL ON FUNCTION "public"."seed_rotation_members"(uuid) FROM PUBLIC, "anon", "authenticated";
