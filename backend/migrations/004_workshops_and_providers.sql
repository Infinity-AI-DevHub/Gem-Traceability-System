CREATE TABLE IF NOT EXISTS workshops (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(180) NOT NULL,
  workshop_type ENUM('CUTTING','TREATMENT','BOTH') NOT NULL DEFAULT 'BOTH',
  phone VARCHAR(50) NULL,
  email VARCHAR(254) NULL,
  address VARCHAR(255) NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_workshops_name (name),
  INDEX idx_workshops_active_name (active, name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS providers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  workshop_id BIGINT UNSIGNED NOT NULL,
  display_name VARCHAR(180) NOT NULL,
  specialty ENUM('CUTTING','TREATMENT','BOTH') NOT NULL DEFAULT 'BOTH',
  phone VARCHAR(50) NULL,
  email VARCHAR(254) NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_provider_workshop_name (workshop_id, display_name),
  INDEX idx_providers_active_name (active, display_name),
  CONSTRAINT fk_providers_workshop FOREIGN KEY (workshop_id) REFERENCES workshops(id)
) ENGINE=InnoDB;

INSERT IGNORE INTO workshops (name, workshop_type, phone, email, address)
SELECT display_name,
       CASE WHEN role = 'CUTTER' THEN 'CUTTING' ELSE 'TREATMENT' END,
       phone, email, locality
FROM contacts
WHERE role IN ('CUTTER', 'LABORATORY');

INSERT IGNORE INTO providers (workshop_id, display_name, specialty, phone, email)
SELECT w.id, c.display_name,
       CASE WHEN c.role = 'CUTTER' THEN 'CUTTING' ELSE 'TREATMENT' END,
       c.phone, c.email
FROM contacts c
JOIN workshops w ON w.name = c.display_name
WHERE c.role IN ('CUTTER', 'LABORATORY');

ALTER TABLE workshop_jobs
  ADD COLUMN workshop_id BIGINT UNSIGNED NULL AFTER job_type,
  ADD COLUMN provider_id BIGINT UNSIGNED NULL AFTER workshop_id;

UPDATE workshop_jobs j
JOIN contacts c ON c.id = j.provider_contact_id
JOIN workshops w ON w.name = c.display_name
JOIN providers p ON p.workshop_id = w.id AND p.display_name = c.display_name
SET j.workshop_id = w.id, j.provider_id = p.id;

ALTER TABLE workshop_jobs
  MODIFY provider_contact_id BIGINT UNSIGNED NULL,
  ADD INDEX idx_jobs_workshop (workshop_id),
  ADD INDEX idx_jobs_provider (provider_id),
  ADD CONSTRAINT fk_jobs_workshop FOREIGN KEY (workshop_id) REFERENCES workshops(id),
  ADD CONSTRAINT fk_jobs_provider_record FOREIGN KEY (provider_id) REFERENCES providers(id);
