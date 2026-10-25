CREATE OR REPLACE FUNCTION public.admin_restrict_organization (
  p_admin_user_id    uuid,
  p_report_id        uuid,
  p_organization_id  uuid,
  p_restriction_type text,
  p_reason           text
)
  RETURNS TABLE (
    restriction_id         uuid,
    organization_id        uuid,
    trust_safety_report_id uuid,
    restriction_type       text,
    reason                 text,
    imposed_by             uuid,
    imposed_at             timestamp with time zone
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  v_admin_role text;
  v_report_status text;
  v_subject_type text;
  v_subject_id uuid;
  v_restriction_id uuid;
  v_imposed_at timestamptz;
begin

  if p_admin_user_id is null then
    raise exception
      'ADMIN_USER_REQUIRED';
  end if;

  if p_report_id is null then
    raise exception
      'REPORT_REQUIRED';
  end if;

  if p_organization_id is null then
    raise exception
      'ORGANIZATION_REQUIRED';
  end if;

  if p_restriction_type not in (
    'new_collection_block',
    'organizer_changes_block',
    'full_organization'
  ) then
    raise exception
      'INVALID_RESTRICTION_TYPE';
  end if;

  if
    p_reason is null
    or char_length(trim(p_reason)) < 10
  then
    raise exception
      'RESTRICTION_REASON_REQUIRED';
  end if;

  -- ======================================================
  -- ADMIN AUTHORIZATION
  -- ======================================================

  select pa.role
  into v_admin_role
  from public.platform_admins pa
  where pa.user_id =
    p_admin_user_id
    and pa.is_active = true
  limit 1;

  if v_admin_role is null then
    raise exception
      'ADMIN_NOT_AUTHORIZED';
  end if;

  if v_admin_role not in (
    'super_admin',
    'admin',
    'risk_ops'
  ) then
    raise exception
      'ADMIN_NOT_AUTHORIZED';
  end if;

  -- ======================================================
  -- VERIFY TRUST & SAFETY CASE
  -- ======================================================

  select
    tsr.status,
    tsr.subject_type,
    tsr.subject_id
  into
    v_report_status,
    v_subject_type,
    v_subject_id
  from public.trust_safety_reports tsr
  where tsr.id =
    p_report_id;

  if not found then
    raise exception
      'TRUST_SAFETY_REPORT_NOT_FOUND';
  end if;

  if v_report_status <>
    'action_required'
  then
    raise exception
      'CASE_NOT_ACTION_REQUIRED';
  end if;

  if v_subject_type <>
    'organization'
  then
    raise exception
      'CASE_SUBJECT_NOT_ORGANIZATION';
  end if;

  if v_subject_id <>
    p_organization_id
  then
    raise exception
      'CASE_ORGANIZATION_MISMATCH';
  end if;

  -- ======================================================
  -- VERIFY ORGANIZATION
  -- ======================================================

  if not exists (
    select 1
    from public.organizations o
    where o.id =
      p_organization_id
  ) then
    raise exception
      'ORGANIZATION_NOT_FOUND';
  end if;

  -- ======================================================
  -- PREVENT MULTIPLE ACTIVE RESTRICTIONS
  -- ======================================================

  if exists (
    select 1
    from public.organization_restrictions obr
    where obr.organization_id =
      p_organization_id
      and obr.lifted_at is null
  ) then
    raise exception
      'ORGANIZATION_ALREADY_RESTRICTED';
  end if;

  -- ======================================================
  -- APPLY RESTRICTION
  -- ======================================================

  insert into public.organization_restrictions
    as obr (
      organization_id,
      trust_safety_report_id,
      restriction_type,
      reason,
      imposed_by
    )
  values (
    p_organization_id,
    p_report_id,
    p_restriction_type,
    trim(p_reason),
    p_admin_user_id
  )
  returning
    obr.id,
    obr.imposed_at
  into
    v_restriction_id,
    v_imposed_at;

  -- ======================================================
  -- ADMIN AUDIT
  -- ======================================================

  insert into public.platform_admin_actions (
    admin_user_id,
    admin_role,
    action_type,
    subject_type,
    subject_id,
    reason,
    previous_state,
    new_state,
    trust_safety_report_id,
    metadata
  )
  values (
    p_admin_user_id,
    v_admin_role,
    'organization.restricted',
    'organization',
    p_organization_id,
    trim(p_reason),

    jsonb_build_object(
      'active_restriction',
      null
    ),

    jsonb_build_object(
      'restriction_id',
      v_restriction_id,
      'restriction_type',
      p_restriction_type,
      'active',
      true
    ),

    p_report_id,

    jsonb_build_object(
      'restriction_scope',
      'organization'
    )
  );

  return query
  select
    v_restriction_id,
    p_organization_id,
    p_report_id,
    p_restriction_type,
    trim(p_reason),
    p_admin_user_id,
    v_imposed_at;

end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."admin_restrict_organization"(uuid, uuid, uuid, text, text) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."admin_restrict_organization"(uuid, uuid, uuid, text, text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."admin_restrict_organization"(uuid, uuid, uuid, text, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_restrict_organization"(uuid, uuid, uuid, text, text) TO "postgres";

REVOKE ALL ON FUNCTION "public"."admin_restrict_organization"(uuid, uuid, uuid, text, text) FROM PUBLIC, "anon";
