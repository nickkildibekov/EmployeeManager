using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EmployeeManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddFuelPayment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FuelPayments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ResponsibleEmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    EquipmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EntryDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PreviousMileage = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    CurrentMileage = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    PricePerLiter = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    FuelType = table.Column<int>(type: "int", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    OdometerImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FuelPayments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FuelPayments_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_FuelPayments_Employees_ResponsibleEmployeeId",
                        column: x => x.ResponsibleEmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_FuelPayments_Equipments_EquipmentId",
                        column: x => x.EquipmentId,
                        principalTable: "Equipments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FuelPayments_DepartmentId",
                table: "FuelPayments",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_FuelPayments_EquipmentId",
                table: "FuelPayments",
                column: "EquipmentId");

            migrationBuilder.CreateIndex(
                name: "IX_FuelPayments_ResponsibleEmployeeId",
                table: "FuelPayments",
                column: "ResponsibleEmployeeId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FuelPayments");
        }
    }
}
