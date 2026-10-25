CREATE OR REPLACE FUNCTION public.get_participant_dashboard_summary (
  p_participant_id uuid
)
  RETURNS TABLE (
    participant_id             uuid,
    collection_id              uuid,
    expected_amount            numeric,
    paid_amount                numeric,
    outstanding_amount         numeric,
    payment_status             text,
    target_amount              numeric,
    collection_amount_raised   numeric,
    progress_percent           numeric,
    joined_participants        integer,
    expected_participant_count integer,
    remaining_slots            integer
  )
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  with participant_scope as (
    select
      p.id as participant_id,
      p.collection_id,
      p.expected_amount,
      p.payment_status
    from public.participants p
    where p.id = p_participant_id
      and p.user_id = auth.uid()
      and p.is_active = true
  ),
  participant_paid as (
    select
      ps.participant_id,
      coalesce(
        sum(
          case
            when pay.verified_at is null then 0
            when pay.status = 'success' then coalesce(pay.amount, 0)
            when pay.status = 'partially_refunded'
              then greatest(
                0,
                coalesce(pay.amount, 0) - coalesce(pay.refunded_amount, 0)
              )
            else 0
          end
        ),
        0
      )::numeric as paid_amount
    from participant_scope ps
    left join public.payments pay
      on pay.participant_id = ps.participant_id
    group by ps.participant_id
  ),
  collection_paid as (
    select
      ps.collection_id,
      coalesce(
        sum(
          case
            when pay.verified_at is null then 0
            when pay.status = 'success' then coalesce(pay.amount, 0)
            when pay.status = 'partially_refunded'
              then greatest(
                0,
                coalesce(pay.amount, 0) - coalesce(pay.refunded_amount, 0)
              )
            else 0
          end
        ),
        0
      )::numeric as amount_raised
    from participant_scope ps
    left join public.payments pay
      on pay.collection_id = ps.collection_id
    group by ps.collection_id
  )
  select
    ps.participant_id,
    ps.collection_id,
    ps.expected_amount,
    pp.paid_amount,
    greatest(
      coalesce(ps.expected_amount, 0) - pp.paid_amount,
      0
    )::numeric as outstanding_amount,
    ps.payment_status,
    c.target_amount,
    cp.amount_raised as collection_amount_raised,
    case
      when c.target_amount is null or c.target_amount <= 0 then null
      else least(
        100,
        round((cp.amount_raised / c.target_amount) * 100, 2)
      )
    end as progress_percent,
    ccs.joined_participants,
    ccs.expected_participant_count,
    ccs.remaining_slots
  from participant_scope ps
  join public.collections c
    on c.id = ps.collection_id
  left join participant_paid pp
    on pp.participant_id = ps.participant_id
  left join collection_paid cp
    on cp.collection_id = ps.collection_id
  left join public.collection_capacity_summary ccs
    on ccs.collection_id = ps.collection_id;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_participant_dashboard_summary"(uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."get_participant_dashboard_summary"(uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."get_participant_dashboard_summary"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_participant_dashboard_summary"(uuid) TO "postgres";

REVOKE ALL ON FUNCTION "public"."get_participant_dashboard_summary"(uuid) FROM PUBLIC, "anon";
