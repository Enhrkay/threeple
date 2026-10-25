CREATE OR REPLACE FUNCTION public.recalculate_rotation_participant_payment_status (
  p_participant_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_collection_id uuid;
  v_collection_mode text;
  v_current_status text;

  v_total_obligations integer := 0;
  v_paid_obligations integer := 0;
  v_partial_obligations integer := 0;
  v_started_obligations integer := 0;

  v_new_status text;
begin
  select
    p.collection_id,
    p.payment_status,
    c.collection_mode
  into
    v_collection_id,
    v_current_status,
    v_collection_mode
  from public.participants p
  join public.collections c
    on c.id = p.collection_id
  where p.id = p_participant_id;

  if not found then
    return;
  end if;

  if v_collection_mode <> 'rotating_pool' then
    raise exception
      'Participant does not belong to a rotating-pool Collection.';
  end if;

  -- Preserve explicit exemptions.
  if v_current_status in (
    'not_required',
    'exempted'
  ) then
    return;
  end if;

  select
    count(*) filter (
      where rco.status <> 'waived'
    )::integer,

    count(*) filter (
      where rco.status = 'paid'
    )::integer,

    count(*) filter (
      where rco.status = 'partial'
    )::integer,

    count(*) filter (
      where
        rco.status in (
          'paid',
          'partial'
        )
        or coalesce(
          rco.amount_paid,
          0
        ) > 0
    )::integer
  into
    v_total_obligations,
    v_paid_obligations,
    v_partial_obligations,
    v_started_obligations
  from public.rotation_cycle_obligations rco
  join public.rotation_cycles rc
    on rc.id = rco.cycle_id
  where rco.participant_id =
      p_participant_id
    and rc.collection_id =
      v_collection_id
    and rc.status <> 'cancelled';

  if v_total_obligations = 0 then
    v_new_status := 'unpaid';

  elsif v_paid_obligations =
        v_total_obligations then
    v_new_status := 'paid';

  elsif v_partial_obligations > 0
        or v_started_obligations > 0 then
    v_new_status := 'partial';

  else
    v_new_status := 'unpaid';
  end if;

  perform set_config(
    'threeple.internal_reconciliation',
    'on',
    true
  );

  update public.participants
  set payment_status =
    v_new_status
  where id =
    p_participant_id;

  perform set_config(
    'threeple.internal_reconciliation',
    'off',
    true
  );
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."recalculate_rotation_participant_payment_status"(uuid) TO PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."recalculate_rotation_participant_payment_status"(uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."recalculate_rotation_participant_payment_status"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."recalculate_rotation_participant_payment_status"(uuid) TO "postgres";

REVOKE ALL ON FUNCTION "public"."recalculate_rotation_participant_payment_status"(uuid) FROM "anon", "authenticated";
