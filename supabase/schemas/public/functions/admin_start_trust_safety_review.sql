CREATE OR REPLACE FUNCTION public.admin_start_trust_safety_review (
  p_admin_user_id uuid,
  p_report_id     uuid,
  p_priority      text,
  p_reason        text
)
  RETURNS TABLE (
    report_id        uuid,
    report_reference text,
    new_status       text,
    new_priority     text
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'auth'
  AS $function$
declare
  v_admin public.platform_admins%rowtype;
  v_report public.trust_safety_reports%rowtype;
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
      'A review reason of at least 10 characters is required.';
  end if;


  -- =======================================================
  -- VALIDATE PRIORITY
  -- =======================================================

  if p_priority not in (
    'low',
    'normal',
    'high',
    'urgent'
  ) then

    raise exception
      'Invalid Trust & Safety priority.';

  end if;


  -- =======================================================
  -- VALIDATE PLATFORM ADMIN
  -- =======================================================

  select *
  into v_admin
  from public.platform_admins
  where user_id =
    p_admin_user_id
  and is_active = true
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
      'This administrator role cannot start Trust & Safety reviews.';

  end if;


  -- =======================================================
  -- LOCK + VALIDATE REPORT
  -- =======================================================

  select *
  into v_report
  from public.trust_safety_reports
  where id =
    p_report_id
  for update;

  if not found then
    raise exception
      'Trust & Safety report not found.';
  end if;


  if v_report.status <> 'open' then
    raise exception
      'Only open Trust & Safety cases can start a new review.';
  end if;


  -- =======================================================
  -- UPDATE CASE
  -- =======================================================

  update public.trust_safety_reports
  set
    assigned_admin_id =
      v_admin.id,

    priority =
      p_priority,

    status =
      'under_review'

  where id =
    v_report.id;


  -- =======================================================
  -- AUDIT ACTION
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

    'trust_safety.review_started',

    'trust_safety_report',

    v_report.id,

    v_report.id,

    v_reason,

    jsonb_build_object(
      'status',
        v_report.status,

      'priority',
        v_report.priority,

      'assigned_admin_id',
        v_report.assigned_admin_id
    ),

    jsonb_build_object(
      'status',
        'under_review',

      'priority',
        p_priority,

      'assigned_admin_id',
        v_admin.id
    ),

    jsonb_build_object(
      'report_reference',
        v_report.report_reference
    )
  );


  -- =======================================================
  -- RETURN RESULT
  -- =======================================================

  return query
  select
    v_report.id,
    v_report.report_reference,
    'under_review'::text,
    p_priority;

end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."admin_start_trust_safety_review"(uuid, uuid, text, text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."admin_start_trust_safety_review"(uuid, uuid, text, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_start_trust_safety_review"(uuid, uuid, text, text) TO "postgres";

REVOKE ALL ON FUNCTION "public"."admin_start_trust_safety_review"(uuid, uuid, text, text) FROM PUBLIC, "anon", "authenticated";
