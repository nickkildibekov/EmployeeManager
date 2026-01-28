using EmployeeManager.API.Controllers;
using EmployeeManager.API.Data;
using EmployeeManager.API.Models;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EmployeeManager.API.Tests
{
    public class EquipmentCategoriesControllerTests
    {
        private AppDbContext GetInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            return new AppDbContext(options);
        }

        [Fact]
        public async Task GetAll_ShouldReturnCategories_WhenCategoriesExist()
        {
            // Arrange
            var context = GetInMemoryDbContext();
            var controller = new EquipmentCategoriesController(context);

            var category = new EquipmentCategory { Name = "Computers", Description = "Computer equipment" };
            context.EquipmentCategories.Add(category);
            await context.SaveChangesAsync();

            // Act
            var result = await controller.GetAll();

            // Assert
            var okResult = Assert.IsType<Microsoft.AspNetCore.Mvc.OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
        }

        [Fact]
        public async Task Create_ShouldCreateCategory_WhenValidData()
        {
            // Arrange
            var context = GetInMemoryDbContext();
            var controller = new EquipmentCategoriesController(context);

            var category = new EquipmentCategory { Name = "Computers", Description = "Computer equipment" };

            // Act
            var result = await controller.Create(category);

            // Assert
            var okResult = Assert.IsType<Microsoft.AspNetCore.Mvc.OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
        }

        [Fact]
        public async Task Create_ShouldReturnBadRequest_WhenNameIsEmpty()
        {
            // Arrange
            var context = GetInMemoryDbContext();
            var controller = new EquipmentCategoriesController(context);

            var category = new EquipmentCategory { Name = "", Description = "Computer equipment" };

            // Act
            var result = await controller.Create(category);

            // Assert
            Assert.IsType<Microsoft.AspNetCore.Mvc.BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task Update_ShouldUpdateCategory_WhenValidData()
        {
            // Arrange
            var context = GetInMemoryDbContext();
            var controller = new EquipmentCategoriesController(context);

            var category = new EquipmentCategory { Name = "Computers", Description = "Computer equipment" };
            context.EquipmentCategories.Add(category);
            await context.SaveChangesAsync();

            var updateCategory = new EquipmentCategory { Name = "Laptops", Description = "Laptop equipment" };

            // Act
            var result = await controller.Update(category.Id, updateCategory);

            // Assert
            var okResult = Assert.IsType<Microsoft.AspNetCore.Mvc.OkObjectResult>(result);
            var updatedCategory = await context.EquipmentCategories.FindAsync(category.Id);
            Assert.Equal("Laptops", updatedCategory?.Name);
        }

        [Fact]
        public async Task Update_ShouldReturnNotFound_WhenInvalidId()
        {
            // Arrange
            var context = GetInMemoryDbContext();
            var controller = new EquipmentCategoriesController(context);

            var updateCategory = new EquipmentCategory { Name = "Laptops", Description = "Laptop equipment" };

            // Act
            var result = await controller.Update(Guid.NewGuid(), updateCategory);

            // Assert
            Assert.IsType<Microsoft.AspNetCore.Mvc.NotFoundObjectResult>(result);
        }

        [Fact]
        public async Task Delete_ShouldDeleteCategory_WhenNotUsed()
        {
            // Arrange
            var context = GetInMemoryDbContext();
            var controller = new EquipmentCategoriesController(context);

            var category = new EquipmentCategory { Name = "Computers", Description = "Computer equipment" };
            context.EquipmentCategories.Add(category);
            await context.SaveChangesAsync();

            // Act
            var result = await controller.Delete(category.Id);

            // Assert
            Assert.IsType<Microsoft.AspNetCore.Mvc.NoContentResult>(result);
            var deletedCategory = await context.EquipmentCategories.FindAsync(category.Id);
            Assert.Null(deletedCategory);
        }

        [Fact]
        public async Task Delete_ShouldReturnConflict_WhenCategoryIsUsed()
        {
            // Arrange
            var context = GetInMemoryDbContext();
            var controller = new EquipmentCategoriesController(context);

            var category = new EquipmentCategory { Name = "Computers", Description = "Computer equipment" };
            context.EquipmentCategories.Add(category);
            await context.SaveChangesAsync();

            var equipment = new Equipment
            {
                Name = "Laptop",
                Description = "Dell Laptop",
                CategoryId = category.Id,
                PurchaseDate = DateTime.UtcNow,
                Status = "Used",
                Measurement = "Unit",
                Amount = 1
            };
            context.Equipments.Add(equipment);
            await context.SaveChangesAsync();

            // Act
            var result = await controller.Delete(category.Id);

            // Assert
            Assert.IsType<Microsoft.AspNetCore.Mvc.ConflictObjectResult>(result);
        }
    }
}
