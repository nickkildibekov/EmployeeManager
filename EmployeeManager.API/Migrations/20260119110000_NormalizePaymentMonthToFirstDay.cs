using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EmployeeManager.API.Migrations
{
    /// <inheritdoc />
    public partial class NormalizePaymentMonthToFirstDay : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Normalize PaymentMonth to first day of month for all existing records
            // This ensures that PaymentMonth is always the 1st of the month, regardless of when it was originally set
            migrationBuilder.Sql(@"
                UPDATE UtilityPayments
                SET PaymentMonth = DATEFROMPARTS(YEAR(PaymentMonth), MONTH(PaymentMonth), 1)
                WHERE DAY(PaymentMonth) != 1;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Cannot reverse this operation as we don't know the original day values
            // This migration is irreversible by design
        }
    }
}
