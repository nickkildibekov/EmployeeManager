using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EmployeeManager.API.Migrations
{
    /// <inheritdoc />
    public partial class DropFuelUsageColumnsAndSeedFuelTransactions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Seed FuelTransactions from existing FuelIncomes (надходження, плюс)
            migrationBuilder.Sql(@"
INSERT INTO FuelTransactions (Id, DepartmentId, [Type], Amount, RelatedId, CreatedAt)
SELECT
    NEWID()                         AS Id,
    fi.DepartmentId                 AS DepartmentId,
    fi.FuelType                     AS [Type],
    fi.Amount                       AS Amount,
    fi.Id                           AS RelatedId,
    fi.CreatedAt                    AS CreatedAt
FROM FuelIncomes fi
WHERE NOT EXISTS (
    SELECT 1
    FROM FuelTransactions t
    WHERE t.RelatedId = fi.Id
);
");

            // Seed FuelTransactions from existing FuelExpenses (витрати, мінус)
            // Використовуємо колонку FuelUsed, поки вона ще існує
            migrationBuilder.Sql(@"
INSERT INTO FuelTransactions (Id, DepartmentId, [Type], Amount, RelatedId, CreatedAt)
SELECT
    NEWID()                         AS Id,
    fe.DepartmentId                 AS DepartmentId,
    fe.FuelType                     AS [Type],
    -ISNULL(fe.FuelUsed, 0)         AS Amount,
    fe.Id                           AS RelatedId,
    fe.CreatedAt                    AS CreatedAt
FROM FuelExpenses fe
WHERE NOT EXISTS (
    SELECT 1
    FROM FuelTransactions t
    WHERE t.RelatedId = fe.Id
);
");

            migrationBuilder.DropColumn(
                name: "ConsumptionPer100km",
                table: "FuelExpenses");

            migrationBuilder.DropColumn(
                name: "FuelUsed",
                table: "FuelExpenses");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ConsumptionPer100km",
                table: "FuelExpenses",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "FuelUsed",
                table: "FuelExpenses",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);
        }
    }
}
