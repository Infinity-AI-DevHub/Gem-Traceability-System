SET @drop_money_check = IF(
  LOCATE('MariaDB', VERSION()) > 0,
  'ALTER TABLE stones DROP CONSTRAINT chk_stones_money',
  'ALTER TABLE stones DROP CHECK chk_stones_money'
);
PREPARE drop_money_check_statement FROM @drop_money_check;
EXECUTE drop_money_check_statement;
DEALLOCATE PREPARE drop_money_check_statement;

ALTER TABLE stones
  DROP COLUMN asking_price;

ALTER TABLE stones
  ADD CONSTRAINT chk_stones_purchase_cost CHECK (purchase_cost >= 0);
