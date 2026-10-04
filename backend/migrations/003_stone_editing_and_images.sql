ALTER TABLE stones
  ADD COLUMN cut_style VARCHAR(100) NULL AFTER shape;

CREATE TABLE IF NOT EXISTS stone_images (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  stone_id VARCHAR(32) NOT NULL,
  image_data MEDIUMBLOB NOT NULL,
  mime_type ENUM('image/jpeg','image/png','image/webp') NOT NULL,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  captured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_stone_images_order (stone_id, sort_order, id),
  CONSTRAINT fk_stone_images_stone FOREIGN KEY (stone_id) REFERENCES stones(id) ON DELETE CASCADE
) ENGINE=InnoDB;
