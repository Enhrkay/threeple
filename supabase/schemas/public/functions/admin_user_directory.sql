CREATE OR REPLACE FUNCTION public.admin_user_directory (
  search_query  text    DEFAULT NULL::text,
  result_limit  integer DEFAULT 50,
  result_offset integer DEFAULT 0
)
  RETURNS TABLE (
    user_id               uuid,
    email                 text,
    full_name             text,
    account_created_at    timestamp with time zone,
    organized_collections bigint,
    joined_collections    bigint,
    admin_role            text,
    admin_active          boolean
  )
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO 'public', 'auth'
  AS $function$
  select
    u.id as user_id,

    u.email::text as email,

    p.full_name,

    u.created_at as account_created_at,

    (
      select count(*)
      from public.collections c
      where c.created_by = u.id
    )::bigint as organized_collections,

    (
      select count(distinct pt.collection_id)
      from public.participants pt
      where pt.user_id = u.id
    )::bigint as joined_collections,

    pa.role as admin_role,

    coalesce(
      pa.is_active,
      false
    ) as admin_active

  from auth.users u

  left join public.profiles p
    on p.id = u.id

  left join public.platform_admins pa
    on pa.user_id = u.id

  where
    search_query is null

    or trim(search_query) = ''

    or coalesce(
      p.full_name,
      ''
    ) ilike
      '%' || trim(search_query) || '%'

    or coalesce(
      u.email,
      ''
    ) ilike
      '%' || trim(search_query) || '%'

  order by
    u.created_at desc

  limit greatest(
    1,
    least(
      result_limit,
      100
    )
  )

  offset greatest(
    result_offset,
    0
  );
$function$;

GRANT EXECUTE ON FUNCTION "public"."admin_user_directory"(text, integer, integer) TO "service_role";

REVOKE ALL ON FUNCTION "public"."admin_user_directory"(text, integer, integer) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_user_directory"(text, integer, integer) TO "postgres";

REVOKE ALL ON FUNCTION "public"."admin_user_directory"(text, integer, integer) FROM PUBLIC, "anon", "authenticated";
