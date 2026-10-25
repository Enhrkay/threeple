CREATE OR REPLACE FUNCTION public.admin_restrict_user (
  p_admin_user_id    uuid,
  p_report_id        uuid,
  p_user_id          uuid,
  p_restriction_type text,
  p_reason           text
)
  RETURNS TABLE (
    restriction_id   uuid,
    user_id          uuid,
    report_id        uuid,
    restriction_type text,
    imposed_at       timestamp with time zone
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$

declare
  v_admin_role text;

  v_report public.trust_safety_reports%rowtype;

  v_user_name text;

  v_existing_restriction_id uuid;

  v_restriction_id uuid;

  v_imposed_at timestamptz :=
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
      'RESTRICTION_REASON_REQUIRED';
  end if;

  if p_restriction_type not in (
    'participation_block',
    'organizer_block',
    'full_platform'
  ) then
    raise exception
      'INVALID_RESTRICTION_TYPE';
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

  -- ======================================================
  -- CASE MUST AUTHORIZE THIS USER
  --
  -- For user enforcement, the case itself must identify
  -- the same user as its subject.
  -- ======================================================

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
  -- ACTIVE RESTRICTION CHECK
  -- ======================================================

  select
    ur.id
  into
    v_existing_restriction_id
  from
    public.user_restrictions ur
  where
    ur.user_id =
      p_user_id
    and ur.lifted_at is null
  limit 1;

  if v_existing_restriction_id is not null then
    raise exception
      'ACTIVE_USER_RESTRICTION_EXISTS';
  end if;

  -- ======================================================
  -- CREATE RESTRICTION
  -- ======================================================

  insert into
    public.user_restrictions (
      user_id,
      trust_safety_report_id,
      restriction_type,
      reason,
      imposed_by,
      imposed_at,
      created_at,
      updated_at
    )
  values (
    p_user_id,
    p_report_id,
    p_restriction_type,
    btrim(p_reason),
    p_admin_user_id,
    v_imposed_at,
    v_imposed_at,
    v_imposed_at
  )
  returning id
  into v_restriction_id;

  -- ======================================================
  -- ADMIN AUDIT LOG
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
    'user.restricted',
    'user',
    p_user_id,
    p_report_id,
    btrim(p_reason),

    jsonb_build_object(
      'active',
      false
    ),

    jsonb_build_object(
      'active',
      true,

      'restriction_id',
      v_restriction_id,

      'restriction_type',
      p_restriction_type,

      'imposed_at',
      v_imposed_at
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
    v_restriction_id,
    p_user_id,
    p_report_id,
    p_restriction_type,
    v_imposed_at;

end;

$function$;

GRANT EXECUTE ON FUNCTION "public"."admin_restrict_user"(uuid, uuid, uuid, text, text) TO PUBLIC, "authenticated";

GRANT EXECUTE ON FUNCTION "public"."admin_restrict_user"(uuid, uuid, uuid, text, text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."admin_restrict_user"(uuid, uuid, uuid, text, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_restrict_user"(uuid, uuid, uuid, text, text) TO "postgres";

REVOKE ALL ON FUNCTION "public"."admin_restrict_user"(uuid, uuid, uuid, text, text) FROM "anon";
