using EmployeeManager.API.Data;
using EmployeeManager.API.DTO;
using EmployeeManager.API.Models;
using EmployeeManager.API.Repositories;
using EmployeeManager.API.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EmployeeManager.API.Tests.Services
{
    public class DepartmentServiceTests
    {
        private (AppDbContext, IDepartmentService) GetService()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            var context = new AppDbContext(options);
            
            var departmentRepository = new DepartmentRepository(context);
            var positionRepository = new PositionRepository(context);
            var employeeRepository = new EmployeeRepository(context);
            var equipmentRepository = new EquipmentRepository(context);
            var departmentPositionRepository = new DepartmentPositionRepository(context);
            
            var service = new DepartmentService(
                departmentRepository,
                positionRepository,
                employeeRepository,
                equipmentRepository,
                departmentPositionRepository,
                context);
            
            return (context, service);
        }

        [Fact]
        public async Task CreateAsync_ShouldCreateDepartment()
        {
            // Arrange
            var (context, service) = GetService();
            var dto = new DepartmentDTO { Name = "Test Department" };

            // Act
            var result = await service.CreateAsync(dto);

            // Assert
            Assert.NotNull(result);
            Assert.Equal("Test Department", result.Name);
            Assert.NotEqual(Guid.Empty, result.Id);
        }

        [Fact]
        public async Task GetByIdAsync_ShouldReturnDepartment_WhenExists()
        {
            // Arrange
            var (context, service) = GetService();
            var dto = new DepartmentDTO { Name = "Test Department" };
            var created = await service.CreateAsync(dto);

            // Act
            var result = await service.GetByIdAsync(created.Id);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(created.Id, result.Id);
            Assert.Equal("Test Department", result.Name);
        }

        [Fact]
        public async Task GetByIdAsync_ShouldReturnNull_WhenNotExists()
        {
            // Arrange
            var (context, service) = GetService();

            // Act
            var result = await service.GetByIdAsync(Guid.NewGuid());

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public async Task UpdateAsync_ShouldUpdateDepartment()
        {
            // Arrange
            var (context, service) = GetService();
            var dto = new DepartmentDTO { Name = "Test Department" };
            var created = await service.CreateAsync(dto);
            var updateDto = new DepartmentDTO { Name = "Updated Department" };

            // Act
            var result = await service.UpdateAsync(created.Id, updateDto);

            // Assert
            Assert.NotNull(result);
            Assert.Equal("Updated Department", result.Name);
        }

        [Fact]
        public async Task DeleteAsync_ShouldReturnFalse_WhenReserveDepartment()
        {
            // Arrange
            var (context, service) = GetService();
            var reserve = await service.CreateAsync(new DepartmentDTO { Name = "Reserve" });

            // Act
            var result = await service.DeleteAsync(reserve.Id);

            // Assert
            Assert.False(result);
        }
    }
}
