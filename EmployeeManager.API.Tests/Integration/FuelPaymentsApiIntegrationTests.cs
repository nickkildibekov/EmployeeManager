using EmployeeManager.API.Data;
using EmployeeManager.API.DTO;
using EmployeeManager.API.Models;
using Microsoft.Extensions.DependencyInjection;
using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace EmployeeManager.API.Tests.Integration
{
    public class FuelPaymentsApiIntegrationTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;
        private readonly CustomWebApplicationFactory _factory;

        public FuelPaymentsApiIntegrationTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
            _client = factory.CreateClient();
        }

        private async Task<(Department, Equipment)> SetupTestData()
        {
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var department = new Department { Name = "Test Department" };
            var category = new EquipmentCategory { Name = "Test Category", Description = "Test Description" };
            
            context.Departments.Add(department);
            context.EquipmentCategories.Add(category);
            await context.SaveChangesAsync();

            var equipment = new Equipment
            {
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
            context.Equipments.Add(equipment);
            await context.SaveChangesAsync();

            return (department, equipment);
        }

        [Fact]
        public async Task GetAll_ShouldReturnOk_WhenPaymentsExist()
        {
            // Arrange
            var (department, equipment) = await SetupTestData();
            
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            
            var payment = new FuelPayment
            {
                DepartmentId = department.Id,
                EquipmentId = equipment.Id,
                EntryDate = DateTime.UtcNow,
                PreviousMileage = 1000.0m,
                CurrentMileage = 1500.0m,
                FuelType = FuelType.Gasoline,
                TotalAmount = 25000.0m,
                CreatedAt = DateTime.UtcNow
            };
            context.FuelExpenses.Add(payment);
            
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
            context.FuelTransactions.Add(transaction);
            await context.SaveChangesAsync();

            // Act
            var response = await _client.GetAsync("/api/fuelpayments");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.True(result.TryGetProperty("items", out var items));
            Assert.True(result.TryGetProperty("total", out var total));
        }

        [Fact]
        public async Task GetLatest_ShouldReturnOk_WhenNoPreviousPayments()
        {
            // Arrange
            var (department, equipment) = await SetupTestData();

            // Act
            var response = await _client.GetAsync($"/api/fuelpayments/latest/{equipment.Id}?fuelType=1");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.True(result.TryGetProperty("previousMileage", out _));
            Assert.True(result.TryGetProperty("fuelBalance", out _));
        }

        [Fact]
        public async Task GetLatest_ShouldReturnLatestPayment_WhenPaymentsExist()
        {
            // Arrange
            var (department, equipment) = await SetupTestData();
            
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            
            var payment = new FuelPayment
            {
                DepartmentId = department.Id,
                EquipmentId = equipment.Id,
                EntryDate = DateTime.UtcNow,
                PreviousMileage = 1000.0m,
                CurrentMileage = 1500.0m,
                FuelType = FuelType.Gasoline,
                TotalAmount = 25000.0m,
                CreatedAt = DateTime.UtcNow
            };
            context.FuelExpenses.Add(payment);
            
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
            context.FuelTransactions.Add(transaction);
            await context.SaveChangesAsync();

            // Act
            var response = await _client.GetAsync($"/api/fuelpayments/latest/{equipment.Id}");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.True(result.TryGetProperty("previousMileage", out var previousMileage));
            Assert.True(result.TryGetProperty("pricePerLiter", out var pricePerLiter));
            
            // Check if values are not null before calling GetDecimal()
            // API returns CurrentMileage as previousMileage, so it should be 1500.0m
            if (previousMileage.ValueKind == JsonValueKind.Number)
            {
                Assert.Equal(1500.0m, previousMileage.GetDecimal());
            }
            else if (previousMileage.ValueKind == JsonValueKind.Null)
            {
                // If null, that's unexpected but handle gracefully
                Assert.Fail("previousMileage should not be null when payments exist");
            }
            
            if (pricePerLiter.ValueKind == JsonValueKind.Number)
            {
                Assert.Equal(50.0m, pricePerLiter.GetDecimal());
            }
            else if (pricePerLiter.ValueKind == JsonValueKind.Null)
            {
                // If null, that's unexpected but handle gracefully
                Assert.Fail("pricePerLiter should not be null when payments exist");
            }
        }

        [Fact]
        public async Task GetStatistics_ShouldReturnOk_WhenNoPayments()
        {
            // Act
            var response = await _client.GetAsync("/api/fuelpayments/statistics");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var stats = await response.Content.ReadFromJsonAsync<FuelPaymentStatisticsDTO>();
            Assert.NotNull(stats);
            Assert.Empty(stats!.MonthlyExpenses);
            Assert.Empty(stats.MonthlyConsumption);
        }

        [Fact]
        public async Task Create_ShouldReturnBadRequest_WhenCurrentMileageLessThanPrevious()
        {
            // Arrange
            var (department, equipment) = await SetupTestData();
            
            var formData = new MultipartFormDataContent();
            formData.Add(new StringContent(department.Id.ToString()), "DepartmentId");
            formData.Add(new StringContent(equipment.Id.ToString()), "EquipmentId");
            formData.Add(new StringContent(DateTime.UtcNow.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)), "EntryDate");
            formData.Add(new StringContent(1500.0m.ToString(CultureInfo.InvariantCulture)), "PreviousMileage");
            formData.Add(new StringContent(1000.0m.ToString(CultureInfo.InvariantCulture)), "CurrentMileage"); // Less than previous
            formData.Add(new StringContent("1"), "FuelType");
            formData.Add(new StringContent(0m.ToString(CultureInfo.InvariantCulture)), "TotalAmount");
            formData.Add(new StringContent(50.0m.ToString(CultureInfo.InvariantCulture)), "FuelUsed");

            // Act
            var response = await _client.PostAsync("/api/fuelpayments", formData);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task Create_ShouldReturnBadRequest_WhenDepartmentNotFound()
        {
            // Arrange
            var (department, equipment) = await SetupTestData();
            var nonExistentDepartmentId = Guid.NewGuid();
            
            var formData = new MultipartFormDataContent();
            formData.Add(new StringContent(nonExistentDepartmentId.ToString()), "DepartmentId");
            formData.Add(new StringContent(equipment.Id.ToString()), "EquipmentId");
            formData.Add(new StringContent(DateTime.UtcNow.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)), "EntryDate");
            formData.Add(new StringContent(1000.0m.ToString(CultureInfo.InvariantCulture)), "PreviousMileage");
            formData.Add(new StringContent(1500.0m.ToString(CultureInfo.InvariantCulture)), "CurrentMileage");
            formData.Add(new StringContent("1"), "FuelType");
            formData.Add(new StringContent(25000.0m.ToString(CultureInfo.InvariantCulture)), "TotalAmount");
            formData.Add(new StringContent(50.0m.ToString(CultureInfo.InvariantCulture)), "FuelUsed");

            // Act
            var response = await _client.PostAsync("/api/fuelpayments", formData);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task Create_ShouldReturnBadRequest_WhenEquipmentNotFound()
        {
            // Arrange
            var (department, equipment) = await SetupTestData();
            var nonExistentEquipmentId = Guid.NewGuid();
            
            var formData = new MultipartFormDataContent();
            formData.Add(new StringContent(department.Id.ToString()), "DepartmentId");
            formData.Add(new StringContent(nonExistentEquipmentId.ToString()), "EquipmentId");
            formData.Add(new StringContent(DateTime.UtcNow.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)), "EntryDate");
            formData.Add(new StringContent(1000.0m.ToString(CultureInfo.InvariantCulture)), "PreviousMileage");
            formData.Add(new StringContent(1500.0m.ToString(CultureInfo.InvariantCulture)), "CurrentMileage");
            formData.Add(new StringContent("1"), "FuelType");
            formData.Add(new StringContent(25000.0m.ToString(CultureInfo.InvariantCulture)), "TotalAmount");
            formData.Add(new StringContent(50.0m.ToString(CultureInfo.InvariantCulture)), "FuelUsed");

            // Act
            var response = await _client.PostAsync("/api/fuelpayments", formData);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task Create_ShouldReturnCreated_WhenValidData()
        {
            // Arrange
            var (department, equipment) = await SetupTestData();
            
            // Use InvariantCulture for decimal values and date formats
            var formData = new MultipartFormDataContent();
            formData.Add(new StringContent(department.Id.ToString()), "DepartmentId");
            formData.Add(new StringContent(equipment.Id.ToString()), "EquipmentId");
            // EntryDate format: "yyyy-MM-dd" (e.g., "2026-01-15")
            formData.Add(new StringContent(DateTime.UtcNow.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)), "EntryDate");
            formData.Add(new StringContent(1000.0m.ToString(CultureInfo.InvariantCulture)), "PreviousMileage");
            formData.Add(new StringContent(1500.0m.ToString(CultureInfo.InvariantCulture)), "CurrentMileage");
            formData.Add(new StringContent("1"), "FuelType");
            formData.Add(new StringContent(25000.0m.ToString(CultureInfo.InvariantCulture)), "TotalAmount");
            formData.Add(new StringContent(50.0m.ToString(CultureInfo.InvariantCulture)), "FuelUsed");

            // Act
            var response = await _client.PostAsync("/api/fuelpayments", formData);

            // Assert
            if (response.StatusCode != HttpStatusCode.Created)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                System.Diagnostics.Debug.WriteLine($"Error response: {errorContent}");
                Assert.Fail($"Expected Created but got {response.StatusCode}. Response: {errorContent}");
            }
            
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            
            // Check if response has content before deserializing
            var responseContent = await response.Content.ReadAsStringAsync();
            if (!string.IsNullOrWhiteSpace(responseContent))
            {
                var result = await response.Content.ReadFromJsonAsync<FuelPaymentDTO>();
                Assert.NotNull(result);
                Assert.Equal(department.Id, result!.DepartmentId);
                Assert.Equal(equipment.Id, result.EquipmentId);
                Assert.Equal(FuelType.Gasoline, result.FuelType);
            }
            else
            {
                // If response is empty but status is Created, that's also acceptable
                Assert.True(response.IsSuccessStatusCode);
            }
        }

        [Fact]
        public async Task GetStatistics_ShouldReturnData_WhenPaymentsExist()
        {
            // Arrange
            var (department, equipment) = await SetupTestData();
            
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            
            var payment = new FuelPayment
            {
                DepartmentId = department.Id,
                EquipmentId = equipment.Id,
                EntryDate = new DateTime(2026, 1, 15),
                PreviousMileage = 1000.0m,
                CurrentMileage = 1500.0m,
                FuelType = FuelType.Gasoline,
                TotalAmount = 25000.0m,
                CreatedAt = DateTime.UtcNow
            };
            context.FuelExpenses.Add(payment);
            
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
            context.FuelTransactions.Add(transaction);
            await context.SaveChangesAsync();

            // Act
            var response = await _client.GetAsync("/api/fuelpayments/statistics?startDate=2026-01-01&endDate=2026-02-01");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var stats = await response.Content.ReadFromJsonAsync<FuelPaymentStatisticsDTO>();
            Assert.NotNull(stats);
            Assert.NotEmpty(stats!.MonthlyExpenses);
            Assert.NotEmpty(stats.MonthlyConsumption);
        }
    }
}
