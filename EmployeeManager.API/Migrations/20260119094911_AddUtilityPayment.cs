using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EmployeeManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddUtilityPayment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UtilityPayments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ResponsibleEmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PaymentType = table.Column<int>(type: "int", nullable: false),
                    PreviousValue = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    CurrentValue = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    PreviousValueNight = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    CurrentValueNight = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    PricePerUnit = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    BillImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UtilityPayments");
        }
    }
}
