using EmployeeManager.API.Data;
using EmployeeManager.API.DTO;
using EmployeeManager.API.Models;
using EmployeeManager.API.Repositories;
using EmployeeManager.API.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EmployeeManager.API.Tests.Services
{
    public class PositionServiceTests
    {
        private (AppDbContext, IPositionService) GetService()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            var context = new AppDbContext(options);
            
            var positionRepository = new PositionRepository(context);
            var departmentPositionRepository = new DepartmentPositionRepository(context);
            var departmentRepository = new DepartmentRepository(context);
            
            var service = new PositionService(
                positionRepository,
                departmentPositionRepository,
                departmentRepository);
            
            return (context, service);
        }

        [Fact]
        public async Task CreateAsync_ShouldCreatePosition()
        {
            // Arrange
            var (context, service) = GetService();
            var dto = new PositionDTO { Title = "Test Position" };

            // Act
            var result = await service.CreateAsync(dto);

            // Assert
            Assert.NotNull(result);
            Assert.Equal("Test Position", result.Title);
            Assert.NotEqual(Guid.Empty, result.Id);
        }

        [Fact]
        public async Task GetByIdAsync_ShouldReturnPosition_WhenExists()
        {
            // Arrange
            var (context, service) = GetService();
            var dto = new PositionDTO { Title = "Test Position" };
            var created = await service.CreateAsync(dto);

            // Act
            var result = await service.GetByIdAsync(created.Id);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(created.Id, result.Id);
            Assert.Equal("Test Position", result.Title);
        }

        [Fact]
        public async Task GetAllAsync_ShouldReturnPositions()
        {
            // Arrange
            var (context, service) = GetService();
            await service.CreateAsync(new PositionDTO { Title = "Position 1" });
            await service.CreateAsync(new PositionDTO { Title = "Position 2" });

            // Act
            var result = await service.GetAllAsync();

            // Assert
            Assert.NotNull(result);
            Assert.True(result.Count() >= 2);
        }
    }
}
