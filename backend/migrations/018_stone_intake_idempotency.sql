CREATE TABLE stone_intake_requests (
  user_id BIGINT UNSIGNED NOT NULL,
  request_key CHAR(36) NOT NULL,
  stone_id VARCHAR(32) NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, request_key),
  INDEX idx_intake_requests_created (created_at),
  CONSTRAINT fk_intake_request_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_intake_request_stone FOREIGN KEY (stone_id) REFERENCES stones(id) ON DELETE CASCADE
) ENGINE=InnoDB;
