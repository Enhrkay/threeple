CREATE OR REPLACE FUNCTION public.admin_lift_collection_restriction (
  p_admin_user_id uuid,
  p_report_id     uuid,
  p_collection_id uuid,
  p_reason        text
)
  RETURNS TABLE (
    restriction_id   uuid,
    collection_id    uuid,
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

  v_report_reference text;
  v_report_status text;

  v_collection_title text;

  v_restriction public.collection_restrictions%rowtype;

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

  if p_collection_id is null then
    raise exception
      'COLLECTION_ID_REQUIRED';
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
  -- VALIDATE TRUST & SAFETY CASE
  -- ======================================================

  select
    tsr.report_reference,
    tsr.status
  into
    v_report_reference,
    v_report_status
  from
    public.trust_safety_reports tsr
  where
    tsr.id =
      p_report_id
    and tsr.collection_id =
      p_collection_id
  limit 1;

  if v_report_reference is null then
    raise exception
      'CASE_COLLECTION_MISMATCH';
  end if;

  if v_report_status <> 'action_required' then
    raise exception
      'CASE_NOT_ACTION_REQUIRED';
  end if;

  -- ======================================================
  -- COLLECTION
  -- ======================================================

  select
    c.title
  into
    v_collection_title
  from
    public.collections c
  where
    c.id =
      p_collection_id
  limit 1;

  if v_collection_title is null then
    raise exception
      'COLLECTION_NOT_FOUND';
  end if;

  -- ======================================================
  -- LOCK ACTIVE RESTRICTION
  -- ======================================================

  select
    cr.*
  into
    v_restriction
  from
    public.collection_restrictions cr
  where
    cr.collection_id =
      p_collection_id
    and cr.trust_safety_report_id =
      p_report_id
    and cr.lifted_at is null
  for update;

  if not found then
    raise exception
      'ACTIVE_RESTRICTION_NOT_FOUND';
  end if;

  -- ======================================================
  -- LIFT RESTRICTION
  -- ======================================================

  update
    public.collection_restrictions
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
    'collection.restriction_lifted',
    'collection',
    p_collection_id,
    p_report_id,
    btrim(p_reason),

    jsonb_build_object(
      'restriction_id',
        v_restriction.id,

      'restriction_type',
        v_restriction.restriction_type,

      'active',
        true,

      'imposed_at',
        v_restriction.imposed_at,

      'imposed_by',
        v_restriction.imposed_by
    ),

    jsonb_build_object(
      'restriction_id',
        v_restriction.id,

      'restriction_type',
        v_restriction.restriction_type,

      'active',
        false,

      'lifted_at',
        v_lifted_at,

      'lifted_by',
        p_admin_user_id
    ),

    jsonb_build_object(
      'report_reference',
        v_report_reference,

      'collection_title',
        v_collection_title
    )
  );

  return query
  select
    v_restriction.id,
    p_collection_id,
    p_report_id,
    v_restriction.restriction_type,
    v_lifted_at;

end;

$function$;

GRANT EXECUTE ON FUNCTION "public"."admin_lift_collection_restriction"(uuid, uuid, uuid, text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."admin_lift_collection_restriction"(uuid, uuid, uuid, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_lift_collection_restriction"(uuid, uuid, uuid, text) TO "postgres";

REVOKE ALL ON FUNCTION "public"."admin_lift_collection_restriction"(uuid, uuid, uuid, text) FROM PUBLIC, "anon", "authenticated";
