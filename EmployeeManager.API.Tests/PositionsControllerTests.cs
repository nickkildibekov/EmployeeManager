using EmployeeManager.API.Controllers;
using EmployeeManager.API.Data;
using EmployeeManager.API.DTO;
using EmployeeManager.API.Models;
using EmployeeManager.API.Repositories;
using EmployeeManager.API.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EmployeeManager.API.Tests
{
    public class PositionsControllerTests
    {
        private (AppDbContext, PositionsController) GetInMemoryDbContextAndController()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            var context = new AppDbContext(options);
            
            var positionRepository = new PositionRepository(context);
            var departmentPositionRepository = new DepartmentPositionRepository(context);
            var departmentRepository = new DepartmentRepository(context);
            var employeeRepository = new EmployeeRepository(context);
            
            var positionService = new PositionService(
                positionRepository,
                departmentPositionRepository,
                departmentRepository);
            
            var controller = new PositionsController(context, positionService, employeeRepository);
            
            return (context, controller);
        }

        [Fact]
        public async Task GetAll_ShouldReturnPositions_WhenPositionsExist()
        {
            // Arrange
            var (context, controller) = GetInMemoryDbContextAndController();

            var position = new Position { Title = "Developer" };
            context.Positions.Add(position);
            await context.SaveChangesAsync();

            // Act
            var result = await controller.GetAll(null, 1, 10, null);

            // Assert
            var okResult = Assert.IsType<Microsoft.AspNetCore.Mvc.OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
        }

        [Fact]
        public async Task GetById_ShouldReturnPosition_WhenValidId()
        {
            // Arrange
            var (context, controller) = GetInMemoryDbContextAndController();

            var position = new Position { Title = "Developer" };
            context.Positions.Add(position);
            await context.SaveChangesAsync();

            // Act
            var result = await controller.GetById(position.Id);

            // Assert
            var okResult = Assert.IsType<Microsoft.AspNetCore.Mvc.OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
        }

        [Fact]
        public async Task GetById_ShouldReturnNotFound_WhenInvalidId()
        {
            // Arrange
            var (context, controller) = GetInMemoryDbContextAndController();

            // Act
            var result = await controller.GetById(Guid.NewGuid());

            // Assert
            Assert.IsType<Microsoft.AspNetCore.Mvc.NotFoundObjectResult>(result);
        }

        [Fact]
        public async Task Create_ShouldCreatePosition_WhenValidData()
        {
            // Arrange
            var (context, controller) = GetInMemoryDbContextAndController();

            var positionDto = new PositionUpdateDTO { Title = "Developer", DepartmentIds = new List<Guid>() };

            // Act
            var result = await controller.Create(positionDto);

            // Assert
            var createdResult = Assert.IsType<Microsoft.AspNetCore.Mvc.CreatedAtActionResult>(result);
            Assert.NotNull(createdResult.Value);
        }

        [Fact]
        public async Task Update_ShouldUpdatePosition_WhenValidData()
        {
            // Arrange
            var (context, controller) = GetInMemoryDbContextAndController();

            var position = new Position { Title = "Developer" };
            context.Positions.Add(position);
            await context.SaveChangesAsync();

            var updateDto = new PositionUpdateDTO { Title = "Senior Developer", DepartmentIds = new List<Guid>() };

            // Act
            var result = await controller.Update(position.Id, updateDto);

            // Assert
            var okResult = Assert.IsType<Microsoft.AspNetCore.Mvc.OkObjectResult>(result);
            var updatedPosition = await context.Positions.FindAsync(position.Id);
            Assert.Equal("Senior Developer", updatedPosition?.Title);
        }

        [Fact]
        public async Task Delete_ShouldDeletePosition_WhenValidId()
        {
            // Arrange
            var (context, controller) = GetInMemoryDbContextAndController();

            // Create Unemployed position first (required for deletion logic)
            var unemployedPosition = new Position { Title = "Unemployed" };
            context.Positions.Add(unemployedPosition);
            await context.SaveChangesAsync();

            var position = new Position { Title = "Developer" };
            context.Positions.Add(position);
            await context.SaveChangesAsync();

            // Act
            var result = await controller.Delete(position.Id);

            // Assert
            Assert.IsType<Microsoft.AspNetCore.Mvc.NoContentResult>(result);
            var deletedPosition = await context.Positions.FindAsync(position.Id);
            Assert.Null(deletedPosition);
        }
    }
}
