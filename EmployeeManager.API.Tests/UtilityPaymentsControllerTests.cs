// NOTE: UtilityPaymentsController now uses FormData for Create method,
// so unit tests that directly call Create with DTO are not applicable.
// Integration tests in UtilityPaymentsApiIntegrationTests.cs should be used instead.
// This file is kept for reference but tests are disabled.

using EmployeeManager.API.Controllers;
using EmployeeManager.API.Data;
using EmployeeManager.API.DTO;
using EmployeeManager.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EmployeeManager.API.Tests
{
    public class UtilityPaymentsControllerTests : IDisposable
    {
        private readonly AppDbContext _context;

        public UtilityPaymentsControllerTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new AppDbContext(options);
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
            _context.SaveChanges();
        }

        [Fact]
        public async Task GetLatest_ShouldReturnEmptyList_WhenNoPreviousPayments()
        {
            // Arrange
            var department = await _context.Departments.FirstAsync();
            var environmentMock = new Moq.Mock<Microsoft.AspNetCore.Hosting.IWebHostEnvironment>();
            var loggerMock = new Moq.Mock<Microsoft.Extensions.Logging.ILogger<UtilityPaymentsController>>();
            var repositoryMock = new Moq.Mock<EmployeeManager.API.Repositories.IUtilityPaymentRepository>();
            
            var controller = new UtilityPaymentsController(
                repositoryMock.Object,
                _context,
                environmentMock.Object,
                loggerMock.Object);

            // Act
            var result = await controller.GetLatest(department.Id, PaymentType.Electricity, null);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var payments = Assert.IsType<List<PreviousMonthPaymentDTO>>(okResult.Value);
            Assert.Empty(payments);
        }

        [Fact]
        public async Task GetStatistics_ShouldReturnEmptyLists_WhenNoPayments()
        {
            // Arrange
            var environmentMock = new Moq.Mock<Microsoft.AspNetCore.Hosting.IWebHostEnvironment>();
            var loggerMock = new Moq.Mock<Microsoft.Extensions.Logging.ILogger<UtilityPaymentsController>>();
            var repositoryMock = new Moq.Mock<EmployeeManager.API.Repositories.IUtilityPaymentRepository>();
            
            var controller = new UtilityPaymentsController(
                repositoryMock.Object,
                _context,
                environmentMock.Object,
                loggerMock.Object);

            // Act
            var result = await controller.GetStatistics(PaymentType.Electricity, null, null, null);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var stats = Assert.IsType<UtilityPaymentStatisticsDTO>(okResult.Value);
            Assert.Empty(stats.MonthlyExpenses);
            Assert.Empty(stats.MonthlyConsumption);
        }

        public void Dispose()
        {
            _context?.Dispose();
        }
    }
}
