ALTER TABLE push_subscriptions
  ADD COLUMN device_name VARCHAR(120) NULL AFTER user_agent,
  ADD COLUMN browser_name VARCHAR(120) NULL AFTER device_name,
  ADD COLUMN platform_name VARCHAR(120) NULL AFTER browser_name,
  ADD COLUMN persist_after_logout BOOLEAN NOT NULL DEFAULT FALSE AFTER platform_name,
  ADD COLUMN last_seen_at DATETIME(3) NULL AFTER persist_after_logout;
