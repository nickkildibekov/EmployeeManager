using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EmployeeManager.API.Migrations
{
    /// <inheritdoc />
    public partial class ForceFixScheduleEntriesTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Force fix ScheduleEntries table structure
            // This migration ensures the table has StartTime and EndTime columns instead of Date and Hours
            
            // Step 1: Add EndTime column if it doesn't exist
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'EndTime')
                BEGIN
                    ALTER TABLE [ScheduleEntries] ADD [EndTime] datetime2 NULL;
                END
            ");

            // Step 2: Migrate data from Date to EndTime
            // Use dynamic SQL to avoid syntax errors when Hours column doesn't exist
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'Date')
                BEGIN
                    DECLARE @sql NVARCHAR(MAX);
                    
                    -- Check if Hours column exists
                    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'Hours')
                    BEGIN
                        SET @sql = N'UPDATE ScheduleEntries SET EndTime = DATEADD(HOUR, CAST(Hours AS INT), Date) WHERE EndTime IS NULL';
                    END
                    ELSE
                    BEGIN
                        SET @sql = N'UPDATE ScheduleEntries SET EndTime = DATEADD(HOUR, 8, Date) WHERE EndTime IS NULL';
                    END
                    
                    EXEC sp_executesql @sql;
                END
            ");

            // Step 3: Make EndTime NOT NULL if it's still nullable
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'EndTime' AND is_nullable = 1)
                BEGIN
                    -- First, set default value for any NULL EndTime values (8 hours from StartTime)
                    UPDATE ScheduleEntries
                    SET EndTime = DATEADD(HOUR, 8, ISNULL(StartTime, Date))
                    WHERE EndTime IS NULL;
                    
                    -- Then make it NOT NULL
                    ALTER TABLE [ScheduleEntries] ALTER COLUMN [EndTime] datetime2 NOT NULL;
                END
            ");

            // Step 4: Rename Date to StartTime if Date exists and StartTime doesn't
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'Date')
                AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'StartTime')
                BEGIN
                    EXEC sp_rename 'ScheduleEntries.Date', 'StartTime', 'COLUMN';
                END
            ");

            // Step 5: Drop Hours column if it exists
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'Hours')
                BEGIN
                    ALTER TABLE [ScheduleEntries] DROP COLUMN [Hours];
                END
            ");

            // Step 6: Ensure StartTime is NOT NULL (in case it was nullable)
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'StartTime' AND is_nullable = 1)
                BEGIN
                    -- Set default value for any NULL StartTime values (current date)
                    UPDATE ScheduleEntries
                    SET StartTime = GETDATE()
                    WHERE StartTime IS NULL;
                    
                    ALTER TABLE [ScheduleEntries] ALTER COLUMN [StartTime] datetime2 NOT NULL;
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // This is a fix migration, so Down() is intentionally left empty
            // Reverting would require restoring the old structure, which is not recommended
        }
    }
}
