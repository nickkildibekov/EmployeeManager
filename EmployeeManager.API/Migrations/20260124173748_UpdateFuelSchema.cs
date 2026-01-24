using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EmployeeManager.API.Migrations
{
    /// <inheritdoc />
    public partial class UpdateFuelSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FuelPayments_Departments_DepartmentId",
                table: "FuelPayments");

            migrationBuilder.DropForeignKey(
                name: "FK_FuelPayments_Employees_ResponsibleEmployeeId",
                table: "FuelPayments");

            migrationBuilder.DropForeignKey(
                name: "FK_FuelPayments_Equipments_EquipmentId",
                table: "FuelPayments");

            migrationBuilder.DropTable(
                name: "FuelStockEntries");

            migrationBuilder.DropPrimaryKey(
                name: "PK_FuelPayments",
                table: "FuelPayments");

            migrationBuilder.DropColumn(
                name: "CurrentValue",
                table: "RentPayments");

            migrationBuilder.DropColumn(
                name: "PreviousValue",
                table: "RentPayments");

            migrationBuilder.DropColumn(
                name: "FuelBalance",
                table: "FuelPayments");

            migrationBuilder.DropColumn(
                name: "NoCost",
                table: "FuelPayments");

            migrationBuilder.DropColumn(
                name: "PricePerLiter",
                table: "FuelPayments");

            migrationBuilder.RenameTable(
                name: "FuelPayments",
                newName: "FuelExpenses");

            migrationBuilder.RenameIndex(
                name: "IX_FuelPayments_ResponsibleEmployeeId",
                table: "FuelExpenses",
                newName: "IX_FuelExpenses_ResponsibleEmployeeId");

            migrationBuilder.RenameIndex(
                name: "IX_FuelPayments_EquipmentId",
                table: "FuelExpenses",
                newName: "IX_FuelExpenses_EquipmentId");

            migrationBuilder.RenameIndex(
                name: "IX_FuelPayments_DepartmentId",
                table: "FuelExpenses",
                newName: "IX_FuelExpenses_DepartmentId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_FuelExpenses",
                table: "FuelExpenses",
                column: "Id");

            migrationBuilder.CreateTable(
                name: "FuelIncomes",
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
                    table.PrimaryKey("PK_FuelIncomes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FuelIncomes_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_FuelIncomes_Employees_ReceiverEmployeeId",
                        column: x => x.ReceiverEmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "FuelTransactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    RelatedId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FuelTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FuelTransactions_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FuelIncomes_DepartmentId",
                table: "FuelIncomes",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_FuelIncomes_ReceiverEmployeeId",
                table: "FuelIncomes",
                column: "ReceiverEmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_FuelTransactions_DepartmentId",
                table: "FuelTransactions",
                column: "DepartmentId");

            migrationBuilder.AddForeignKey(
                name: "FK_FuelExpenses_Departments_DepartmentId",
                table: "FuelExpenses",
                column: "DepartmentId",
                principalTable: "Departments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_FuelExpenses_Employees_ResponsibleEmployeeId",
                table: "FuelExpenses",
                column: "ResponsibleEmployeeId",
                principalTable: "Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_FuelExpenses_Equipments_EquipmentId",
                table: "FuelExpenses",
                column: "EquipmentId",
                principalTable: "Equipments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FuelExpenses_Departments_DepartmentId",
                table: "FuelExpenses");

            migrationBuilder.DropForeignKey(
                name: "FK_FuelExpenses_Employees_ResponsibleEmployeeId",
                table: "FuelExpenses");

            migrationBuilder.DropForeignKey(
                name: "FK_FuelExpenses_Equipments_EquipmentId",
                table: "FuelExpenses");

            migrationBuilder.DropTable(
                name: "FuelIncomes");

            migrationBuilder.DropTable(
                name: "FuelTransactions");

            migrationBuilder.DropPrimaryKey(
                name: "PK_FuelExpenses",
                table: "FuelExpenses");

            migrationBuilder.RenameTable(
                name: "FuelExpenses",
                newName: "FuelPayments");

            migrationBuilder.RenameIndex(
                name: "IX_FuelExpenses_ResponsibleEmployeeId",
                table: "FuelPayments",
                newName: "IX_FuelPayments_ResponsibleEmployeeId");

            migrationBuilder.RenameIndex(
                name: "IX_FuelExpenses_EquipmentId",
                table: "FuelPayments",
                newName: "IX_FuelPayments_EquipmentId");

            migrationBuilder.RenameIndex(
                name: "IX_FuelExpenses_DepartmentId",
                table: "FuelPayments",
                newName: "IX_FuelPayments_DepartmentId");

            migrationBuilder.AddColumn<decimal>(
                name: "CurrentValue",
                table: "RentPayments",
                type: "decimal(18,3)",
                precision: 18,
                scale: 3,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PreviousValue",
                table: "RentPayments",
                type: "decimal(18,3)",
                precision: 18,
                scale: 3,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "FuelBalance",
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

            migrationBuilder.AddColumn<decimal>(
                name: "PricePerLiter",
                table: "FuelPayments",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddPrimaryKey(
                name: "PK_FuelPayments",
                table: "FuelPayments",
                column: "Id");

            migrationBuilder.CreateTable(
                name: "FuelStockEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReceiverEmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    FuelType = table.Column<int>(type: "int", nullable: false),
                    TransactionDate = table.Column<DateTime>(type: "datetime2", nullable: false)
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

            migrationBuilder.AddForeignKey(
                name: "FK_FuelPayments_Departments_DepartmentId",
                table: "FuelPayments",
                column: "DepartmentId",
                principalTable: "Departments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_FuelPayments_Employees_ResponsibleEmployeeId",
                table: "FuelPayments",
                column: "ResponsibleEmployeeId",
                principalTable: "Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_FuelPayments_Equipments_EquipmentId",
                table: "FuelPayments",
                column: "EquipmentId",
                principalTable: "Equipments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
