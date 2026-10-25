CREATE OR REPLACE FUNCTION public.admin_collection_directory (
  search_query  text    DEFAULT NULL::text,
  status_filter text    DEFAULT NULL::text,
  result_limit  integer DEFAULT 50,
  result_offset integer DEFAULT 0
)
  RETURNS TABLE (
    collection_id          uuid,
    title                  text,
    join_code              text,
    organization_id        uuid,
    organization_name      text,
    created_by             uuid,
    creator_name           text,
    collection_type        text,
    collection_mode        text,
    currency               text,
    status                 text,
    archived_at            timestamp with time zone,
    deadline               timestamp with time zone,
    created_at             timestamp with time zone,
    participant_count      bigint,
    pending_approval_count bigint
  )
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO 'public', 'auth'
  AS $function$
  select
    c.id as collection_id,

    c.title,

    c.join_code,

    c.organization_id,

    o.name as organization_name,

    c.created_by,

    p.full_name as creator_name,

    c.collection_type,

    c.collection_mode,

    c.currency,

    c.status,

    c.archived_at,

    c.deadline,

    c.created_at,

    (
      select count(*)
      from public.participants pt
      where pt.collection_id = c.id
    )::bigint as participant_count,

    (
      select count(*)
      from public.participants pt
      where pt.collection_id = c.id
        and pt.participation_status = 'approval_pending'
        and pt.is_active = true
    )::bigint as pending_approval_count

  from public.collections c

  join public.organizations o
    on o.id = c.organization_id

  left join public.profiles p
    on p.id = c.created_by

  where

    (
      status_filter is null

      or trim(status_filter) = ''

      or status_filter = 'all'

      or (
        status_filter = 'archived'
        and c.archived_at is not null
      )

      or (
        status_filter <> 'archived'
        and c.status = status_filter
        and c.archived_at is null
      )
    )

    and

    (
      search_query is null

      or trim(search_query) = ''

      or coalesce(
        c.title,
        ''
      ) ilike
        '%' || trim(search_query) || '%'

      or coalesce(
        c.join_code,
        ''
      ) ilike
        '%' || trim(search_query) || '%'

      or coalesce(
        o.name,
        ''
      ) ilike
        '%' || trim(search_query) || '%'

      or coalesce(
        p.full_name,
        ''
      ) ilike
        '%' || trim(search_query) || '%'
    )

  order by
    c.created_at desc

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

GRANT EXECUTE ON FUNCTION "public"."admin_collection_directory"(text, text, integer, integer) TO "service_role";

REVOKE ALL ON FUNCTION "public"."admin_collection_directory"(text, text, integer, integer) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_collection_directory"(text, text, integer, integer) TO "postgres";

REVOKE ALL ON FUNCTION "public"."admin_collection_directory"(text, text, integer, integer) FROM PUBLIC, "anon", "authenticated";
