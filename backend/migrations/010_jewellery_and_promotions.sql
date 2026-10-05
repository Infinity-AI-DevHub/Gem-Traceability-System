ALTER TABLE stones MODIFY status ENUM(
  'AVAILABLE','RESERVED','IN_CUTTING','IN_TREATMENT','IN_JEWELLERY','JEWELLERY','SOLD','ON_HOLD'
) NOT NULL DEFAULT 'AVAILABLE';

ALTER TABLE workshops MODIFY workshop_type ENUM(
  'CUTTING','TREATMENT','BOTH','JEWELLERY','ALL'
) NOT NULL DEFAULT 'BOTH';

CREATE TABLE jewellery_jobs (
  id VARCHAR(32) NOT NULL,
  stone_id VARCHAR(32) NOT NULL,
  workshop_id BIGINT UNSIGNED NOT NULL,
  status ENUM('WITH_WORKSHOP','RECEIVED') NOT NULL DEFAULT 'WITH_WORKSHOP',
  handed_over_at DATETIME NOT NULL,
  deadline_on DATE NOT NULL,
  received_at DATETIME NULL,
  instructions TEXT NULL,
  receive_notes TEXT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_jewellery_jobs_stone_status (stone_id,status),
  CONSTRAINT fk_jewellery_jobs_stone FOREIGN KEY (stone_id) REFERENCES stones(id),
  CONSTRAINT fk_jewellery_jobs_workshop FOREIGN KEY (workshop_id) REFERENCES workshops(id)
) ENGINE=InnoDB;

CREATE TABLE jewellery_profiles (
  id VARCHAR(32) NOT NULL,
  stone_id VARCHAR(32) NOT NULL,
  job_id VARCHAR(32) NOT NULL,
  item_type VARCHAR(100) NOT NULL DEFAULT 'Jewellery',
  metal_type VARCHAR(100) NULL,
  metal_purity VARCHAR(60) NULL,
  metal_weight DECIMAL(12,3) NULL,
  total_weight DECIMAL(12,3) NULL,
  setting_style VARCHAR(150) NULL,
  item_size VARCHAR(100) NULL,
  description TEXT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_jewellery_profiles_stone (stone_id),
  UNIQUE KEY uq_jewellery_profiles_job (job_id),
  CONSTRAINT fk_jewellery_profiles_stone FOREIGN KEY (stone_id) REFERENCES stones(id),
  CONSTRAINT fk_jewellery_profiles_job FOREIGN KEY (job_id) REFERENCES jewellery_jobs(id)
) ENGINE=InnoDB;

CREATE TABLE jewellery_images (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  jewellery_id VARCHAR(32) NOT NULL,
  image_data MEDIUMBLOB NOT NULL,
  mime_type VARCHAR(50) NOT NULL,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  captured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_jewellery_images_profile (jewellery_id,sort_order),
  CONSTRAINT fk_jewellery_images_profile FOREIGN KEY (jewellery_id) REFERENCES jewellery_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE companies (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(180) NOT NULL,
  phone VARCHAR(50) NULL,
  email VARCHAR(180) NULL,
  address VARCHAR(255) NULL,
  contact_person VARCHAR(180) NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_companies_name (name)
) ENGINE=InnoDB;

CREATE TABLE promotion_handovers (
  id VARCHAR(32) NOT NULL,
  stone_id VARCHAR(32) NOT NULL,
  company_id BIGINT UNSIGNED NOT NULL,
  status ENUM('WITH_COMPANY','RETURNED') NOT NULL DEFAULT 'WITH_COMPANY',
  handed_over_at DATETIME NOT NULL,
  deadline_on DATE NOT NULL,
  returned_at DATETIME NULL,
  notes VARCHAR(500) NULL,
  return_notes VARCHAR(500) NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_promotion_stone_status (stone_id,status),
  INDEX idx_promotion_company (company_id),
  CONSTRAINT fk_promotion_stone FOREIGN KEY (stone_id) REFERENCES stones(id),
  CONSTRAINT fk_promotion_company FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB;

INSERT IGNORE INTO workshops (name,workshop_type,phone,address)
VALUES ('Ceylon Jewellery Atelier','JEWELLERY','+94 11 245 8890','Colombo 03');

INSERT IGNORE INTO companies (name,phone,email,address,contact_person) VALUES
('Lanka Luxury Events','+94 11 278 4410','events@lankaluxury.lk','Colombo 07','Nadeesha Silva'),
('Serendib Fashion House','+94 11 291 7720','promotions@serendibfashion.lk','Colombo 03','Amal Fernando');
