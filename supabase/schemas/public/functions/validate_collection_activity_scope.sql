CREATE OR REPLACE FUNCTION public.validate_collection_activity_scope()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  expected_organization_id uuid;
begin

  select organization_id
  into expected_organization_id
  from public.collections
  where id = new.collection_id;

  if expected_organization_id is null then
    raise exception
      'Collection does not exist.';
  end if;

  if expected_organization_id <> new.organization_id then
    raise exception
      'Collection organization mismatch.';
  end if;

  return new;

end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."validate_collection_activity_scope"() TO PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."validate_collection_activity_scope"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."validate_collection_activity_scope"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."validate_collection_activity_scope"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."validate_collection_activity_scope"() FROM "anon", "authenticated";
