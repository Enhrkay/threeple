-- ============================================================
-- Threeple
-- Payment reconciliation and rotation trigger wiring
-- ============================================================

drop trigger if exists
  payment_reconciliation_trigger
on public.payments;

create trigger payment_reconciliation_trigger
after insert
or update of
  status,
  refunded_amount,
  verified_at,
  paid_at
on public.payments
for each row
execute function public.handle_payment_reconciliation();


drop trigger if exists
  trg_refresh_rotation_from_payment
on public.payments;

create trigger trg_refresh_rotation_from_payment
after insert
or delete
or update
on public.payments
for each row
execute function public.refresh_rotation_from_payment();


drop trigger if exists
  trg_validate_rotation_payment_link
on public.payments;

create trigger trg_validate_rotation_payment_link
before insert
or update of
  rotation_cycle_id,
  rotation_obligation_id,
  participant_id,
  collection_id
on public.payments
for each row
execute function public.validate_rotation_payment_link();


drop trigger if exists
  validate_payment_relationships_trigger
on public.payments;

create trigger validate_payment_relationships_trigger
before insert
or update
on public.payments
for each row
execute function public.validate_payment_relationships();
