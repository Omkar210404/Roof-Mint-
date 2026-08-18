-- Bills are soft-deleted (deleted_at set) instead of removed outright, so
-- Verify Bill can distinguish "this bill number never existed" from "this
-- was a genuine bill we later deleted/voided" — a meaningfully different
-- answer when someone is presenting a bill as proof of something.

alter table bills add column if not exists deleted_at timestamptz;
create index if not exists bills_deleted_at_idx on bills(deleted_at);

notify pgrst, 'reload schema';
