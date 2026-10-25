CREATE OR REPLACE FUNCTION public.admin_decide_restriction_review (
  p_admin_user_id     uuid,
  p_review_request_id uuid,
  p_decision          text,
  p_admin_notes       text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  v_admin public.platform_admins%rowtype;
  v_request public.restriction_review_requests%rowtype;
  v_now timestamptz := now();
  v_lifted_at timestamptz;
  v_was_active boolean := false;
begin
  if p_decision not in ('approved', 'declined') then
    raise exception 'Invalid review decision.';
  end if;

  if char_length(trim(coalesce(p_admin_notes, ''))) < 10 then
    raise exception 'Admin notes must be at least 10 characters.';
  end if;

  select *
  into v_admin
  from public.platform_admins
  where user_id = p_admin_user_id
    and is_active = true
  limit 1;

  if not found then
    raise exception 'Active platform administrator required.';
  end if;

  if v_admin.role not in ('super_admin', 'admin', 'risk_ops') then
    raise exception 'Administrator role is not authorized to decide restriction reviews.';
  end if;

  select *
  into v_request
  from public.restriction_review_requests
  where id = p_review_request_id
  for update;

  if not found then
    raise exception 'Restriction review request not found.';
  end if;

  if v_request.status not in ('submitted', 'under_review') then
    raise exception 'Restriction review request has already been decided.';
  end if;

  if v_request.restriction_id is null then
    raise exception 'Restriction review request is not linked to an exact restriction.';
  end if;

  if v_request.restriction_scope = 'user' then
    select lifted_at
    into v_lifted_at
    from public.user_restrictions
    where id = v_request.restriction_id
      and user_id = v_request.restriction_subject_id
      and restriction_type = v_request.restriction_type
    for update;

  elsif v_request.restriction_scope = 'organization' then
    select lifted_at
    into v_lifted_at
    from public.organization_restrictions
    where id = v_request.restriction_id
      and organization_id = v_request.restriction_subject_id
      and restriction_type = v_request.restriction_type
    for update;

  elsif v_request.restriction_scope = 'collection' then
    select lifted_at
    into v_lifted_at
    from public.collection_restrictions
    where id = v_request.restriction_id
      and collection_id = v_request.restriction_subject_id
      and restriction_type = v_request.restriction_type
    for update;

  else
    raise exception 'Unsupported restriction scope.';
  end if;

  if not found then
    raise exception 'Exact restriction record not found.';
  end if;

  v_was_active := v_lifted_at is null;

  if p_decision = 'approved' and v_was_active then
    if v_request.restriction_scope = 'user' then
      update public.user_restrictions
      set
        lifted_by = p_admin_user_id,
        lifted_at = v_now,
        lift_reason = trim(p_admin_notes)
      where id = v_request.restriction_id;

    elsif v_request.restriction_scope = 'organization' then
      update public.organization_restrictions
      set
        lifted_by = p_admin_user_id,
        lifted_at = v_now,
        lift_reason = trim(p_admin_notes)
      where id = v_request.restriction_id;

    elsif v_request.restriction_scope = 'collection' then
      update public.collection_restrictions
      set
        lifted_by = p_admin_user_id,
        lifted_at = v_now,
        lift_reason = trim(p_admin_notes)
      where id = v_request.restriction_id;
    end if;
  end if;

  update public.restriction_review_requests
  set
    status = p_decision,
    reviewed_by = p_admin_user_id,
    admin_notes = trim(p_admin_notes),
    reviewed_at = v_now,
    updated_at = v_now
  where id = p_review_request_id;

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
    created_at,
    metadata
  )
  values (
    p_admin_user_id,
    v_admin.role,
    case
      when p_decision = 'approved'
        then 'restriction_review.approved'
      else 'restriction_review.declined'
    end,
    'restriction_review',
    p_review_request_id,
    trim(p_admin_notes),
    jsonb_build_object(
      'review_status', v_request.status,
      'restriction_scope', v_request.restriction_scope,
      'restriction_subject_id', v_request.restriction_subject_id,
      'restriction_type', v_request.restriction_type,
      'restriction_id', v_request.restriction_id,
      'restriction_was_active_at_decision', v_was_active
    ),
    jsonb_build_object(
      'review_status', p_decision,
      'restriction_scope', v_request.restriction_scope,
      'restriction_subject_id', v_request.restriction_subject_id,
      'restriction_type', v_request.restriction_type,
      'restriction_id', v_request.restriction_id,
      'restriction_active_after_decision',
        case
          when p_decision = 'approved' then false
          else v_was_active
        end
    ),
    v_request.trust_safety_report_id,
    v_now,
    jsonb_build_object(
      'review_request_id', p_review_request_id,
      'requester_user_id', v_request.requester_user_id,
      'decision', p_decision,
      'restriction_id', v_request.restriction_id,
      'restriction_already_lifted', not v_was_active
    )
  );
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."admin_decide_restriction_review"(uuid, uuid, text, text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."admin_decide_restriction_review"(uuid, uuid, text, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_decide_restriction_review"(uuid, uuid, text, text) TO "postgres";

REVOKE ALL ON FUNCTION "public"."admin_decide_restriction_review"(uuid, uuid, text, text) FROM PUBLIC, "anon", "authenticated";
