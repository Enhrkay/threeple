CREATE OR REPLACE FUNCTION public.refresh_rotation_cycle (
  p_cycle_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_platform_fee numeric;
  v_processor_fee numeric;
  v_expected_gross numeric;
  v_coordinator_fee numeric;
  v_collected numeric;
  v_outstanding_count integer;
  v_current_status text;
  v_net numeric;
begin
  select
    rc.expected_gross_amount,
    rc.coordinator_fee_amount,
    rc.status
  into
    v_expected_gross,
    v_coordinator_fee,
    v_current_status
  from public.rotation_cycles rc
  where rc.id = p_cycle_id
  for update;

  if not found then
    raise exception 'Rotation cycle not found.';
  end if;

  select
    coalesce(
      sum(
        greatest(
          coalesce(p.platform_fee_amount, 0),
          0
        )
      ),
      0
    ),
    coalesce(
      sum(
        greatest(
          coalesce(p.processor_fee_amount, 0),
          0
        )
      ),
      0
    )
  into
    v_platform_fee,
    v_processor_fee
  from public.payments p
  where p.rotation_cycle_id =
      p_cycle_id
    and p.status = 'success'
    and p.verified_at is not null;

  select
    coalesce(
      sum(rco.amount_paid),
      0
    ),
    count(*) filter (
      where rco.status in (
        'pending',
        'partial'
      )
    )::integer
  into
    v_collected,
    v_outstanding_count
  from public.rotation_cycle_obligations rco
  where rco.cycle_id =
    p_cycle_id;

  v_net :=
    greatest(
      round(
        coalesce(v_collected, 0) -
        coalesce(v_coordinator_fee, 0) -
        coalesce(v_platform_fee, 0) -
        coalesce(v_processor_fee, 0),
        2
      ),
      0
    );

  update public.rotation_cycles
  set
    threeple_platform_fee_amount =
      round(
        coalesce(v_platform_fee, 0),
        2
      ),

    processor_fee_amount =
      round(
        coalesce(v_processor_fee, 0),
        2
      ),

    expected_recipient_net =
      v_net,

    status =
      case
        when v_current_status = 'cancelled'
          then 'cancelled'

        when v_outstanding_count = 0
             and coalesce(v_collected, 0) > 0
          then 'settled'

        when coalesce(v_collected, 0) > 0
          then 'open'

        else v_current_status
      end,

    opened_at =
      case
        when coalesce(v_collected, 0) > 0
          then coalesce(opened_at, now())
        else opened_at
      end,

    settled_at =
      case
        when v_outstanding_count = 0
             and coalesce(v_collected, 0) > 0
          then coalesce(settled_at, now())
        else null
      end

  where id = p_cycle_id;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."refresh_rotation_cycle"(uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."refresh_rotation_cycle"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."refresh_rotation_cycle"(uuid) TO "postgres";

REVOKE ALL ON FUNCTION "public"."refresh_rotation_cycle"(uuid) FROM PUBLIC, "anon", "authenticated";
