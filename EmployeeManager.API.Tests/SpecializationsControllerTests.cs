using EmployeeManager.API.Controllers;
using EmployeeManager.API.Data;
using EmployeeManager.API.DTO;
using EmployeeManager.API.Models;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EmployeeManager.API.Tests
{
    public class SpecializationsControllerTests
    {
        private AppDbContext GetInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            return new AppDbContext(options);
        }

        [Fact]
        public async Task GetAll_ShouldReturnSpecializations_WhenSpecializationsExist()
        {
            // Arrange
            var context = GetInMemoryDbContext();
            var controller = new SpecializationsController(context);

            var specialization = new Specialization { Name = "IT" };
            context.Specializations.Add(specialization);
            await context.SaveChangesAsync();

            // Act
            var result = await controller.GetAll();

            // Assert
            var okResult = Assert.IsType<Microsoft.AspNetCore.Mvc.OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
        }

        [Fact]
        public async Task GetById_ShouldReturnSpecialization_WhenValidId()
        {
            // Arrange
            var context = GetInMemoryDbContext();
            var controller = new SpecializationsController(context);

            var specialization = new Specialization { Name = "IT" };
            context.Specializations.Add(specialization);
            await context.SaveChangesAsync();

            // Act
            var result = await controller.GetById(specialization.Id);

            // Assert
            var okResult = Assert.IsType<Microsoft.AspNetCore.Mvc.OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
        }

        [Fact]
        public async Task GetById_ShouldReturnNotFound_WhenInvalidId()
        {
            // Arrange
            var context = GetInMemoryDbContext();
            var controller = new SpecializationsController(context);

            // Act
            var result = await controller.GetById(Guid.NewGuid());

            // Assert
            Assert.IsType<Microsoft.AspNetCore.Mvc.NotFoundObjectResult>(result);
        }

        [Fact]
        public async Task Create_ShouldCreateSpecialization_WhenValidData()
        {
            // Arrange
            var context = GetInMemoryDbContext();
            var controller = new SpecializationsController(context);

            var specializationDto = new SpecializationDTO { Name = "IT" };

            // Act
            var result = await controller.Create(specializationDto);

            // Assert
            var createdResult = Assert.IsType<Microsoft.AspNetCore.Mvc.CreatedAtActionResult>(result);
            Assert.NotNull(createdResult.Value);
        }

        [Fact]
        public async Task Create_ShouldReturnBadRequest_WhenNameIsEmpty()
        {
            // Arrange
            var context = GetInMemoryDbContext();
            var controller = new SpecializationsController(context);

            var specializationDto = new SpecializationDTO { Name = "" };

            // Act
            var result = await controller.Create(specializationDto);

            // Assert
            Assert.IsType<Microsoft.AspNetCore.Mvc.BadRequestObjectResult>(result);
        }
    }
}
