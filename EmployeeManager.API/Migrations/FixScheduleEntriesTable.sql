-- Fix ScheduleEntries table structure
-- This script ensures the table has StartTime and EndTime columns instead of Date and Hours

-- Step 1: Add EndTime column if it doesn't exist
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'EndTime')
BEGIN
    ALTER TABLE [ScheduleEntries] ADD [EndTime] datetime2 NULL;
    PRINT 'Added EndTime column';
END
ELSE
BEGIN
    PRINT 'EndTime column already exists';
END

-- Step 2: Migrate data from Date + Hours to StartTime + EndTime
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'Date')
AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'Hours')
BEGIN
    -- Migrate data: EndTime = Date + Hours (only if EndTime is NULL)
    UPDATE ScheduleEntries
    SET EndTime = DATEADD(HOUR, CAST(Hours AS INT), Date)
    WHERE EndTime IS NULL;
    PRINT 'Migrated data from Date + Hours to EndTime';
END

-- Step 3: Make EndTime NOT NULL if it's still nullable
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'EndTime' AND is_nullable = 1)
BEGIN
    -- First, set default value for any NULL EndTime values
    UPDATE ScheduleEntries
    SET EndTime = DATEADD(HOUR, 8, StartTime)
    WHERE EndTime IS NULL;
    
    -- Then make it NOT NULL
    ALTER TABLE [ScheduleEntries] ALTER COLUMN [EndTime] datetime2 NOT NULL;
    PRINT 'Made EndTime NOT NULL';
END
ELSE
BEGIN
    PRINT 'EndTime is already NOT NULL';
END

-- Step 4: Rename Date to StartTime if Date exists and StartTime doesn't
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'Date')
AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'StartTime')
BEGIN
    EXEC sp_rename 'ScheduleEntries.Date', 'StartTime', 'COLUMN';
    PRINT 'Renamed Date column to StartTime';
END
ELSE IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'StartTime')
BEGIN
    PRINT 'StartTime column already exists';
END
ELSE
BEGIN
    PRINT 'Warning: Neither Date nor StartTime column found';
END

-- Step 5: Drop Hours column if it exists
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'Hours')
BEGIN
    ALTER TABLE [ScheduleEntries] DROP COLUMN [Hours];
    PRINT 'Dropped Hours column';
END
ELSE
BEGIN
    PRINT 'Hours column does not exist';
END

-- Step 6: Drop Date column if it still exists (should not happen if rename worked)
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'Date')
BEGIN
    PRINT 'Warning: Date column still exists after rename attempt';
    -- Don't drop it automatically, let the user check manually
END

PRINT 'ScheduleEntries table structure fix completed';
