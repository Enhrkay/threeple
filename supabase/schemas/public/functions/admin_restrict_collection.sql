CREATE OR REPLACE FUNCTION public.admin_restrict_collection (
  p_admin_user_id    uuid,
  p_report_id        uuid,
  p_collection_id    uuid,
  p_restriction_type text,
  p_reason           text
)
  RETURNS TABLE (
    restriction_id   uuid,
    collection_id    uuid,
    report_id        uuid,
    restriction_type text,
    imposed_at       timestamp with time zone
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'auth'
  AS $function$
declare
  v_admin public.platform_admins%rowtype;
  v_report public.trust_safety_reports%rowtype;
  v_collection public.collections%rowtype;
  v_existing_restriction public.collection_restrictions%rowtype;
  v_new_restriction public.collection_restrictions%rowtype;
  v_reason text;
begin

  -- =======================================================
  -- VALIDATE REASON
  -- =======================================================

  v_reason :=
    trim(
      coalesce(
        p_reason,
        ''
      )
    );

  if length(v_reason) < 10 then
    raise exception
      'A Collection restriction reason of at least 10 characters is required.';
  end if;


  -- =======================================================
  -- VALIDATE RESTRICTION TYPE
  -- =======================================================

  if p_restriction_type not in (
    'join_block',
    'organizer_changes_block',
    'full_collection'
  ) then

    raise exception
      'Invalid Collection restriction type.';

  end if;


  -- =======================================================
  -- VALIDATE PLATFORM ADMIN
  -- =======================================================

  select pa.*
  into v_admin
  from public.platform_admins as pa
  where pa.user_id =
    p_admin_user_id
  and pa.is_active = true
  for update;

  if not found then
    raise exception
      'Active platform administrator access is required.';
  end if;


  if v_admin.role not in (
    'super_admin',
    'admin',
    'risk_ops'
  ) then

    raise exception
      'This administrator role cannot restrict Collections.';
  end if;


  -- =======================================================
  -- LOCK + VALIDATE TRUST & SAFETY CASE
  -- =======================================================

  select tsr.*
  into v_report
  from public.trust_safety_reports as tsr
  where tsr.id =
    p_report_id
  for update;

  if not found then
    raise exception
      'Trust & Safety report not found.';
  end if;


  if v_report.status <>
    'action_required'
  then

    raise exception
      'Only Trust & Safety cases marked Action Required can authorize a Collection restriction.';

  end if;


  if v_report.collection_id is null then
    raise exception
      'This Trust & Safety case is not linked to a Collection.';
  end if;


  if v_report.collection_id <>
    p_collection_id
  then

    raise exception
      'The Trust & Safety case does not belong to the specified Collection.';
  end if;


  -- =======================================================
  -- LOCK + VALIDATE COLLECTION
  -- =======================================================

  select c.*
  into v_collection
  from public.collections as c
  where c.id =
    p_collection_id
  for update;

  if not found then
    raise exception
      'Collection not found.';
  end if;


  -- =======================================================
  -- PREVENT DUPLICATE ACTIVE RESTRICTIONS
  -- =======================================================

  select cr.*
  into v_existing_restriction
  from public.collection_restrictions as cr
  where cr.collection_id =
    p_collection_id
  and cr.lifted_at is null
  limit 1
  for update;

  if found then
    raise exception
      'This Collection already has an active platform restriction.';
  end if;


  -- =======================================================
  -- CREATE RESTRICTION
  -- =======================================================

  insert into public.collection_restrictions (
    collection_id,
    trust_safety_report_id,
    restriction_type,
    reason,
    imposed_by,
    metadata
  )
  values (
    p_collection_id,
    p_report_id,
    p_restriction_type,
    v_reason,
    p_admin_user_id,

    jsonb_build_object(
      'collection_status',
        v_collection.status,

      'collection_archived',
        v_collection.archived_at is not null,

      'report_reference',
        v_report.report_reference
    )
  )
  returning *
  into v_new_restriction;


  -- =======================================================
  -- AUDIT ADMIN ACTION
  -- =======================================================

  insert into public.platform_admin_actions (
    admin_user_id,
    admin_role,
    action_type,
    subject_type,
    subject_id,
    trust_safety_report_id,
    reason,
    previous_state,
    new_state,
    metadata
  )
  values (
    p_admin_user_id,

    v_admin.role,

    'collection.restricted',

    'collection',

    p_collection_id,

    p_report_id,

    v_reason,

    jsonb_build_object(
      'restriction_active',
        false,

      'collection_status',
        v_collection.status,

      'archived_at',
        v_collection.archived_at
    ),

    jsonb_build_object(
      'restriction_active',
        true,

      'restriction_id',
        v_new_restriction.id,

      'restriction_type',
        v_new_restriction.restriction_type,

      'imposed_at',
        v_new_restriction.imposed_at,

      'collection_status',
        v_collection.status
    ),

    jsonb_build_object(
      'report_reference',
        v_report.report_reference,

      'collection_title',
        v_collection.title
    )
  );


  -- =======================================================
  -- RETURN RESULT
  -- =======================================================

  return query
  select
    v_new_restriction.id,
    v_new_restriction.collection_id,
    v_new_restriction.trust_safety_report_id,
    v_new_restriction.restriction_type,
    v_new_restriction.imposed_at;

end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."admin_restrict_collection"(uuid, uuid, uuid, text, text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."admin_restrict_collection"(uuid, uuid, uuid, text, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_restrict_collection"(uuid, uuid, uuid, text, text) TO "postgres";

REVOKE ALL ON FUNCTION "public"."admin_restrict_collection"(uuid, uuid, uuid, text, text) FROM PUBLIC, "anon", "authenticated";
