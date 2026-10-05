CREATE TABLE seller_images (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  seller_id BIGINT UNSIGNED NOT NULL,
  image_data MEDIUMBLOB NOT NULL,
  mime_type VARCHAR(50) NOT NULL,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  captured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_seller_images_seller (seller_id,sort_order),
  CONSTRAINT fk_seller_images_seller FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE
) ENGINE=InnoDB;
