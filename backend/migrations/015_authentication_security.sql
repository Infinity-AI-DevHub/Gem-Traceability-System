ALTER TABLE users
  ADD COLUMN failed_login_attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN locked_until DATETIME(3) NULL,
  ADD COLUMN last_login_at DATETIME(3) NULL,
  ADD INDEX idx_users_locked_until (locked_until);

ALTER TABLE user_sessions
  ADD COLUMN last_seen_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD INDEX idx_sessions_user_created (user_id, created_at);

CREATE TABLE auth_login_limits (
  key_hash CHAR(64) PRIMARY KEY,
  failures SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  window_started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  blocked_until DATETIME(3) NULL,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_auth_login_limits_blocked (blocked_until),
  INDEX idx_auth_login_limits_updated (updated_at)
);
