CREATE OR REPLACE FUNCTION public.admin_lift_organization_restriction (
  p_admin_user_id   uuid,
  p_report_id       uuid,
  p_organization_id uuid,
  p_reason          text
)
  RETURNS TABLE (
    restriction_id   uuid,
    organization_id  uuid,
    restriction_type text,
    lifted_by        uuid,
    lifted_at        timestamp with time zone
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
  v_restriction_type text;
  v_restriction_report_id uuid;
  v_lifted_at timestamptz;
begin

  if p_admin_user_id is null then
    raise exception 'ADMIN_USER_REQUIRED';
  end if;

  if p_report_id is null then
    raise exception 'REPORT_REQUIRED';
  end if;

  if p_organization_id is null then
    raise exception 'ORGANIZATION_REQUIRED';
  end if;

  if
    p_reason is null
    or char_length(trim(p_reason)) < 10
  then
    raise exception 'LIFT_REASON_REQUIRED';
  end if;

  -- ======================================================
  -- ADMIN AUTHORIZATION
  -- ======================================================

  select pa.role
  into v_admin_role
  from public.platform_admins pa
  where pa.user_id = p_admin_user_id
    and pa.is_active = true
  limit 1;

  if v_admin_role is null then
    raise exception 'ADMIN_NOT_AUTHORIZED';
  end if;

  if v_admin_role not in (
    'super_admin',
    'admin',
    'risk_ops'
  ) then
    raise exception 'ADMIN_NOT_AUTHORIZED';
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
  where tsr.id = p_report_id;

  if not found then
    raise exception 'TRUST_SAFETY_REPORT_NOT_FOUND';
  end if;

  if v_report_status <> 'action_required' then
    raise exception 'CASE_NOT_ACTION_REQUIRED';
  end if;

  if v_subject_type <> 'organization' then
    raise exception 'CASE_SUBJECT_NOT_ORGANIZATION';
  end if;

  if v_subject_id <> p_organization_id then
    raise exception 'CASE_ORGANIZATION_MISMATCH';
  end if;

  -- ======================================================
  -- FIND EXACT ACTIVE RESTRICTION
  -- ======================================================

  select
    obr.id,
    obr.restriction_type,
    obr.trust_safety_report_id
  into
    v_restriction_id,
    v_restriction_type,
    v_restriction_report_id
  from public.organization_restrictions obr
  where obr.organization_id = p_organization_id
    and obr.lifted_at is null
  order by obr.imposed_at desc
  limit 1;

  if v_restriction_id is null then
    raise exception
      'ACTIVE_ORGANIZATION_RESTRICTION_NOT_FOUND';
  end if;

  if v_restriction_report_id <> p_report_id then
    raise exception
      'RESTRICTION_NOT_OWNED_BY_CASE';
  end if;

  -- ======================================================
  -- LIFT RESTRICTION
  -- ======================================================

  v_lifted_at := now();

  update public.organization_restrictions as obr
  set
    lifted_by = p_admin_user_id,
    lifted_at = v_lifted_at,
    lift_reason = trim(p_reason),
    updated_at = now()
  where obr.id = v_restriction_id
    and obr.lifted_at is null;

  if not found then
    raise exception
      'ORGANIZATION_RESTRICTION_LIFT_FAILED';
  end if;

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
    'organization.restriction_lifted',
    'organization',
    p_organization_id,
    trim(p_reason),

    jsonb_build_object(
      'restriction_id',
      v_restriction_id,
      'restriction_type',
      v_restriction_type,
      'active',
      true
    ),

    jsonb_build_object(
      'restriction_id',
      v_restriction_id,
      'restriction_type',
      v_restriction_type,
      'active',
      false,
      'lifted_at',
      v_lifted_at
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
    v_restriction_type,
    p_admin_user_id,
    v_lifted_at;

end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."admin_lift_organization_restriction"(uuid, uuid, uuid, text) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."admin_lift_organization_restriction"(uuid, uuid, uuid, text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."admin_lift_organization_restriction"(uuid, uuid, uuid, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_lift_organization_restriction"(uuid, uuid, uuid, text) TO "postgres";

REVOKE ALL ON FUNCTION "public"."admin_lift_organization_restriction"(uuid, uuid, uuid, text) FROM PUBLIC, "anon";
