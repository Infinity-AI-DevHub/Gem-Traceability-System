ALTER TABLE stones MODIFY status ENUM(
  'AVAILABLE','RESERVED','IN_CUTTING','IN_TREATMENT','IN_WORKSHOP',
  'IN_JEWELLERY','JEWELLERY','SOLD','ON_HOLD'
) NOT NULL DEFAULT 'AVAILABLE';

ALTER TABLE workshop_jobs
  MODIFY job_type VARCHAR(180) NOT NULL;

INSERT IGNORE INTO category_items (category_key, name, description, sort_order) VALUES
  ('PROCESS','Cutting','Cut, shape or polish a stone.',10),
  ('PROCESS','Treatment','Apply, assess or document a gemstone treatment.',20);
