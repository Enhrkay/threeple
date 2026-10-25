CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_workspace_name text;
begin

  -- Create profile
  insert into public.profiles (
    id,
    full_name
  )
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name'
  )
  on conflict (id) do nothing;


  -- Friendly workspace name
  if nullif(
    trim(new.raw_user_meta_data ->> 'full_name'),
    ''
  ) is not null then

    v_workspace_name :=
      trim(new.raw_user_meta_data ->> 'full_name')
      || '''s Workspace';

  else

    v_workspace_name := 'My Threeple Workspace';

  end if;


  -- Create personal workspace
  insert into public.organizations (
    owner_id,
    name,
    organization_type
  )
  values (
    new.id,
    v_workspace_name,
    'personal'
  )
  on conflict do nothing;


  return new;

end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC, "anon", "authenticated";
