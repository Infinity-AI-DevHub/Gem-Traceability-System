ALTER TABLE stone_images
  MODIFY image_data MEDIUMBLOB NULL,
  ADD COLUMN file_path VARCHAR(500) NULL AFTER image_data;

ALTER TABLE seller_images
  MODIFY image_data MEDIUMBLOB NULL,
  ADD COLUMN file_path VARCHAR(500) NULL AFTER image_data;

ALTER TABLE jewellery_images
  MODIFY image_data MEDIUMBLOB NULL,
  ADD COLUMN file_path VARCHAR(500) NULL AFTER image_data;
