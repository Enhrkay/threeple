CREATE OR REPLACE FUNCTION public.refresh_rotation_obligation (
  p_obligation_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_due numeric;
  v_paid numeric;
  v_status text;
  v_paid_at timestamptz;
begin
  select
    rco.amount_due
  into v_due
  from public.rotation_cycle_obligations rco
  where rco.id = p_obligation_id
  for update;

  if not found then
    raise exception 'Rotation obligation not found.';
  end if;

  select
    coalesce(
      sum(
        greatest(
          coalesce(p.amount, 0) -
          coalesce(p.refunded_amount, 0),
          0
        )
      ),
      0
    ),
    max(p.verified_at)
  into
    v_paid,
    v_paid_at
  from public.payments p
  where p.rotation_obligation_id =
      p_obligation_id
    and p.status = 'success'
    and p.verified_at is not null;

  v_paid :=
    round(
      coalesce(v_paid, 0),
      2
    );

  if v_paid <= 0 then
    v_status := 'pending';
    v_paid_at := null;

  elsif v_paid + 0.001 < v_due then
    v_status := 'partial';
    v_paid_at := null;

  else
    v_status := 'paid';
  end if;

  update public.rotation_cycle_obligations
  set
    amount_paid = v_paid,
    status = v_status,
    paid_at =
      case
        when v_status = 'paid'
        then coalesce(v_paid_at, now())
        else null
      end
  where id = p_obligation_id;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."refresh_rotation_obligation"(uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."refresh_rotation_obligation"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."refresh_rotation_obligation"(uuid) TO "postgres";

REVOKE ALL ON FUNCTION "public"."refresh_rotation_obligation"(uuid) FROM PUBLIC, "anon", "authenticated";
