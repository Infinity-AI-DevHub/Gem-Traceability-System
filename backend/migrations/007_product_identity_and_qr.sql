ALTER TABLE stones
  ADD COLUMN product_id VARCHAR(40) NULL AFTER id,
  ADD COLUMN qr_token CHAR(36) NULL AFTER product_id;

UPDATE stones
SET product_id = CONCAT('PRD-', UPPER(SUBSTRING(REPLACE(UUID(), '-', ''), 1, 12))),
    qr_token = UUID()
WHERE product_id IS NULL OR qr_token IS NULL;

ALTER TABLE stones
  MODIFY product_id VARCHAR(40) NOT NULL,
  MODIFY qr_token CHAR(36) NOT NULL,
  ADD UNIQUE KEY uq_stones_product_id (product_id),
  ADD UNIQUE KEY uq_stones_qr_token (qr_token);
