-- Admin bill/invoice generator: unique bill numbers via a sequence (safe
-- under concurrent admin usage, unlike a select-max-then-add-one pattern),
-- a bill can be tied to a real agent or filled in manually, line items are
-- a separate table so a bill can have any number of charges.

create sequence if not exists bill_number_seq start 1;

create or replace function generate_bill_number()
returns text
language sql
set search_path = public
as $$
  select 'RM-INV-' || lpad(nextval('bill_number_seq')::text, 6, '0');
$$;

create table if not exists bills (
  id uuid primary key default gen_random_uuid(),
  bill_number text not null unique default generate_bill_number(),
  bill_to_type text not null default 'manual' check (bill_to_type in ('agent', 'manual')),
  agent_id uuid references agents(id) on delete set null,
  bill_to_name text not null,
  bill_to_company text,
  bill_to_phone text,
  bill_to_email text,
  bill_to_address text,
  issue_date date not null default current_date,
  due_date date,
  notes text,
  status text not null default 'unpaid' check (status in ('unpaid', 'paid', 'cancelled')),
  total numeric not null default 0,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bill_items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references bills(id) on delete cascade,
  description text not null,
  amount numeric not null default 0,
  sort_order int not null default 0
);

create index if not exists bills_agent_id_idx on bills(agent_id);
create index if not exists bills_created_by_idx on bills(created_by);
create index if not exists bill_items_bill_id_idx on bill_items(bill_id);

alter table bills enable row level security;
alter table bill_items enable row level security;

-- Admin-only in both directions — bills are internal business records, no
-- agent or client-facing access at all.
create policy bills_admin_all on bills for all to authenticated
  using ((select is_admin()))
  with check ((select is_admin()));

create policy bill_items_admin_all on bill_items for all to authenticated
  using ((select is_admin()))
  with check ((select is_admin()));

grant select, insert, update, delete on bills to authenticated;
grant select, insert, update, delete on bill_items to authenticated;

notify pgrst, 'reload schema';
