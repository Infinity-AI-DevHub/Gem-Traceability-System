CREATE TABLE IF NOT EXISTS buyers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(180) NOT NULL,
  phone VARCHAR(50) NULL,
  email VARCHAR(180) NULL,
  locality VARCHAR(150) NULL,
  notes VARCHAR(500) NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_buyers_name (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS direct_sales (
  id VARCHAR(32) NOT NULL,
  stone_id VARCHAR(32) NOT NULL,
  buyer_id BIGINT UNSIGNED NOT NULL,
  final_price DECIMAL(15,2) NOT NULL,
  sold_at DATETIME NOT NULL,
  notes VARCHAR(500) NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_direct_sales_stone (stone_id),
  INDEX idx_direct_sales_buyer (buyer_id),
  CONSTRAINT fk_direct_sales_stone FOREIGN KEY (stone_id) REFERENCES stones(id),
  CONSTRAINT fk_direct_sales_buyer FOREIGN KEY (buyer_id) REFERENCES buyers(id),
  CONSTRAINT chk_direct_sales_price CHECK (final_price > 0)
) ENGINE=InnoDB;

INSERT INTO buyers (name,phone,email,locality)
SELECT DISTINCT c.display_name,c.phone,c.email,c.locality
FROM sales s
JOIN contacts c ON c.id=s.buyer_contact_id
WHERE s.status='SOLD'
ON DUPLICATE KEY UPDATE
  phone=COALESCE(VALUES(phone),buyers.phone),
  email=COALESCE(VALUES(email),buyers.email),
  locality=COALESCE(VALUES(locality),buyers.locality);

INSERT INTO direct_sales (id,stone_id,buyer_id,final_price,sold_at,notes)
SELECT CONCAT('DIR-',s.id),s.stone_id,b.id,s.agreed_price,
       COALESCE(s.sold_at,s.created_at),'Migrated from the original sales ledger'
FROM sales s
JOIN contacts c ON c.id=s.buyer_contact_id
JOIN buyers b ON b.name=c.display_name
WHERE s.status='SOLD'
ON DUPLICATE KEY UPDATE buyer_id=VALUES(buyer_id);
