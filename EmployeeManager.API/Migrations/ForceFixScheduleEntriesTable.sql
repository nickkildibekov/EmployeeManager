-- Force fix ScheduleEntries table structure
-- This script will forcefully fix the table structure

-- Step 1: Check current structure
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'ScheduleEntries'
ORDER BY ORDINAL_POSITION;

-- Step 2: Add EndTime if it doesn't exist
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'EndTime')
BEGIN
    ALTER TABLE [ScheduleEntries] ADD [EndTime] datetime2 NULL;
    PRINT 'Added EndTime column';
END

-- Step 3: Migrate data to EndTime if Date exists
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'Date')
BEGIN
    DECLARE @sql NVARCHAR(MAX);
    
    -- Check if Hours column exists
    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'Hours')
    BEGIN
        SET @sql = N'UPDATE ScheduleEntries SET EndTime = DATEADD(HOUR, CAST(Hours AS INT), Date) WHERE EndTime IS NULL';
        EXEC sp_executesql @sql;
        PRINT 'Migrated data from Date + Hours to EndTime';
    END
    ELSE
    BEGIN
        SET @sql = N'UPDATE ScheduleEntries SET EndTime = DATEADD(HOUR, 8, Date) WHERE EndTime IS NULL';
        EXEC sp_executesql @sql;
        PRINT 'Set default EndTime (8 hours from Date)';
    END
END

-- Step 4: Make EndTime NOT NULL
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'EndTime' AND is_nullable = 1)
BEGIN
    UPDATE ScheduleEntries
    SET EndTime = DATEADD(HOUR, 8, ISNULL(StartTime, Date))
    WHERE EndTime IS NULL;
    
    ALTER TABLE [ScheduleEntries] ALTER COLUMN [EndTime] datetime2 NOT NULL;
    PRINT 'Made EndTime NOT NULL';
END

-- Step 5: Rename Date to StartTime (if Date exists and StartTime doesn't)
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'Date')
   AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'StartTime')
BEGIN
    EXEC sp_rename 'ScheduleEntries.Date', 'StartTime', 'COLUMN';
    PRINT 'Renamed Date to StartTime';
END

-- Step 6: If both Date and StartTime exist, copy data and drop Date
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'Date')
   AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'StartTime')
BEGIN
    -- Copy data from Date to StartTime where StartTime is NULL
    UPDATE ScheduleEntries
    SET StartTime = Date
    WHERE StartTime IS NULL;
    
    -- Drop Date column
    ALTER TABLE [ScheduleEntries] DROP COLUMN [Date];
    PRINT 'Copied data from Date to StartTime and dropped Date column';
END

-- Step 7: Drop Hours column if it exists
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'Hours')
BEGIN
    ALTER TABLE [ScheduleEntries] DROP COLUMN [Hours];
    PRINT 'Dropped Hours column';
END

-- Step 8: Ensure StartTime is NOT NULL
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'StartTime' AND is_nullable = 1)
BEGIN
    UPDATE ScheduleEntries
    SET StartTime = GETDATE()
    WHERE StartTime IS NULL;
    
    ALTER TABLE [ScheduleEntries] ALTER COLUMN [StartTime] datetime2 NOT NULL;
    PRINT 'Made StartTime NOT NULL';
END

-- Step 9: Verify final structure
PRINT 'Final structure:';
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'ScheduleEntries'
ORDER BY ORDINAL_POSITION;

PRINT 'ScheduleEntries table structure fix completed';
