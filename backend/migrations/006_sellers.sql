CREATE TABLE IF NOT EXISTS sellers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(180) NOT NULL,
  phone VARCHAR(50) NULL,
  email VARCHAR(254) NULL,
  locality VARCHAR(150) NULL,
  notes VARCHAR(500) NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_sellers_name (name),
  INDEX idx_sellers_active_name (active, name)
) ENGINE=InnoDB;

INSERT IGNORE INTO sellers (name, phone, email, locality)
SELECT display_name, phone, email, locality
FROM contacts
WHERE role = 'SELLER';

ALTER TABLE stones
  ADD COLUMN seller_id BIGINT UNSIGNED NULL AFTER seller_contact_id,
  ADD INDEX idx_stones_seller_record (seller_id),
  ADD CONSTRAINT fk_stones_seller_record FOREIGN KEY (seller_id) REFERENCES sellers(id);

UPDATE stones s
JOIN contacts c ON c.id = s.seller_contact_id
JOIN sellers seller ON seller.name = c.display_name
SET s.seller_id = seller.id
WHERE s.seller_id IS NULL;
