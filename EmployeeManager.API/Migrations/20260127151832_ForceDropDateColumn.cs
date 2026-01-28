using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EmployeeManager.API.Migrations
{
    /// <inheritdoc />
    public partial class ForceDropDateColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Force drop Date column if it still exists
            // This handles the case where Date column wasn't properly renamed to StartTime
            migrationBuilder.Sql(@"
                -- If both Date and StartTime exist, ensure data is copied and drop Date
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'Date')
                   AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'StartTime')
                BEGIN
                    -- Copy any remaining data from Date to StartTime where StartTime might be NULL
                    UPDATE ScheduleEntries
                    SET StartTime = Date
                    WHERE StartTime IS NULL AND Date IS NOT NULL;
                    
                    -- Drop Date column
                    ALTER TABLE [ScheduleEntries] DROP COLUMN [Date];
                    PRINT 'Dropped Date column (StartTime already exists)';
                END
                -- If only Date exists (StartTime doesn't), rename it
                ELSE IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'Date')
                   AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'StartTime')
                BEGIN
                    EXEC sp_rename 'ScheduleEntries.Date', 'StartTime', 'COLUMN';
                    PRINT 'Renamed Date to StartTime';
                END
                -- If Date still exists somehow, drop it
                ELSE IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'Date')
                BEGIN
                    -- Make sure StartTime has data before dropping Date
                    DECLARE @sql NVARCHAR(MAX);
                    SET @sql = N'
                        UPDATE ScheduleEntries
                        SET StartTime = Date
                        WHERE StartTime IS NULL AND Date IS NOT NULL;
                    ';
                    EXEC sp_executesql @sql;
                    
                    ALTER TABLE [ScheduleEntries] DROP COLUMN [Date];
                    PRINT 'Force dropped Date column';
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
