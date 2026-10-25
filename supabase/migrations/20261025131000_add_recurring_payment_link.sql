-- ============================================================
-- Threeple
-- Recurring payment linkage
--
-- Adds canonical linkage from payments to
-- recurring_cycle_obligations.
-- ============================================================

alter table public.payments
add column if not exists recurring_obligation_id uuid;

alter table public.payments
drop constraint if exists payments_recurring_obligation_id_fkey;

alter table public.payments
add constraint payments_recurring_obligation_id_fkey
foreign key (recurring_obligation_id)
references public.recurring_cycle_obligations(id)
on delete set null;

create index if not exists payments_recurring_obligation_id_idx
on public.payments (recurring_obligation_id)
where recurring_obligation_id is not null;
