using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EmployeeManager.API.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceIsWorkWithStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsWork",
                table: "Equipments");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Equipments",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "Used");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Status",
                table: "Equipments");

            migrationBuilder.AddColumn<bool>(
                name: "IsWork",
                table: "Equipments",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }
    }
}
