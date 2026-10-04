CREATE TABLE salesmen (
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
  UNIQUE KEY uq_salesmen_name (name)
) ENGINE=InnoDB;

CREATE TABLE salesman_handovers (
  id VARCHAR(32) NOT NULL,
  stone_id VARCHAR(32) NOT NULL,
  salesman_id BIGINT UNSIGNED NOT NULL,
  status ENUM('WITH_SALESMAN','RETURNED','SOLD') NOT NULL DEFAULT 'WITH_SALESMAN',
  quoted_price DECIMAL(15,2) NOT NULL,
  handed_over_at DATETIME NOT NULL,
  deadline_on DATE NOT NULL,
  returned_at DATETIME NULL,
  sold_at DATETIME NULL,
  final_price DECIMAL(15,2) NULL,
  return_notes VARCHAR(500) NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_salesman_handovers_stone_status (stone_id, status),
  INDEX idx_salesman_handovers_salesman (salesman_id),
  CONSTRAINT fk_salesman_handovers_stone FOREIGN KEY (stone_id) REFERENCES stones(id),
  CONSTRAINT fk_salesman_handovers_salesman FOREIGN KEY (salesman_id) REFERENCES salesmen(id),
  CONSTRAINT chk_salesman_handover_quote CHECK (quoted_price > 0),
  CONSTRAINT chk_salesman_handover_final CHECK (final_price IS NULL OR final_price > 0)
) ENGINE=InnoDB;
