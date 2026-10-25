CREATE OR REPLACE FUNCTION public.admin_triage_trust_safety_case (
  p_admin_user_id uuid,
  p_report_id     uuid,
  p_new_status    text,
  p_reason        text
)
  RETURNS TABLE (
    report_id        uuid,
    report_reference text,
    previous_status  text,
    new_status       text
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
      'A triage reason of at least 10 characters is required.';
  end if;


  -- =======================================================
  -- VALIDATE TARGET STATUS
  -- =======================================================

  if p_new_status not in (
    'action_required',
    'resolved',
    'dismissed'
  ) then

    raise exception
      'Invalid Trust & Safety triage status.';

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
      'This administrator role cannot triage Trust & Safety cases.';
  end if;


  -- =======================================================
  -- LOCK + VALIDATE CASE
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


  if v_report.status <> 'under_review' then
    raise exception
      'Only cases Under Review can be triaged.';
  end if;


  -- =======================================================
  -- UPDATE CASE
  -- =======================================================

  if p_new_status in (
    'resolved',
    'dismissed'
  ) then

    update public.trust_safety_reports
    set
      status =
        p_new_status,

      resolution_notes =
        v_reason,

      resolved_by =
        p_admin_user_id,

      resolved_at =
        now()

    where id =
      v_report.id;

  else

    update public.trust_safety_reports
    set
      status =
        'action_required',

      resolution_notes =
        null,

      resolved_by =
        null,

      resolved_at =
        null

    where id =
      v_report.id;

  end if;


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

    case p_new_status
      when 'action_required'
        then 'trust_safety.action_required'

      when 'resolved'
        then 'trust_safety.resolved'

      when 'dismissed'
        then 'trust_safety.dismissed'
    end,

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
        p_new_status,

      'priority',
        v_report.priority,

      'assigned_admin_id',
        v_report.assigned_admin_id,

      'resolved',
        p_new_status in (
          'resolved',
          'dismissed'
        )
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
    v_report.status,
    p_new_status;

end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."admin_triage_trust_safety_case"(uuid, uuid, text, text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."admin_triage_trust_safety_case"(uuid, uuid, text, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_triage_trust_safety_case"(uuid, uuid, text, text) TO "postgres";

REVOKE ALL ON FUNCTION "public"."admin_triage_trust_safety_case"(uuid, uuid, text, text) FROM PUBLIC, "anon", "authenticated";
