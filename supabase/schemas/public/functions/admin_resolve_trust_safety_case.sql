CREATE OR REPLACE FUNCTION public.admin_resolve_trust_safety_case (
  p_admin_user_id    uuid,
  p_report_id        uuid,
  p_resolution_notes text
)
  RETURNS TABLE (
    report_id        uuid,
    case_status      text,
    case_resolved_at timestamp with time zone
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  v_admin_role text;
  v_report public.trust_safety_reports%rowtype;
  v_active_restriction_count integer := 0;
  v_now timestamptz := now();
begin

  if p_resolution_notes is null
     or length(trim(p_resolution_notes)) < 10 then
    raise exception
      'Resolution notes must contain at least 10 characters';
  end if;

  select
    pa.role
  into
    v_admin_role
  from public.platform_admins as pa
  where pa.user_id = p_admin_user_id
    and pa.is_active = true
  limit 1;

  if v_admin_role is null then
    raise exception
      'Active platform administrator not found';
  end if;

  if v_admin_role not in (
    'super_admin',
    'admin',
    'risk_ops'
  ) then
    raise exception
      'Administrator is not authorized to resolve Trust & Safety cases';
  end if;

  select
    tsr.*
  into
    v_report
  from public.trust_safety_reports as tsr
  where tsr.id = p_report_id
  for update;

  if v_report.id is null then
    raise exception
      'Trust & Safety case not found';
  end if;

  if v_report.status <> 'action_required' then
    raise exception
      'Only Action Required cases may be resolved from this workflow';
  end if;

  if v_report.collection_id is not null then

    select
      count(*)
    into
      v_active_restriction_count
    from public.collection_restrictions as cr
    where cr.collection_id =
      v_report.collection_id
      and cr.lifted_at is null;

    if v_active_restriction_count > 0 then
      raise exception
        'Active Collection restriction must be lifted before resolving this case';
    end if;

  end if;

  update public.trust_safety_reports as tsr
  set
    status = 'resolved',
    resolution_notes =
      trim(p_resolution_notes),
    resolved_by =
      p_admin_user_id,
    resolved_at =
      v_now,
    updated_at =
      v_now
  where tsr.id =
    p_report_id;

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
    created_at
  )
  values (
    p_admin_user_id,
    v_admin_role,
    'trust_safety.resolved',
    'trust_safety_report',
    p_report_id,
    trim(p_resolution_notes),
    jsonb_build_object(
      'status',
      v_report.status,
      'resolved_at',
      v_report.resolved_at
    ),
    jsonb_build_object(
      'status',
      'resolved',
      'resolved_at',
      v_now
    ),
    p_report_id,
    v_now
  );

  return query
  select
    p_report_id,
    'resolved'::text,
    v_now;

end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."admin_resolve_trust_safety_case"(uuid, uuid, text) TO PUBLIC, "authenticated";

GRANT EXECUTE ON FUNCTION "public"."admin_resolve_trust_safety_case"(uuid, uuid, text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."admin_resolve_trust_safety_case"(uuid, uuid, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_resolve_trust_safety_case"(uuid, uuid, text) TO "postgres";

REVOKE ALL ON FUNCTION "public"."admin_resolve_trust_safety_case"(uuid, uuid, text) FROM "anon";
