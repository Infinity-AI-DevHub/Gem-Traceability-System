ALTER TABLE user_sessions
  MODIFY expires_at TIMESTAMP(3) NULL;

UPDATE user_sessions SET expires_at=NULL;
