using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EmployeeManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddFuelBalanceAndStockFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ConsumptionPer100km",
                table: "FuelPayments",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "FuelBalance",
                table: "FuelPayments",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "FuelUsed",
                table: "FuelPayments",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "NoCost",
                table: "FuelPayments",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "FuelStockEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReceiverEmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    FuelType = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TransactionDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FuelStockEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FuelStockEntries_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_FuelStockEntries_Employees_ReceiverEmployeeId",
                        column: x => x.ReceiverEmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FuelStockEntries_DepartmentId",
                table: "FuelStockEntries",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_FuelStockEntries_ReceiverEmployeeId",
                table: "FuelStockEntries",
                column: "ReceiverEmployeeId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FuelStockEntries");

            migrationBuilder.DropColumn(
                name: "ConsumptionPer100km",
                table: "FuelPayments");

            migrationBuilder.DropColumn(
                name: "FuelBalance",
                table: "FuelPayments");

            migrationBuilder.DropColumn(
                name: "FuelUsed",
                table: "FuelPayments");

            migrationBuilder.DropColumn(
                name: "NoCost",
                table: "FuelPayments");
        }
    }
}
