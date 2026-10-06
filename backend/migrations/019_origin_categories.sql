INSERT IGNORE INTO category_items (category_key, name, sort_order)
SELECT 'ORIGIN', TRIM(origin), 0
FROM stones
WHERE NULLIF(TRIM(origin), '') IS NOT NULL
GROUP BY TRIM(origin);
