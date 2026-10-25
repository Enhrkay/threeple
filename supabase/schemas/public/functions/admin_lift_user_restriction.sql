CREATE OR REPLACE FUNCTION public.admin_lift_user_restriction (
  p_admin_user_id uuid,
  p_report_id     uuid,
  p_user_id       uuid,
  p_reason        text
)
  RETURNS TABLE (
    restriction_id   uuid,
    user_id          uuid,
    report_id        uuid,
    restriction_type text,
    lifted_at        timestamp with time zone
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$

declare
  v_admin_role text;

  v_report public.trust_safety_reports%rowtype;

  v_user_name text;

  v_restriction public.user_restrictions%rowtype;

  v_lifted_at timestamptz :=
    now();

begin

  -- ======================================================
  -- VALIDATE INPUT
  -- ======================================================

  if p_admin_user_id is null then
    raise exception
      'ADMIN_USER_ID_REQUIRED';
  end if;

  if p_report_id is null then
    raise exception
      'REPORT_ID_REQUIRED';
  end if;

  if p_user_id is null then
    raise exception
      'USER_ID_REQUIRED';
  end if;

  if
    p_reason is null
    or char_length(
      btrim(p_reason)
    ) < 10
  then
    raise exception
      'LIFT_REASON_REQUIRED';
  end if;

  -- ======================================================
  -- AUTHORIZED PLATFORM ADMIN
  -- ======================================================

  select
    pa.role
  into
    v_admin_role
  from
    public.platform_admins pa
  where
    pa.user_id =
      p_admin_user_id
    and pa.is_active = true
    and pa.role in (
      'super_admin',
      'admin',
      'risk_ops'
    )
  limit 1;

  if v_admin_role is null then
    raise exception
      'ADMIN_NOT_AUTHORIZED';
  end if;

  -- ======================================================
  -- TRUST & SAFETY CASE
  -- ======================================================

  select
    tsr.*
  into
    v_report
  from
    public.trust_safety_reports tsr
  where
    tsr.id =
      p_report_id
  for update;

  if v_report.id is null then
    raise exception
      'TRUST_SAFETY_CASE_NOT_FOUND';
  end if;

  if v_report.status <> 'action_required' then
    raise exception
      'CASE_NOT_ACTION_REQUIRED';
  end if;

  if
    v_report.subject_type <> 'user'
    or v_report.subject_id <> p_user_id
  then
    raise exception
      'CASE_USER_MISMATCH';
  end if;

  -- ======================================================
  -- USER
  -- ======================================================

  select
    p.full_name
  into
    v_user_name
  from
    public.profiles p
  where
    p.id =
      p_user_id
  limit 1;

  if not found then
    raise exception
      'USER_NOT_FOUND';
  end if;

  -- ======================================================
  -- LOCK EXACT ACTIVE RESTRICTION
  -- ======================================================

  select
    ur.*
  into
    v_restriction
  from
    public.user_restrictions ur
  where
    ur.user_id =
      p_user_id
    and ur.trust_safety_report_id =
      p_report_id
    and ur.lifted_at is null
  for update;

  if not found then
    raise exception
      'ACTIVE_USER_RESTRICTION_NOT_FOUND';
  end if;

  -- ======================================================
  -- LIFT
  -- ======================================================

  update
    public.user_restrictions
  set
    lifted_by =
      p_admin_user_id,

    lifted_at =
      v_lifted_at,

    lift_reason =
      btrim(p_reason),

    updated_at =
      v_lifted_at
  where
    id =
      v_restriction.id;

  -- ======================================================
  -- AUDIT LOG
  -- ======================================================

  insert into
    public.platform_admin_actions (
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
    v_admin_role,
    'user.restriction_lifted',
    'user',
    p_user_id,
    p_report_id,
    btrim(p_reason),

    jsonb_build_object(
      'active',
      true,

      'restriction_id',
      v_restriction.id,

      'restriction_type',
      v_restriction.restriction_type,

      'imposed_at',
      v_restriction.imposed_at
    ),

    jsonb_build_object(
      'active',
      false,

      'restriction_id',
      v_restriction.id,

      'restriction_type',
      v_restriction.restriction_type,

      'lifted_at',
      v_lifted_at,

      'lifted_by',
      p_admin_user_id
    ),

    jsonb_build_object(
      'report_reference',
      v_report.report_reference,

      'user_name',
      v_user_name
    )
  );

  -- ======================================================
  -- RETURN
  -- ======================================================

  return query
  select
    v_restriction.id,
    p_user_id,
    p_report_id,
    v_restriction.restriction_type,
    v_lifted_at;

end;

$function$;

GRANT EXECUTE ON FUNCTION "public"."admin_lift_user_restriction"(uuid, uuid, uuid, text) TO PUBLIC, "authenticated";

GRANT EXECUTE ON FUNCTION "public"."admin_lift_user_restriction"(uuid, uuid, uuid, text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."admin_lift_user_restriction"(uuid, uuid, uuid, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_lift_user_restriction"(uuid, uuid, uuid, text) TO "postgres";

REVOKE ALL ON FUNCTION "public"."admin_lift_user_restriction"(uuid, uuid, uuid, text) FROM "anon";
