CREATE OR REPLACE FUNCTION public.recalculate_recurring_obligation (
  p_recurring_obligation_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_expected_amount numeric(14,2);
  v_existing_status text;
  v_paid_amount numeric(14,2);
begin
  select
    rco.expected_amount,
    rco.status
  into
    v_expected_amount,
    v_existing_status
  from public.recurring_cycle_obligations rco
  where rco.id = p_recurring_obligation_id;

  if not found then
    return;
  end if;

  -- Waived and cancelled obligations remain untouched.
  if v_existing_status in ('waived', 'cancelled') then
    return;
  end if;

  -- Calculate effective verified money received.
  select
    coalesce(
      sum(
        case
          when p.status = 'success'
            and p.verified_at is not null
          then p.amount

          when p.status = 'partially_refunded'
            and p.verified_at is not null
          then greatest(
            p.amount - p.refunded_amount,
            0
          )

          else 0
        end
      ),
      0
    )
  into v_paid_amount
  from public.payments p
  where p.recurring_obligation_id =
    p_recurring_obligation_id;

  update public.recurring_cycle_obligations
  set
    paid_amount = v_paid_amount,

    status =
      case
        when v_paid_amount >= v_expected_amount
          then 'paid'

        when v_paid_amount > 0
          then 'partially_paid'

        else 'pending'
      end,

    paid_at =
      case
        when v_paid_amount >= v_expected_amount
          then coalesce(paid_at, now())

        else null
      end,

    updated_at = now()

  where id = p_recurring_obligation_id;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."recalculate_recurring_obligation"(uuid) TO PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."recalculate_recurring_obligation"(uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."recalculate_recurring_obligation"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."recalculate_recurring_obligation"(uuid) TO "postgres";

REVOKE ALL ON FUNCTION "public"."recalculate_recurring_obligation"(uuid) FROM "anon", "authenticated";
