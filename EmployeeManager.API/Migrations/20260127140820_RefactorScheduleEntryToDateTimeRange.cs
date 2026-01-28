using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EmployeeManager.API.Migrations
{
    /// <inheritdoc />
    public partial class RefactorScheduleEntryToDateTimeRange : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Check if EndTime already exists, if not add it
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'EndTime')
                BEGIN
                    ALTER TABLE [ScheduleEntries] ADD [EndTime] datetime2 NULL;
                END
            ");

            // Migrate data: EndTime = Date + Hours (only if EndTime is NULL and Date/Hours exist)
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'Date')
                AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'Hours')
                BEGIN
                    UPDATE ScheduleEntries
                    SET EndTime = DATEADD(HOUR, CAST(Hours AS INT), Date)
                    WHERE EndTime IS NULL;
                END
            ");

            // Make EndTime not nullable if it's still nullable
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'EndTime' AND is_nullable = 1)
                BEGIN
                    ALTER TABLE [ScheduleEntries] ALTER COLUMN [EndTime] datetime2 NOT NULL;
                END
            ");

            // Rename Date to StartTime if Date exists and StartTime doesn't
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'Date')
                AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'StartTime')
                BEGIN
                    EXEC sp_rename 'ScheduleEntries.Date', 'StartTime', 'COLUMN';
                END
            ");

            // Drop Hours column if it exists
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'Hours')
                BEGIN
                    ALTER TABLE [ScheduleEntries] DROP COLUMN [Hours];
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Add Hours column
            migrationBuilder.AddColumn<decimal>(
                name: "Hours",
                table: "ScheduleEntries",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            // Migrate data back: Hours = DATEDIFF(HOUR, StartTime, EndTime)
            migrationBuilder.Sql(@"
                UPDATE ScheduleEntries
                SET Hours = CAST(DATEDIFF(HOUR, StartTime, EndTime) AS DECIMAL(18,2))
            ");

            // Rename StartTime back to Date
            migrationBuilder.RenameColumn(
                name: "StartTime",
                table: "ScheduleEntries",
                newName: "Date");

            // Drop EndTime
            migrationBuilder.DropColumn(
                name: "EndTime",
                table: "ScheduleEntries");
        }
    }
}
