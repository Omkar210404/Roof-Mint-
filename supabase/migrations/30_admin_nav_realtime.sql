-- ============================================================================
-- ROOFMINT — Live "new item" indicators in the admin sidebar
-- Run this in your Supabase SQL Editor.
--
-- The admin sidebar now shows a small dot on Leads / User Data / Feedback /
-- Activity Log when something new lands while the admin is elsewhere in the
-- panel. That's driven by postgres_changes subscriptions, which only fire
-- for tables in the `supabase_realtime` publication — enquiries/agents/
-- properties/notifications were already added (see 09_notifications_realtime
-- .sql), profiles/feedback/activity_log were not.
-- ============================================================================

alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table feedback;
alter publication supabase_realtime add table activity_log;
