using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EmployeeManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddEntryDateToFuelTransaction : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add column as nullable first
            migrationBuilder.AddColumn<DateTime>(
                name: "EntryDate",
                table: "FuelTransactions",
                type: "datetime2",
                nullable: true);

            // Backfill EntryDate from related records
            // For expenses: use EntryDate from FuelExpenses
            migrationBuilder.Sql(@"
                UPDATE ft
                SET ft.EntryDate = fe.EntryDate
                FROM FuelTransactions ft
                INNER JOIN FuelExpenses fe ON ft.RelatedId = fe.Id
                WHERE ft.EntryDate IS NULL
            ");

            // For incomes: use TransactionDate from FuelIncomes
            migrationBuilder.Sql(@"
                UPDATE ft
                SET ft.EntryDate = fi.TransactionDate
                FROM FuelTransactions ft
                INNER JOIN FuelIncomes fi ON ft.RelatedId = fi.Id
                WHERE ft.EntryDate IS NULL
            ");

            // For any remaining nulls, use CreatedAt as fallback
            migrationBuilder.Sql(@"
                UPDATE FuelTransactions
                SET EntryDate = CreatedAt
                WHERE EntryDate IS NULL
            ");

            // Make column non-nullable
            migrationBuilder.AlterColumn<DateTime>(
                name: "EntryDate",
                table: "FuelTransactions",
                type: "datetime2",
                nullable: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EntryDate",
                table: "FuelTransactions");
        }
    }
}
