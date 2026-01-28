using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EmployeeManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddCallSignAndBirthDateToEmployee : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CallSign",
                table: "Employees",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "BirthDate",
                table: "Employees",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CallSign",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "BirthDate",
                table: "Employees");
        }
    }
}
