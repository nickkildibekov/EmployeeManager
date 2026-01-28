using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EmployeeManager.API.Migrations
{
    /// <inheritdoc />
    public partial class SplitUtilityPaymentsByType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UtilityPayments");

            migrationBuilder.CreateTable(
                name: "ElectricityPayments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ResponsibleEmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PreviousValue = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: true),
                    CurrentValue = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: true),
                    PreviousValueNight = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: true),
                    CurrentValueNight = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: true),
                    PricePerUnit = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    PricePerUnitNight = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: false),
                    BillImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PaymentMonth = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ElectricityPayments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ElectricityPayments_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ElectricityPayments_Employees_ResponsibleEmployeeId",
                        column: x => x.ResponsibleEmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "GasPayments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ResponsibleEmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PreviousValue = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: true),
                    CurrentValue = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: true),
                    PricePerUnit = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: false),
                    BillImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PaymentMonth = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GasPayments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GasPayments_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_GasPayments_Employees_ResponsibleEmployeeId",
                        column: x => x.ResponsibleEmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "RentPayments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ResponsibleEmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PreviousValue = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: true),
                    CurrentValue = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: true),
                    PricePerUnit = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: false),
                    BillImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PaymentMonth = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RentPayments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RentPayments_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RentPayments_Employees_ResponsibleEmployeeId",
                        column: x => x.ResponsibleEmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "WaterPayments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ResponsibleEmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PreviousValue = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: true),
                    CurrentValue = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: true),
                    PricePerUnit = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: false),
                    BillImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PaymentMonth = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WaterPayments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WaterPayments_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WaterPayments_Employees_ResponsibleEmployeeId",
                        column: x => x.ResponsibleEmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ElectricityPayments_DepartmentId",
                table: "ElectricityPayments",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_ElectricityPayments_ResponsibleEmployeeId",
                table: "ElectricityPayments",
                column: "ResponsibleEmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_GasPayments_DepartmentId",
                table: "GasPayments",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_GasPayments_ResponsibleEmployeeId",
                table: "GasPayments",
                column: "ResponsibleEmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_RentPayments_DepartmentId",
                table: "RentPayments",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_RentPayments_ResponsibleEmployeeId",
                table: "RentPayments",
                column: "ResponsibleEmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_WaterPayments_DepartmentId",
                table: "WaterPayments",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_WaterPayments_ResponsibleEmployeeId",
                table: "WaterPayments",
                column: "ResponsibleEmployeeId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ElectricityPayments");

            migrationBuilder.DropTable(
                name: "GasPayments");

            migrationBuilder.DropTable(
                name: "RentPayments");

            migrationBuilder.DropTable(
                name: "WaterPayments");

            migrationBuilder.CreateTable(
                name: "UtilityPayments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ResponsibleEmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    BillImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CurrentValue = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: true),
                    CurrentValueNight = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: true),
                    PaymentMonth = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PaymentType = table.Column<int>(type: "int", nullable: false),
                    PreviousValue = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: true),
                    PreviousValueNight = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: true),
                    PricePerUnit = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    PricePerUnitNight = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,3)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UtilityPayments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UtilityPayments_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UtilityPayments_Employees_ResponsibleEmployeeId",
                        column: x => x.ResponsibleEmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UtilityPayments_DepartmentId",
                table: "UtilityPayments",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_UtilityPayments_ResponsibleEmployeeId",
                table: "UtilityPayments",
                column: "ResponsibleEmployeeId");
        }
    }
}
