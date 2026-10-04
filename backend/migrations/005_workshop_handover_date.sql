ALTER TABLE workshop_jobs
  ADD COLUMN handover_on DATE NULL AFTER status;

UPDATE workshop_jobs
SET handover_on = DATE(COALESCE(dispatched_at, created_at))
WHERE handover_on IS NULL;
