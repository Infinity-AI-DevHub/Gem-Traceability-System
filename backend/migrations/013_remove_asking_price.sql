ALTER TABLE stones
  DROP CHECK chk_stones_money;

ALTER TABLE stones
  DROP COLUMN asking_price;

ALTER TABLE stones
  ADD CONSTRAINT chk_stones_purchase_cost CHECK (purchase_cost >= 0);
