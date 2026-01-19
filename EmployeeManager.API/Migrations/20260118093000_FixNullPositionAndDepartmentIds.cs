using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EmployeeManager.API.Migrations
{
    /// <inheritdoc />
    public partial class FixNullPositionAndDepartmentIds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Update all employees with NULL DepartmentId to Reserve department
            migrationBuilder.Sql(@"
                UPDATE Employees
                SET DepartmentId = (
                    SELECT TOP 1 Id FROM Departments 
                    WHERE Name = 'Reserve' OR Name = 'Резерв' OR Name = 'Global Reserve'
                )
                WHERE DepartmentId IS NULL
            ");

            // Update all employees with NULL PositionId to Unemployed position
            migrationBuilder.Sql(@"
                UPDATE Employees
                SET PositionId = (
                    SELECT TOP 1 Id FROM Positions 
                    WHERE Title = 'Unemployed' OR Title = 'Без Посади'
                )
                WHERE PositionId IS NULL
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // This migration cannot be reversed as it fixes data integrity issues
            // Setting values back to NULL would violate business rules
        }
    }
}
