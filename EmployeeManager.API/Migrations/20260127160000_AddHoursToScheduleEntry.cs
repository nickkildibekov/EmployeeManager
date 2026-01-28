using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EmployeeManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddHoursToScheduleEntry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add Hours column if it doesn't exist
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'Hours')
                BEGIN
                    ALTER TABLE [ScheduleEntries] ADD [Hours] decimal(18,2) NOT NULL DEFAULT 0;
                END
            ");

            // Calculate and update Hours for existing entries
            migrationBuilder.Sql(@"
                UPDATE ScheduleEntries
                SET Hours = CAST(DATEDIFF(MINUTE, StartTime, EndTime) AS DECIMAL(18,2)) / 60.0
                WHERE Hours = 0 OR Hours IS NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop Hours column if it exists
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ScheduleEntries') AND name = 'Hours')
                BEGIN
                    ALTER TABLE [ScheduleEntries] DROP COLUMN [Hours];
                END
            ");
        }
    }
}
