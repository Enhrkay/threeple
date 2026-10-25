CREATE OR REPLACE FUNCTION public.lookup_collection_capacity_by_code (
  p_join_code text
)
  RETURNS TABLE (
    collection_id                  uuid,
    expected_participant_count     integer,
    joined_participants            integer,
    remaining_slots                integer,
    is_full                        boolean,
    contribution_amount_policy     text,
    calculated_contribution_amount numeric,
    default_amount                 numeric
  )
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select
    ccs.collection_id,
    ccs.expected_participant_count,
    ccs.joined_participants,
    ccs.remaining_slots,
    ccs.is_full,
    ccs.contribution_amount_policy,
    ccs.calculated_contribution_amount,
    ccs.default_amount
  from public.collection_capacity_summary ccs
  join public.collections c
    on c.id = ccs.collection_id
  where upper(c.join_code) = upper(trim(p_join_code))
    and c.status = 'active'
    and c.archived_at is null
  limit 1;
$function$;

GRANT EXECUTE ON FUNCTION "public"."lookup_collection_capacity_by_code"(text) TO "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."lookup_collection_capacity_by_code"(text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."lookup_collection_capacity_by_code"(text) FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."lookup_collection_capacity_by_code"(text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."lookup_collection_capacity_by_code"(text) TO "postgres";
