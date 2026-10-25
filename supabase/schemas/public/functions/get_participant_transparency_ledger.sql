CREATE OR REPLACE FUNCTION public.get_participant_transparency_ledger (
  p_participant_id uuid
)
  RETURNS TABLE (
    participant_number     bigint,
    display_name           text,
    payment_status         text,
    paid_amount            numeric,
    expected_amount        numeric,
    is_self                boolean,
    show_participant_names boolean,
    show_payment_amounts   boolean
  )
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  with requester as (
    select
      p.id,
      p.collection_id,
      p.user_id
    from public.participants p
    where p.id = p_participant_id
      and p.user_id = auth.uid()
      and p.is_active = true
  ),
  participant_totals as (
    select
      p.id as participant_id,
      p.collection_id,
      p.full_name,
      p.payment_status,
      p.expected_amount,
      p.user_id,
      p.created_at,
      coalesce(
        sum(
          case
            when pay.verified_at is null then 0
            when pay.status = 'success'
              then coalesce(pay.amount, 0)
            when pay.status = 'partially_refunded'
              then greatest(
                0,
                coalesce(pay.amount, 0) -
                coalesce(pay.refunded_amount, 0)
              )
            else 0
          end
        ),
        0
      )::numeric as paid_amount
    from public.participants p
    join requester r
      on r.collection_id = p.collection_id
    left join public.payments pay
      on pay.participant_id = p.id
    where p.is_active = true
    group by
      p.id,
      p.collection_id,
      p.full_name,
      p.payment_status,
      p.expected_amount,
      p.user_id,
      p.created_at
  ),
  numbered as (
    select
      pt.*,
      row_number() over (
        order by pt.created_at asc, pt.participant_id asc
      ) as participant_number
    from participant_totals pt
  )
  select
    n.participant_number,
    case
      when c.show_participant_names = true
        or n.participant_id = r.id
      then n.full_name
      else null
    end as display_name,
    n.payment_status,
    case
      when c.show_payment_amounts = true
        or n.participant_id = r.id
      then n.paid_amount
      else null
    end as paid_amount,
    case
      when c.show_payment_amounts = true
        or n.participant_id = r.id
      then n.expected_amount
      else null
    end as expected_amount,
    (n.participant_id = r.id) as is_self,
    c.show_participant_names,
    c.show_payment_amounts
  from numbered n
  join requester r
    on r.collection_id = n.collection_id
  join public.collections c
    on c.id = n.collection_id
  order by n.participant_number;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_participant_transparency_ledger"(uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."get_participant_transparency_ledger"(uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."get_participant_transparency_ledger"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_participant_transparency_ledger"(uuid) TO "postgres";

REVOKE ALL ON FUNCTION "public"."get_participant_transparency_ledger"(uuid) FROM PUBLIC, "anon";
