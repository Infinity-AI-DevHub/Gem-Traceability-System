CREATE TABLE IF NOT EXISTS contacts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  display_name VARCHAR(180) NOT NULL,
  role ENUM('BUYER','SELLER','CUTTER','LABORATORY','STAFF','OTHER') NOT NULL,
  phone VARCHAR(50) NULL,
  email VARCHAR(254) NULL,
  locality VARCHAR(150) NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_contacts_role_name (role, display_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS locations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(180) NOT NULL,
  location_type ENUM('VAULT','DISPLAY','WORKSHOP','LABORATORY','BUYER','OTHER') NOT NULL,
  is_external BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_locations_name (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stone_sequences (
  year_number SMALLINT UNSIGNED NOT NULL,
  gem_code CHAR(3) NOT NULL,
  last_number INT UNSIGNED NOT NULL,
  PRIMARY KEY (year_number, gem_code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stones (
  id VARCHAR(32) NOT NULL,
  gem_type VARCHAR(100) NOT NULL,
  origin VARCHAR(150) NOT NULL,
  current_weight DECIMAL(12,3) NOT NULL,
  intake_weight DECIMAL(12,3) NOT NULL,
  color VARCHAR(180) NULL,
  shape VARCHAR(100) NULL,
  purchase_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
  asking_price DECIMAL(15,2) NULL,
  status ENUM('AVAILABLE','RESERVED','IN_CUTTING','IN_TREATMENT','SOLD','ON_HOLD') NOT NULL DEFAULT 'AVAILABLE',
  location_id BIGINT UNSIGNED NULL,
  custodian_contact_id BIGINT UNSIGNED NULL,
  treatment_disclosure VARCHAR(500) NOT NULL DEFAULT 'Not assessed',
  certificate_reference VARCHAR(150) NULL,
  seller_contact_id BIGINT UNSIGNED NULL,
  acquired_on DATE NOT NULL,
  notes TEXT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_stones_status (status),
  INDEX idx_stones_location (location_id),
  CONSTRAINT fk_stones_location FOREIGN KEY (location_id) REFERENCES locations(id),
  CONSTRAINT fk_stones_custodian FOREIGN KEY (custodian_contact_id) REFERENCES contacts(id),
  CONSTRAINT fk_stones_seller FOREIGN KEY (seller_contact_id) REFERENCES contacts(id),
  CONSTRAINT chk_stones_weights CHECK (current_weight > 0 AND intake_weight > 0 AND current_weight <= intake_weight),
  CONSTRAINT chk_stones_money CHECK (purchase_cost >= 0 AND (asking_price IS NULL OR asking_price >= 0))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lifecycle_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  stone_id VARCHAR(32) NOT NULL,
  event_type VARCHAR(60) NOT NULL,
  title VARCHAR(180) NOT NULL,
  details JSON NOT NULL,
  actor_contact_id BIGINT UNSIGNED NULL,
  occurred_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_events_stone_time (stone_id, occurred_at DESC),
  CONSTRAINT fk_events_stone FOREIGN KEY (stone_id) REFERENCES stones(id),
  CONSTRAINT fk_events_actor FOREIGN KEY (actor_contact_id) REFERENCES contacts(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS workshop_jobs (
  id VARCHAR(32) NOT NULL,
  stone_id VARCHAR(32) NOT NULL,
  job_type ENUM('CUTTING','TREATMENT') NOT NULL,
  provider_contact_id BIGINT UNSIGNED NOT NULL,
  status ENUM('PENDING_DISPATCH','WITH_PROVIDER','RETURNED','CANCELLED') NOT NULL DEFAULT 'PENDING_DISPATCH',
  due_on DATE NULL,
  outgoing_weight DECIMAL(12,3) NOT NULL,
  returned_weight DECIMAL(12,3) NULL,
  estimated_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
  final_cost DECIMAL(15,2) NULL,
  instructions TEXT NULL,
  return_notes TEXT NULL,
  dispatched_at TIMESTAMP(3) NULL,
  returned_at TIMESTAMP(3) NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_jobs_stone_status (stone_id, status),
  CONSTRAINT fk_jobs_stone FOREIGN KEY (stone_id) REFERENCES stones(id),
  CONSTRAINT fk_jobs_provider FOREIGN KEY (provider_contact_id) REFERENCES contacts(id),
  CONSTRAINT chk_jobs_weights CHECK (outgoing_weight > 0 AND (returned_weight IS NULL OR (returned_weight > 0 AND returned_weight <= outgoing_weight))),
  CONSTRAINT chk_jobs_cost CHECK (estimated_cost >= 0 AND (final_cost IS NULL OR final_cost >= 0))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sales (
  id VARCHAR(32) NOT NULL,
  stone_id VARCHAR(32) NOT NULL,
  buyer_contact_id BIGINT UNSIGNED NOT NULL,
  status ENUM('RESERVED','SOLD','RELEASED','CONVERTED','CANCELLED') NOT NULL,
  agreed_price DECIMAL(15,2) NOT NULL,
  disclosure_snapshot VARCHAR(500) NOT NULL,
  reserved_at TIMESTAMP(3) NULL,
  sold_at TIMESTAMP(3) NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_sales_stone_status (stone_id, status),
  CONSTRAINT fk_sales_stone FOREIGN KEY (stone_id) REFERENCES stones(id),
  CONSTRAINT fk_sales_buyer FOREIGN KEY (buyer_contact_id) REFERENCES contacts(id),
  CONSTRAINT chk_sales_price CHECK (agreed_price > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sale_id VARCHAR(32) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  method ENUM('CASH','BANK_TRANSFER','CARD','OTHER') NOT NULL,
  reference VARCHAR(180) NULL,
  received_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_payments_sale (sale_id),
  CONSTRAINT fk_payments_sale FOREIGN KEY (sale_id) REFERENCES sales(id),
  CONSTRAINT chk_payments_amount CHECK (amount > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS schema_migrations (
  name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (name)
) ENGINE=InnoDB;
