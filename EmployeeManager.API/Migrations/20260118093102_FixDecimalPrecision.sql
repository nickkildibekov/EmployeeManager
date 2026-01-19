-- Fix decimal precision for Equipment.Amount and ScheduleEntry.Hours
-- This migration ensures proper precision and scale for decimal columns

-- Update Equipment.Amount column precision
ALTER TABLE Equipments
ALTER COLUMN Amount DECIMAL(18, 2);

-- Update ScheduleEntry.Hours column precision
ALTER TABLE ScheduleEntries
ALTER COLUMN Hours DECIMAL(18, 2);
