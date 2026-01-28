using EmployeeManager.API.Controllers;
using EmployeeManager.API.Data;
using EmployeeManager.API.DTO;
using EmployeeManager.API.Models;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EmployeeManager.API.Tests
{
    public class EquipmentControllerTests
    {
        private AppDbContext GetInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            return new AppDbContext(options);
        }

        [Fact]
        public async Task GetAll_ShouldReturnEquipment_WhenEquipmentExists()
        {
            // Arrange
            var context = GetInMemoryDbContext();
            var controller = new EquipmentController(context);

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
            var result = await controller.GetAll(null, null, 1, 10, null, null, null, "name", "asc");

            // Assert
            var okResult = Assert.IsType<Microsoft.AspNetCore.Mvc.OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
        }

        [Fact]
        public async Task GetById_ShouldReturnEquipment_WhenValidId()
        {
            // Arrange
            var context = GetInMemoryDbContext();
            var controller = new EquipmentController(context);

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
            var result = await controller.GetById(equipment.Id);

            // Assert
            var okResult = Assert.IsType<Microsoft.AspNetCore.Mvc.OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
        }

        [Fact]
        public async Task GetById_ShouldReturnNotFound_WhenInvalidId()
        {
            // Arrange
            var context = GetInMemoryDbContext();
            var controller = new EquipmentController(context);

            // Act
            var result = await controller.GetById(Guid.NewGuid());

            // Assert
            Assert.IsType<Microsoft.AspNetCore.Mvc.NotFoundObjectResult>(result);
        }

        [Fact]
        public async Task Create_ShouldCreateEquipment_WhenValidData()
        {
            // Arrange
            var context = GetInMemoryDbContext();
            var controller = new EquipmentController(context);

            var category = new EquipmentCategory { Name = "Computers", Description = "Computer equipment" };
            context.EquipmentCategories.Add(category);
            await context.SaveChangesAsync();

            var equipmentDto = new EquipmentDTO
            {
                Name = "Laptop",
                Description = "Dell Laptop",
                CategoryId = category.Id,
                PurchaseDate = DateTime.UtcNow,
                Status = "Used",
                Measurement = "Unit",
                Amount = 1
            };

            // Act
            var result = await controller.Create(equipmentDto);

            // Assert
            var createdResult = Assert.IsType<Microsoft.AspNetCore.Mvc.CreatedAtActionResult>(result);
            Assert.NotNull(createdResult.Value);
        }

        [Fact]
        public async Task Update_ShouldUpdateEquipment_WhenValidData()
        {
            // Arrange
            var context = GetInMemoryDbContext();
            var controller = new EquipmentController(context);

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

            var updateDto = new EquipmentDTO
            {
                Id = equipment.Id,
                Name = "Desktop",
                Description = "Dell Desktop",
                CategoryId = category.Id,
                PurchaseDate = DateTime.UtcNow,
                Status = "Not Used",
                Measurement = "Unit",
                Amount = 1
            };

            // Act
            var result = await controller.Update(equipment.Id, updateDto);

            // Assert
            var okResult = Assert.IsType<Microsoft.AspNetCore.Mvc.OkObjectResult>(result);
            var updatedEquipment = await context.Equipments.FindAsync(equipment.Id);
            Assert.Equal("Desktop", updatedEquipment?.Name);
        }

        [Fact]
        public async Task Delete_ShouldMoveToReserve_WhenNotInReserve()
        {
            // Arrange
            var context = GetInMemoryDbContext();
            var controller = new EquipmentController(context);

            var reserveDept = new Department { Name = "Резерв" };
            context.Departments.Add(reserveDept);

            var department = new Department { Name = "IT" };
            context.Departments.Add(department);

            var category = new EquipmentCategory { Name = "Computers", Description = "Computer equipment" };
            context.EquipmentCategories.Add(category);
            await context.SaveChangesAsync();

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
            await context.SaveChangesAsync();

            // Act
            var result = await controller.Delete(equipment.Id, null);

            // Assert
            var okResult = Assert.IsType<Microsoft.AspNetCore.Mvc.OkObjectResult>(result);
            var movedEquipment = await context.Equipments.FindAsync(equipment.Id);
            Assert.NotNull(movedEquipment);
            Assert.Equal(reserveDept.Id, movedEquipment.DepartmentId);
        }

        [Fact]
        public async Task Delete_ShouldPermanentlyDelete_WhenInReserve()
        {
            // Arrange
            var context = GetInMemoryDbContext();
            var controller = new EquipmentController(context);

            var reserveDept = new Department { Name = "Резерв" };
            context.Departments.Add(reserveDept);
            await context.SaveChangesAsync();

            var category = new EquipmentCategory { Name = "Computers", Description = "Computer equipment" };
            context.EquipmentCategories.Add(category);
            await context.SaveChangesAsync();

            var equipment = new Equipment
            {
                Name = "Laptop",
                Description = "Dell Laptop",
                DepartmentId = reserveDept.Id,
                CategoryId = category.Id,
                PurchaseDate = DateTime.UtcNow,
                Status = "Used",
                Measurement = "Unit",
                Amount = 1
            };
            context.Equipments.Add(equipment);
            await context.SaveChangesAsync();

            // Act
            var result = await controller.Delete(equipment.Id, null);

            // Assert
            Assert.IsType<Microsoft.AspNetCore.Mvc.NoContentResult>(result);
            var deletedEquipment = await context.Equipments.FindAsync(equipment.Id);
            Assert.Null(deletedEquipment);
        }
    }
}
