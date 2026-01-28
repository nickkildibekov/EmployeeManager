using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EmployeeManager.API.Migrations
{
    /// <inheritdoc />
    public partial class FixDecimalPrecision : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Decimal precision for Equipment.Amount and ScheduleEntry.Hours
            // is already configured in AppDbContext.OnModelCreating with HasPrecision(18, 2)
            // The database columns already have the correct precision from previous migrations
            // This migration is a no-op to sync the migration history
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No changes to revert
        }
    }
}
