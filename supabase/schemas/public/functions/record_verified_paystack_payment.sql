CREATE OR REPLACE FUNCTION public.record_verified_paystack_payment (
  p_participant_id          uuid,
  p_collection_id           uuid,
  p_amount                  numeric,
  p_currency                text,
  p_reference               text,
  p_processor_fee_amount    numeric DEFAULT 0,
  p_platform_fee_amount     numeric DEFAULT NULL::numeric,
  p_platform_fee_percentage numeric DEFAULT NULL::numeric,
  p_rotation_cycle_id       uuid    DEFAULT NULL::uuid,
  p_rotation_obligation_id  uuid    DEFAULT NULL::uuid,
  p_recurring_obligation_id uuid    DEFAULT NULL::uuid
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_payment_id uuid;
  v_existing record;
  v_participant record;
  v_collection record;
  v_obligation record;
  v_recurring_obligation record;

  v_expected_amount numeric;
  v_outstanding_amount numeric;
  v_verified_paid_before numeric := 0;
  v_currency text;

  v_fee_rate numeric;
  v_fee_amount numeric;
  v_processor_fee numeric;
  v_organizer_net numeric;

  v_is_rotation boolean := false;
  v_is_recurring boolean := false;
begin
  -- =====================================================
  -- INPUT VALIDATION
  -- =====================================================

  if p_participant_id is null then
    raise exception 'Participant ID is required.';
  end if;

  if p_collection_id is null then
    raise exception 'Collection ID is required.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero.';
  end if;

  if nullif(trim(p_currency), '') is null then
    raise exception 'Payment currency is required.';
  end if;

  if nullif(trim(p_reference), '') is null then
    raise exception 'Payment reference is required.';
  end if;

  if coalesce(p_processor_fee_amount, 0) < 0 then
    raise exception 'Processor fee cannot be negative.';
  end if;

  if p_platform_fee_amount is not null
     and p_platform_fee_amount < 0 then
    raise exception 'Platform fee amount cannot be negative.';
  end if;

  if p_platform_fee_percentage is not null
     and (
       p_platform_fee_percentage < 0
       or p_platform_fee_percentage > 100
     ) then
    raise exception 'Platform fee percentage is invalid.';
  end if;

  if (
    p_rotation_cycle_id is null
    and p_rotation_obligation_id is not null
  ) or (
    p_rotation_cycle_id is not null
    and p_rotation_obligation_id is null
  ) then
    raise exception
      'Rotation cycle and obligation must be supplied together.';
  end if;

  v_currency := upper(trim(p_currency));

  -- =====================================================
  -- LOCK PARTICIPANT
  -- =====================================================

  select
    p.id,
    p.collection_id,
    p.expected_amount,
    p.payment_status,
    p.is_active
  into v_participant
  from public.participants p
  where p.id = p_participant_id
  for update;

  if not found then
    raise exception 'Participant not found.';
  end if;

  if v_participant.collection_id <> p_collection_id then
    raise exception
      'Participant does not belong to this Collection.';
  end if;

  -- =====================================================
  -- COLLECTION
  -- =====================================================

  select
    c.id,
    c.currency,
    c.default_amount,
    c.collection_mode,
    c.allow_partial_payments,
    c.allow_custom_amount
  into v_collection
  from public.collections c
  where c.id = p_collection_id;

  if not found then
    raise exception 'Collection not found.';
  end if;

  if upper(coalesce(v_collection.currency, '')) <> v_currency then
    raise exception
      'Payment currency does not match Collection currency.';
  end if;

  v_is_rotation :=
    v_collection.collection_mode = 'rotating_pool';

  v_is_recurring :=
    v_collection.collection_mode = 'recurring_dues';

  -- =====================================================
  -- MODE IDENTIFIER VALIDATION
  -- =====================================================

  if v_is_rotation then
    if p_rotation_cycle_id is null
       or p_rotation_obligation_id is null then
      raise exception
        'Rotational payments require a cycle and obligation.';
    end if;

    if p_recurring_obligation_id is not null then
      raise exception
        'Recurring obligation is not valid for a rotating Collection.';
    end if;

  elsif v_is_recurring then
    if p_recurring_obligation_id is null then
      raise exception
        'Recurring payments require a recurring obligation.';
    end if;

    if p_rotation_cycle_id is not null
       or p_rotation_obligation_id is not null then
      raise exception
        'Rotation identifiers are not valid for a recurring Collection.';
    end if;

  else
    if p_rotation_cycle_id is not null
       or p_rotation_obligation_id is not null then
      raise exception
        'Rotation identifiers are not valid for this Collection.';
    end if;

    if p_recurring_obligation_id is not null then
      raise exception
        'Recurring obligation is not valid for this Collection.';
    end if;
  end if;

  -- =====================================================
  -- FIND EXISTING PAYMENT ATTEMPT
  -- =====================================================

  select
    pay.id,
    pay.participant_id,
    pay.collection_id,
    pay.amount,
    pay.currency,
    pay.status,
    pay.provider,
    pay.payment_provider,
    pay.platform_fee_percentage,
    pay.platform_fee_amount,
    pay.rotation_cycle_id,
    pay.rotation_obligation_id,
    pay.recurring_obligation_id
  into v_existing
  from public.payments pay
  where pay.provider_reference = trim(p_reference)
    and (
      pay.provider = 'paystack'
      or pay.payment_provider = 'paystack'
    )
  limit 1
  for update;

  if found then
    if v_existing.participant_id <> p_participant_id
       or v_existing.collection_id <> p_collection_id then
      raise exception
        'Paystack reference is already linked to another payment.';
    end if;

    if abs(coalesce(v_existing.amount, 0) - p_amount) > 0.001 then
      raise exception
        'Existing payment amount does not match verified Paystack amount.';
    end if;

    if upper(coalesce(v_existing.currency, '')) <> v_currency then
      raise exception
        'Existing payment currency does not match verified Paystack currency.';
    end if;
  end if;

  -- =====================================================
  -- ROTATING POOL
  -- =====================================================

  if v_is_rotation then
    select
      rco.id,
      rco.cycle_id,
      rco.participant_id,
      rco.amount_due,
      rco.amount_paid,
      rco.status,
      rc.collection_id,
      rc.status as cycle_status
    into v_obligation
    from public.rotation_cycle_obligations rco
    join public.rotation_cycles rc
      on rc.id = rco.cycle_id
    where rco.id = p_rotation_obligation_id
      and rc.id = p_rotation_cycle_id
    for update of rco;

    if not found then
      raise exception 'Rotation obligation not found.';
    end if;

    if v_obligation.collection_id <> p_collection_id then
      raise exception
        'Rotation cycle does not belong to this Collection.';
    end if;

    if v_obligation.participant_id <> p_participant_id then
      raise exception
        'Rotation obligation does not belong to this participant.';
    end if;

    if v_obligation.status in ('paid', 'waived') then
      if v_existing.id is null
         or v_existing.status <> 'success' then
        raise exception
          'Rotation obligation is already complete.';
      end if;
    end if;

    if v_obligation.cycle_status = 'cancelled' then
      raise exception 'Rotation cycle is cancelled.';
    end if;

    v_outstanding_amount :=
      greatest(
        round(
          coalesce(v_obligation.amount_due, 0)
          - coalesce(v_obligation.amount_paid, 0),
          2
        ),
        0
      );

    if v_existing.id is not null
       and v_existing.status = 'success' then
      v_expected_amount := p_amount;
    else
      v_expected_amount := v_outstanding_amount;
    end if;

    if v_expected_amount <= 0
       or abs(p_amount - v_expected_amount) > 0.001 then
      raise exception
        'Verified payment amount does not match the outstanding rotation obligation.';
    end if;

    if v_existing.id is not null
       and (
         v_existing.rotation_cycle_id is distinct from p_rotation_cycle_id
         or v_existing.rotation_obligation_id is distinct from p_rotation_obligation_id
       ) then
      raise exception
        'Existing payment rotation linkage does not match verified metadata.';
    end if;

  -- =====================================================
  -- RECURRING DUES
  -- =====================================================

  elsif v_is_recurring then
    select
      rco.id,
      rco.collection_id,
      rco.participant_id,
      rco.expected_amount,
      rco.paid_amount,
      rco.status,
      rc.status as cycle_status,
      rc.due_on
    into v_recurring_obligation
    from public.recurring_cycle_obligations rco
    join public.recurring_cycles rc
      on rc.id = rco.cycle_id
    where rco.id = p_recurring_obligation_id
    for update of rco;

    if not found then
      raise exception
        'Recurring obligation not found.';
    end if;

    if v_recurring_obligation.collection_id <> p_collection_id then
      raise exception
        'Recurring obligation does not belong to this Collection.';
    end if;

    if v_recurring_obligation.participant_id <> p_participant_id then
      raise exception
        'Recurring obligation does not belong to this participant.';
    end if;

    if v_recurring_obligation.cycle_status = 'cancelled'
       or v_recurring_obligation.status = 'cancelled' then
      raise exception
        'Recurring obligation is cancelled.';
    end if;

    if v_recurring_obligation.status = 'waived' then
      raise exception
        'Recurring obligation has been waived.';
    end if;

    if v_recurring_obligation.status = 'paid' then
      if v_existing.id is null
         or v_existing.status <> 'success' then
        raise exception
          'Recurring obligation is already fully paid.';
      end if;
    end if;

    v_outstanding_amount :=
      greatest(
        round(
          coalesce(v_recurring_obligation.expected_amount, 0)
          - coalesce(v_recurring_obligation.paid_amount, 0),
          2
        ),
        0
      );

    -- Webhook retry remains valid after reconciliation has
    -- already moved the obligation to paid.
    if v_existing.id is not null
       and v_existing.status = 'success' then
      v_expected_amount := p_amount;
    else
      v_expected_amount := v_outstanding_amount;
    end if;

    if v_expected_amount <= 0 then
      if v_existing.id is null
         or v_existing.status <> 'success' then
        raise exception
          'Recurring obligation is already fully paid.';
      end if;
    end if;

    if coalesce(v_collection.allow_partial_payments, false) then
      if p_amount > v_expected_amount + 0.001 then
        raise exception
          'Verified payment amount exceeds the outstanding recurring obligation.';
      end if;
    else
      if abs(p_amount - v_expected_amount) > 0.001 then
        raise exception
          'Verified payment amount does not match the outstanding recurring obligation.';
      end if;
    end if;

    if v_existing.id is not null
       and v_existing.recurring_obligation_id
         is distinct from p_recurring_obligation_id then
      raise exception
        'Existing payment recurring obligation linkage does not match verified metadata.';
    end if;

  -- =====================================================
  -- STANDARD / ONE-OFF COLLECTION
  -- =====================================================

  else
    v_expected_amount :=
      coalesce(
        v_participant.expected_amount,
        v_collection.default_amount
      );

    if v_expected_amount is not null
       and v_expected_amount > 0 then

      select
        coalesce(
          sum(
            case
              when pay.status = 'success'
                then pay.amount

              when pay.status = 'partially_refunded'
                then greatest(
                  pay.amount - coalesce(pay.refunded_amount, 0),
                  0
                )

              else 0
            end
          ),
          0
        )
      into v_verified_paid_before
      from public.payments pay
      where pay.participant_id = p_participant_id
        and pay.collection_id = p_collection_id
        and pay.verified_at is not null
        and pay.provider_reference is distinct from trim(p_reference);

      v_verified_paid_before :=
        round(coalesce(v_verified_paid_before, 0), 2);

      v_outstanding_amount :=
        greatest(
          round(
            v_expected_amount - v_verified_paid_before,
            2
          ),
          0
        );

      if v_outstanding_amount <= 0 then
        if v_existing.id is null
           or v_existing.status <> 'success' then
          raise exception
            'The contribution is already fully paid.';
        end if;
      end if;

      if coalesce(v_collection.allow_partial_payments, false) then
        if p_amount > v_outstanding_amount + 0.001 then
          raise exception
            'Verified payment amount exceeds the outstanding balance.';
        end if;
      else
        if abs(p_amount - v_outstanding_amount) > 0.001 then
          raise exception
            'Verified payment amount does not match the outstanding obligation.';
        end if;
      end if;

    else
      if not (
        v_collection.collection_mode in ('target', 'flexible')
        and coalesce(v_collection.allow_custom_amount, false)
      ) then
        raise exception
          'Expected payment amount is not configured.';
      end if;
    end if;
  end if;

  -- =====================================================
  -- FINALIZE EXISTING ATTEMPT OR CREATE FALLBACK
  -- =====================================================

  if v_existing.id is not null then
    v_payment_id := v_existing.id;

    v_fee_rate :=
      coalesce(
        v_existing.platform_fee_percentage,
        p_platform_fee_percentage
      );

    v_fee_amount :=
      coalesce(
        v_existing.platform_fee_amount,
        p_platform_fee_amount
      );

    update public.payments
    set
      status = 'success',
      paid_at = coalesce(paid_at, now()),
      verified_at = coalesce(verified_at, now()),

      processor_fee_amount =
        coalesce(p_processor_fee_amount, 0),

      platform_fee_percentage =
        coalesce(
          platform_fee_percentage,
          v_fee_rate,
          0
        ),

      platform_fee_amount =
        coalesce(
          platform_fee_amount,
          v_fee_amount,
          0
        ),

      rotation_cycle_id =
        coalesce(
          rotation_cycle_id,
          p_rotation_cycle_id
        ),

      rotation_obligation_id =
        coalesce(
          rotation_obligation_id,
          p_rotation_obligation_id
        ),

      recurring_obligation_id =
        coalesce(
          recurring_obligation_id,
          p_recurring_obligation_id
        )

    where id = v_payment_id;

  else
    v_fee_rate := p_platform_fee_percentage;
    v_fee_amount := p_platform_fee_amount;

    if v_fee_rate is null then
      select ps.platform_fee_percentage
      into v_fee_rate
      from public.platform_settings ps
      where ps.id = 'global'
      limit 1;

      v_fee_rate := coalesce(v_fee_rate, 0);
    end if;

    if v_fee_amount is null then
      v_fee_amount :=
        round(
          p_amount * (v_fee_rate / 100.0),
          2
        );
    end if;

    insert into public.payments (
      participant_id,
      collection_id,
      amount,
      currency,
      status,
      provider,
      payment_provider,
      provider_reference,
      processor_fee_amount,
      platform_fee_percentage,
      platform_fee_amount,
      paid_at,
      verified_at,
      rotation_cycle_id,
      rotation_obligation_id,
      recurring_obligation_id
    )
    values (
      p_participant_id,
      p_collection_id,
      p_amount,
      v_currency,
      'success',
      'paystack',
      'paystack',
      trim(p_reference),
      coalesce(p_processor_fee_amount, 0),
      coalesce(v_fee_rate, 0),
      coalesce(v_fee_amount, 0),
      now(),
      now(),
      p_rotation_cycle_id,
      p_rotation_obligation_id,
      p_recurring_obligation_id
    )
    returning id
    into v_payment_id;
  end if;

  -- =====================================================
  -- MONETIZATION
  -- =====================================================

  select
    coalesce(platform_fee_amount, 0)
  into v_fee_amount
  from public.payments
  where id = v_payment_id;

  v_processor_fee :=
    round(
      coalesce(p_processor_fee_amount, 0),
      2
    );

  v_organizer_net :=
    greatest(
      round(
        p_amount
        - coalesce(v_fee_amount, 0)
        - v_processor_fee,
        2
      ),
      0
    );

  update public.payments
  set
    processor_fee_amount = v_processor_fee,
    organizer_net_amount = v_organizer_net,
    monetization_calculated_at = now()
  where id = v_payment_id;

  return v_payment_id;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."record_verified_paystack_payment"(uuid, uuid, numeric, text, text, numeric, numeric, numeric, uuid, uuid, uuid) TO PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."record_verified_paystack_payment"(uuid, uuid, numeric, text, text, numeric, numeric, numeric, uuid, uuid, uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."record_verified_paystack_payment"(uuid, uuid, numeric, text, text, numeric, numeric, numeric, uuid, uuid, uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."record_verified_paystack_payment"(uuid, uuid, numeric, text, text, numeric, numeric, numeric, uuid, uuid, uuid) TO "postgres";

REVOKE ALL ON FUNCTION "public"."record_verified_paystack_payment"(uuid, uuid, numeric, text, text, numeric, numeric, numeric, uuid, uuid, uuid) FROM "anon", "authenticated";
