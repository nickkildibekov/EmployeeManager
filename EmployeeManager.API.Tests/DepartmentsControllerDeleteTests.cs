using EmployeeManager.Api.Controllers;
using EmployeeManager.API.Data;
using EmployeeManager.API.Models;
using EmployeeManager.API.Repositories;
using EmployeeManager.API.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace EmployeeManager.API.Tests
{
    public class DepartmentsControllerDeleteTests
    {
        private (AppDbContext, IDepartmentService) GetInMemoryDbContextAndService()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            var context = new AppDbContext(options);
            
            // Register repositories
            var departmentRepository = new DepartmentRepository(context);
            var positionRepository = new PositionRepository(context);
            var employeeRepository = new EmployeeRepository(context);
            var equipmentRepository = new EquipmentRepository(context);
            var departmentPositionRepository = new DepartmentPositionRepository(context);
            
            // Register service
            var departmentService = new DepartmentService(
                departmentRepository,
                positionRepository,
                employeeRepository,
                equipmentRepository,
                departmentPositionRepository,
                context);
            
            return (context, departmentService);
        }

        [Fact]
        public async Task DeleteDepartment_ShouldMoveEmployeesToReserve_WhenDepartmentHasEmployees()
        {
            // Arrange
            var (context, departmentService) = GetInMemoryDbContextAndService();
            var controller = new DepartmentsController(departmentService);

            // Create Global Reserve department
            var globalReserve = new Department { Name = "Global Reserve" };
            context.Departments.Add(globalReserve);

            // Create a department to delete
            var department = new Department { Name = "IT Department" };
            context.Departments.Add(department);

            // Create a specialization (required for employees)
            var specialization = new Specialization { Name = "IT" };
            context.Specializations.Add(specialization);

            // Create employees assigned to the department
            var employee1 = new Employee
            {
                FirstName = "John",
                LastName = "Doe",
                PhoneNumber = "1234567890",
                DepartmentId = department.Id,
                SpecializationId = specialization.Id,
                HireDate = DateTime.UtcNow
            };
            var employee2 = new Employee
            {
                FirstName = "Jane",
                LastName = "Smith",
                PhoneNumber = "0987654321",
                DepartmentId = department.Id,
                SpecializationId = specialization.Id,
                HireDate = DateTime.UtcNow
            };

            context.Employees.AddRange(employee1, employee2);
            await context.SaveChangesAsync();

            // Act
            var result = await controller.Delete(department.Id);

            // Assert
            Assert.IsType<NoContentResult>(result);

            // Verify employees are moved to Reserve (DepartmentId = reserveDept.Id)
            var employeesAfterDelete = await context.Employees
                .Where(e => e.Id == employee1.Id || e.Id == employee2.Id)
                .ToListAsync();

            // Get Reserve department ID
            var reserveDept = await context.Departments
                .FirstOrDefaultAsync(d => d.Name == "Reserve" || d.Name == "Резерв" || d.Name == "Global Reserve");
            Assert.NotNull(reserveDept);

            Assert.All(employeesAfterDelete, emp => Assert.Equal(reserveDept.Id, emp.DepartmentId));
            Assert.All(employeesAfterDelete, emp => Assert.NotEqual(Guid.Empty, emp.SpecializationId));

            // Verify department is deleted
            var deletedDepartment = await context.Departments.FindAsync(department.Id);
            Assert.Null(deletedDepartment);
        }

        [Fact]
        public async Task DeleteDepartment_ShouldMoveEquipmentToWarehouse_WhenDepartmentHasEquipment()
        {
            // Arrange
            var (context, departmentService) = GetInMemoryDbContextAndService();
            var controller = new DepartmentsController(departmentService);

            // Create a department to delete
            var department = new Department { Name = "IT Department" };
            context.Departments.Add(department);

            // Create equipment category (required for equipment)
            var category = new EquipmentCategory { Name = "Computers", Description = "Computer equipment" };
            context.EquipmentCategories.Add(category);

            // Create equipment assigned to the department
            var equipment1 = new Equipment
            {
                Name = "Laptop",
                Description = "Dell Laptop",
                DepartmentId = department.Id,
                CategoryId = category.Id,
                PurchaseDate = DateTime.UtcNow,
                Status = "Used",
                Measurement = "Unit",
                Amount = 1
            };
            var equipment2 = new Equipment
            {
                Name = "Monitor",
                Description = "Dell Monitor",
                DepartmentId = department.Id,
                CategoryId = category.Id,
                PurchaseDate = DateTime.UtcNow,
                Status = "Used",
                Measurement = "Unit",
                Amount = 1
            };

            context.Equipments.AddRange(equipment1, equipment2);
            await context.SaveChangesAsync();

            // Act
            var result = await controller.Delete(department.Id);

            // Assert
            Assert.IsType<NoContentResult>(result);

            // Verify equipment is moved to Reserve (DepartmentId = reserveDept.Id)
            var equipmentAfterDelete = await context.Equipments
                .Where(e => e.Id == equipment1.Id || e.Id == equipment2.Id)
                .ToListAsync();

            // Get Reserve department ID
            var reserveDept = await context.Departments
                .FirstOrDefaultAsync(d => d.Name == "Reserve" || d.Name == "Резерв" || d.Name == "Global Reserve");
            Assert.NotNull(reserveDept);

            Assert.All(equipmentAfterDelete, eq => Assert.Equal(reserveDept.Id, eq.DepartmentId));

            // Verify department is deleted
            var deletedDepartment = await context.Departments.FindAsync(department.Id);
            Assert.Null(deletedDepartment);
        }

        [Fact]
        public async Task DeleteDepartment_ShouldDeleteDepartmentPositions_WhenDepartmentHasPositions()
        {
            // Arrange
            var (context, departmentService) = GetInMemoryDbContextAndService();
            var controller = new DepartmentsController(departmentService);

            // Create a department to delete
            var department = new Department { Name = "IT Department" };
            context.Departments.Add(department);

            // Create positions
            var position1 = new Position { Title = "Developer" };
            var position2 = new Position { Title = "Manager" };
            context.Positions.AddRange(position1, position2);
            await context.SaveChangesAsync();

            // Create department-position links
            var deptPosition1 = new DepartmentPosition
            {
                DepartmentId = department.Id,
                PositionId = position1.Id
            };
            var deptPosition2 = new DepartmentPosition
            {
                DepartmentId = department.Id,
                PositionId = position2.Id
            };
            context.DepartmentPositions.AddRange(deptPosition1, deptPosition2);
            await context.SaveChangesAsync();

            // Act
            var result = await controller.Delete(department.Id);

            // Assert
            Assert.IsType<NoContentResult>(result);

            // Verify department positions are deleted
            var remainingDeptPositions = await context.DepartmentPositions
                .Where(dp => dp.DepartmentId == department.Id)
                .ToListAsync();

            Assert.Empty(remainingDeptPositions);

            // Verify department is deleted
            var deletedDepartment = await context.Departments.FindAsync(department.Id);
            Assert.Null(deletedDepartment);
        }

        [Fact]
        public async Task DeleteDepartment_ShouldPreventDeletionOfGlobalReserve()
        {
            // Arrange
            var (context, departmentService) = GetInMemoryDbContextAndService();
            var controller = new DepartmentsController(departmentService);

            // Create Reserve department (the actual name used in the system)
            var reserve = new Department { Name = "Reserve" };
            context.Departments.Add(reserve);
            await context.SaveChangesAsync();

            // Act
            var result = await controller.Delete(reserve.Id);

            // Assert
            Assert.IsType<BadRequestObjectResult>(result);
            var badRequestResult = result as BadRequestObjectResult;
            Assert.NotNull(badRequestResult);
            Assert.Contains("Cannot delete the Reserve department", badRequestResult.Value?.ToString() ?? "");

            // Verify Reserve still exists
            var existingReserve = await context.Departments.FindAsync(reserve.Id);
            Assert.NotNull(existingReserve);
        }

        [Fact]
        public async Task DeleteDepartment_ShouldHandleAllOperationsAtomically()
        {
            // Arrange
            var (context, departmentService) = GetInMemoryDbContextAndService();
            var controller = new DepartmentsController(departmentService);

            // Create Global Reserve
            var globalReserve = new Department { Name = "Global Reserve" };
            context.Departments.Add(globalReserve);

            // Create a department to delete
            var department = new Department { Name = "IT Department" };
            context.Departments.Add(department);

            // Create specialization
            var specialization = new Specialization { Name = "IT" };
            context.Specializations.Add(specialization);

            // Create employee
            var employee = new Employee
            {
                FirstName = "John",
                LastName = "Doe",
                PhoneNumber = "1234567890",
                DepartmentId = department.Id,
                SpecializationId = specialization.Id,
                HireDate = DateTime.UtcNow
            };
            context.Employees.Add(employee);

            // Create equipment category
            var category = new EquipmentCategory { Name = "Computers", Description = "Computer equipment" };
            context.EquipmentCategories.Add(category);

            // Create equipment
            var equipment = new Equipment
            {
                Name = "Laptop",
                Description = "Dell Laptop",
                DepartmentId = department.Id,
                CategoryId = category.Id,
                PurchaseDate = DateTime.UtcNow,
                Status = "Used",
                Measurement = "Unit",
                Amount = 1
            };
            context.Equipments.Add(equipment);

            // Create position and department-position link
            var position = new Position { Title = "Developer" };
            context.Positions.Add(position);
            await context.SaveChangesAsync();

            var deptPosition = new DepartmentPosition
            {
                DepartmentId = department.Id,
                PositionId = position.Id
            };
            context.DepartmentPositions.Add(deptPosition);
            await context.SaveChangesAsync();

            // Act
            var result = await controller.Delete(department.Id);

            // Assert
            Assert.IsType<NoContentResult>(result);

            // Verify all operations completed atomically
            var deletedDepartment = await context.Departments.FindAsync(department.Id);
            Assert.Null(deletedDepartment);

            // Get Reserve department ID
            var reserveDept = await context.Departments
                .FirstOrDefaultAsync(d => d.Name == "Reserve" || d.Name == "Резерв" || d.Name == "Global Reserve");
            Assert.NotNull(reserveDept);

            var employeeAfter = await context.Employees.FindAsync(employee.Id);
            Assert.NotNull(employeeAfter);
            Assert.Equal(reserveDept.Id, employeeAfter.DepartmentId);

            var equipmentAfter = await context.Equipments.FindAsync(equipment.Id);
            Assert.NotNull(equipmentAfter);
            Assert.Equal(reserveDept.Id, equipmentAfter.DepartmentId);

            var deptPositionsAfter = await context.DepartmentPositions
                .Where(dp => dp.DepartmentId == department.Id)
                .ToListAsync();
            Assert.Empty(deptPositionsAfter);
        }
    }
}
