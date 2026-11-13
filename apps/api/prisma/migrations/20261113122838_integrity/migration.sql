-- Захист у глибину: не більше одного ACTIVE-запису на пристрій
CREATE UNIQUE INDEX "assignments_one_active_per_device"
  ON "assignments" ("device_id") WHERE "status" = 'ACTIVE';

-- Співробітник не може мати дві PENDING-заявки на той самий пристрій
CREATE UNIQUE INDEX "assignments_one_pending_per_user_device"
  ON "assignments" ("user_id", "device_id") WHERE "status" = 'PENDING';

-- Узгодженість дат
ALTER TABLE "assignments"
  ADD CONSTRAINT "assignments_returned_after_assigned"
  CHECK ("returned_at" IS NULL OR ("assigned_at" IS NOT NULL AND "returned_at" >= "assigned_at"));

-- Швидкий пошук за назвою (ILIKE '%...%')
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "devices_name_trgm" ON "devices" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "devices_inventory_trgm" ON "devices" USING GIN ("inventory_number" gin_trgm_ops);
