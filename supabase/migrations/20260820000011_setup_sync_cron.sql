-- ============================================================
-- Explicitly configure pg_cron for background order syncing
-- ============================================================

-- Ensure required extensions are active
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Unschedule any existing duplicate job just in case
SELECT cron.unschedule('auto-sync-order-statuses');

-- Schedule the job to run every 1 minute
SELECT cron.schedule(
  'auto-sync-order-statuses',
  '* * * * *',
  $$
    SELECT net.http_post(
        url:='https://aawvsbtiymgrzjsfntog.supabase.co/functions/v1/sync-order-status',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhd3ZzYnRpeW1ncnpqc2ZudG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzkwNjksImV4cCI6MjA4ODU1NTA2OX0.BrdX1omvlvBykFVjl2__jN30TwzzGYnoEVw6rgDI1jM"}'::jsonb,
        body:='{}'::jsonb
    );
  $$
);
