using EmployeeManager.API.Controllers;
using EmployeeManager.API.Data;
using EmployeeManager.API.DTO;
using EmployeeManager.API.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace EmployeeManager.API.Tests
{
    public class FuelPaymentsControllerTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly Mock<IWebHostEnvironment> _environmentMock;
        private readonly Mock<ILogger<FuelPaymentsController>> _loggerMock;
        private readonly FuelPaymentsController _controller;

        public FuelPaymentsControllerTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new AppDbContext(options);
            _environmentMock = new Mock<IWebHostEnvironment>();
            _loggerMock = new Mock<ILogger<FuelPaymentsController>>();

            _controller = new FuelPaymentsController(
                _context,
                _environmentMock.Object,
                _loggerMock.Object);

            SeedTestData();
        }

        private void SeedTestData()
        {
            var department = new Department
            {
                Id = Guid.NewGuid(),
                Name = "Test Department"
            };
            _context.Departments.Add(department);

            var category = new EquipmentCategory
            {
                Id = Guid.NewGuid(),
                Name = "Test Category",
                Description = "Test Description"
            };
            _context.EquipmentCategories.Add(category);

            var equipment = new Equipment
            {
                Id = Guid.NewGuid(),
                Name = "Test Vehicle",
                SerialNumber = "VH001",
                PurchaseDate = DateTime.UtcNow,
                Status = "Used",
                Measurement = "Unit",
                Amount = 1,
                Description = "Test Description",
                CategoryId = category.Id,
                DepartmentId = department.Id
            };
            _context.Equipments.Add(equipment);

            _context.SaveChanges();
        }

        [Fact]
        public async Task GetAll_ShouldReturnOk_WhenPaymentsExist()
        {
            // Arrange
            var department = await _context.Departments.FirstAsync();
            var equipment = await _context.Equipments.FirstAsync();
            
            var payment = new FuelPayment
            {
                Id = Guid.NewGuid(),
                DepartmentId = department.Id,
                EquipmentId = equipment.Id,
                EntryDate = DateTime.UtcNow,
                PreviousMileage = 1000.0m,
                CurrentMileage = 1500.0m,
                FuelType = FuelType.Gasoline,
                TotalAmount = 25000.0m,
                CreatedAt = DateTime.UtcNow
            };
            _context.FuelExpenses.Add(payment);
            
            // Створюємо транзакцію для тесту
            var transaction = new FuelTransaction
            {
                Id = Guid.NewGuid(),
                DepartmentId = department.Id,
                Type = FuelType.Gasoline,
                Amount = -50.0m, // Витрата
                RelatedId = payment.Id,
                CreatedAt = DateTime.UtcNow
            };
            _context.FuelTransactions.Add(transaction);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.GetAll(null, null, 1, 10);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
        }

        [Fact]
        public async Task GetLatest_ShouldReturnOk_WhenNoPreviousPayments()
        {
            // Arrange
            var equipment = await _context.Equipments.FirstAsync();

            // Act
            var result = await _controller.GetLatest(equipment.Id, FuelType.Gasoline);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
        }

        [Fact]
        public async Task GetLatest_ShouldReturnLatestPayment_WhenPaymentsExist()
        {
            // Arrange
            var department = await _context.Departments.FirstAsync();
            var equipment = await _context.Equipments.FirstAsync();
            
            var payment = new FuelPayment
            {
                Id = Guid.NewGuid(),
                DepartmentId = department.Id,
                EquipmentId = equipment.Id,
                EntryDate = DateTime.UtcNow,
                PreviousMileage = 1000.0m,
                CurrentMileage = 1500.0m,
                FuelType = FuelType.Gasoline,
                TotalAmount = 25000.0m,
                CreatedAt = DateTime.UtcNow
            };
            _context.FuelExpenses.Add(payment);
            
            // Створюємо транзакцію для тесту
            var transaction = new FuelTransaction
            {
                Id = Guid.NewGuid(),
                DepartmentId = department.Id,
                Type = FuelType.Gasoline,
                Amount = -50.0m, // Витрата
                RelatedId = payment.Id,
                CreatedAt = DateTime.UtcNow
            };
            _context.FuelTransactions.Add(transaction);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.GetLatest(equipment.Id, FuelType.Gasoline);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
        }

        [Fact]
        public async Task GetStatistics_ShouldReturnOk_WhenNoPayments()
        {
            // Act
            var result = await _controller.GetStatistics(null, null, null);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var stats = Assert.IsType<FuelPaymentStatisticsDTO>(okResult.Value);
            Assert.Empty(stats.MonthlyExpenses);
            Assert.Empty(stats.MonthlyConsumption);
        }

        [Fact]
        public async Task GetStatistics_ShouldReturnData_WhenPaymentsExist()
        {
            // Arrange
            var department = await _context.Departments.FirstAsync();
            var equipment = await _context.Equipments.FirstAsync();
            
            var payment = new FuelPayment
            {
                Id = Guid.NewGuid(),
                DepartmentId = department.Id,
                EquipmentId = equipment.Id,
                EntryDate = new DateTime(2026, 1, 15),
                PreviousMileage = 1000.0m,
                CurrentMileage = 1500.0m,
                FuelType = FuelType.Gasoline,
                TotalAmount = 25000.0m,
                CreatedAt = DateTime.UtcNow
            };
            _context.FuelExpenses.Add(payment);
            
            // Створюємо транзакцію для тесту
            var transaction = new FuelTransaction
            {
                Id = Guid.NewGuid(),
                DepartmentId = department.Id,
                Type = FuelType.Gasoline,
                Amount = -50.0m, // Витрата
                RelatedId = payment.Id,
                CreatedAt = new DateTime(2026, 1, 15)
            };
            _context.FuelTransactions.Add(transaction);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.GetStatistics(
                null,
                null,
                new DateTime(2026, 1, 1),
                new DateTime(2026, 2, 1));

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var stats = Assert.IsType<FuelPaymentStatisticsDTO>(okResult.Value);
            // Статистика працює з транзакціями, тому якщо є тільки бензин, то дизель буде порожнім
            Assert.NotEmpty(stats.MonthlyExpenses); // Бензин
            // MonthlyConsumption (Дизель) може бути порожнім, якщо немає дизельних транзакцій
        }

        public void Dispose()
        {
            _context?.Dispose();
        }
    }
}
