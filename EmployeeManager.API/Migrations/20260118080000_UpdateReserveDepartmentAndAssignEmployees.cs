using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EmployeeManager.API.Migrations
{
    /// <inheritdoc />
    public partial class UpdateReserveDepartmentAndAssignEmployees : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Update old department names to "Reserve"
            migrationBuilder.Sql(@"
                UPDATE Departments 
                SET Name = 'Reserve' 
                WHERE Name = 'Резерв' OR Name = 'Global Reserve' OR Name = 'Unassigned';
            ");

            // Ensure "Reserve" department exists
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM Departments WHERE Name = 'Reserve')
                BEGIN
                    INSERT INTO Departments (Name) VALUES ('Reserve');
                END
            ");

            // Update old position names to "Unemployed"
            migrationBuilder.Sql(@"
                UPDATE Positions 
                SET Title = 'Unemployed' 
                WHERE Title = 'Без Посади';
            ");

            // Ensure "Unemployed" position exists
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM Positions WHERE Title = 'Unemployed')
                BEGIN
                    INSERT INTO Positions (Title) VALUES ('Unemployed');
                END
            ");

            // Update old specialization names to "Intern"
            migrationBuilder.Sql(@"
                UPDATE Specializations 
                SET Name = 'Intern' 
                WHERE Name = 'Без Спец.';
            ");

            // Ensure "Intern" specialization exists
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM Specializations WHERE Name = 'Intern')
                BEGIN
                    INSERT INTO Specializations (Name) VALUES ('Intern');
                END
            ");

            // Assign all employees with null DepartmentId to Reserve department
            migrationBuilder.Sql(@"
                UPDATE Employees 
                SET DepartmentId = (SELECT TOP 1 Id FROM Departments WHERE Name = 'Reserve')
                WHERE DepartmentId IS NULL;
            ");

            // Set position to Unemployed for employees in Reserve without position
            migrationBuilder.Sql(@"
                UPDATE Employees 
                SET PositionId = (SELECT TOP 1 Id FROM Positions WHERE Title = 'Unemployed')
                WHERE DepartmentId = (SELECT TOP 1 Id FROM Departments WHERE Name = 'Reserve') 
                  AND PositionId IS NULL;
            ");

            // Set specialization to Intern for employees without valid specialization
            migrationBuilder.Sql(@"
                UPDATE Employees 
                SET SpecializationId = (SELECT TOP 1 Id FROM Specializations WHERE Name = 'Intern')
                WHERE SpecializationId = 0 
                   OR SpecializationId NOT IN (SELECT Id FROM Specializations);
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Revert employees back to null (optional - may not be needed)
            // This is a one-way migration in practice
        }
    }
}
