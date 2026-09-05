-- Financial board — track every income, expense, and miscellaneous entry
-- with full edit/delete support. The net total (income − expenses) drives
-- the "Money Earned" metric in the admin dashboard banner.
-- This script is safe to re-run — it won't delete existing data.

-- Drop policy first so re-running doesn't fail with "already exists"
drop policy if exists financial_transactions_admin_all on financial_transactions;

create table if not exists financial_transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('income', 'expense', 'misc')),
  category text not null default 'general',
  description text not null,
  amount numeric not null default 0 check (amount >= 0),
  transaction_date date not null default current_date,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists financial_transactions_date_idx on financial_transactions(transaction_date);
create index if not exists financial_transactions_type_idx on financial_transactions(type);
create index if not exists financial_transactions_created_by_idx on financial_transactions(created_by);

alter table financial_transactions enable row level security;

-- Admin-only — financial records are internal business data.
create policy financial_transactions_admin_all on financial_transactions for all to authenticated
  using ((select is_admin()))
  with check ((select is_admin()));

grant select, insert, update, delete on financial_transactions to authenticated;

-- Realtime so the dashboard banner and financial board stay in sync.
alter publication supabase_realtime add table financial_transactions;

notify pgrst, 'reload schema';