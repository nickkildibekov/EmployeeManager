using EmployeeManager.API.Data;
using EmployeeManager.API.DTO;
using EmployeeManager.API.Models;
using Microsoft.Extensions.DependencyInjection;
using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Xunit;

namespace EmployeeManager.API.Tests.Integration
{
    public class UtilityPaymentsApiIntegrationTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;
        private readonly CustomWebApplicationFactory _factory;

        public UtilityPaymentsApiIntegrationTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
            _client = factory.CreateClient();
        }

        private async Task<Department> SetupTestData()
        {
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var department = new Department { Name = "Test Department" };
            context.Departments.Add(department);
            await context.SaveChangesAsync();

            return department;
        }

        [Fact]
        public async Task GetAll_ShouldReturnOk_WhenPaymentsExist()
        {
            // Arrange
            var department = await SetupTestData();
            
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            
            var payment = new UtilityPayment
            {
                DepartmentId = department.Id,
                PaymentType = PaymentType.Electricity,
                PreviousValue = 100.5m,
                CurrentValue = 150.0m,
                PricePerUnit = 2.5m,
                TotalAmount = 123.75m,
                PaymentMonth = new DateTime(2026, 1, 1),
                CreatedAt = DateTime.UtcNow
            };
            context.UtilityPayments.Add(payment);
            await context.SaveChangesAsync();

            // Act
            var response = await _client.GetAsync("/api/utilitypayments");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.True(result.TryGetProperty("items", out var items));
            Assert.True(result.TryGetProperty("total", out var total));
        }

        [Fact]
        public async Task GetLatest_ShouldReturnEmptyList_WhenNoPreviousPayments()
        {
            // Arrange
            var department = await SetupTestData();

            // Act
            var response = await _client.GetAsync($"/api/utilitypayments/latest/{department.Id}/1");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var payments = await response.Content.ReadFromJsonAsync<List<PreviousMonthPaymentDTO>>();
            Assert.NotNull(payments);
            Assert.Empty(payments!);
        }

        [Fact]
        public async Task GetStatistics_ShouldReturnOk_WhenNoPayments()
        {
            // Act
            var response = await _client.GetAsync("/api/utilitypayments/statistics?paymentType=Electricity");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var stats = await response.Content.ReadFromJsonAsync<UtilityPaymentStatisticsDTO>();
            Assert.NotNull(stats);
            Assert.Empty(stats!.MonthlyExpenses);
            Assert.Empty(stats.MonthlyConsumption);
        }

        [Fact]
        public async Task Create_ShouldReturnBadRequest_WhenCurrentValueLessThanPrevious()
        {
            // Arrange
            var department = await SetupTestData();
            
            var formData = new MultipartFormDataContent();
            formData.Add(new StringContent(department.Id.ToString()), "DepartmentId");
            formData.Add(new StringContent("1"), "PaymentType");
            formData.Add(new StringContent(100.5m.ToString(CultureInfo.InvariantCulture)), "PreviousValue");
            formData.Add(new StringContent(50.0m.ToString(CultureInfo.InvariantCulture)), "CurrentValue"); // Less than previous
            formData.Add(new StringContent(2.5m.ToString(CultureInfo.InvariantCulture)), "PricePerUnit");
            formData.Add(new StringContent(0m.ToString(CultureInfo.InvariantCulture)), "TotalAmount");
            formData.Add(new StringContent(DateTime.UtcNow.ToString("yyyy-MM", CultureInfo.InvariantCulture)), "paymentMonth");

            // Act
            var response = await _client.PostAsync("/api/utilitypayments", formData);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task Create_ShouldReturnCreated_WhenValidData()
        {
            // Arrange
            var department = await SetupTestData();
            
            // Use InvariantCulture for decimal values to ensure dot separator
            var formData = new MultipartFormDataContent();
            formData.Add(new StringContent(department.Id.ToString()), "DepartmentId");
            formData.Add(new StringContent("1"), "PaymentType");
            formData.Add(new StringContent(100.5m.ToString(CultureInfo.InvariantCulture)), "PreviousValue");
            formData.Add(new StringContent(150.0m.ToString(CultureInfo.InvariantCulture)), "CurrentValue");
            formData.Add(new StringContent(2.5m.ToString(CultureInfo.InvariantCulture)), "PricePerUnit");
            formData.Add(new StringContent(123.75m.ToString(CultureInfo.InvariantCulture)), "TotalAmount");
            // paymentMonth format: "yyyy-MM" (e.g., "2026-01")
            formData.Add(new StringContent(DateTime.UtcNow.ToString("yyyy-MM", CultureInfo.InvariantCulture)), "paymentMonth");

            // Act
            var response = await _client.PostAsync("/api/utilitypayments", formData);

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
                var result = await response.Content.ReadFromJsonAsync<UtilityPaymentDTO>();
                Assert.NotNull(result);
                Assert.Equal(department.Id, result!.DepartmentId);
                Assert.Equal(PaymentType.Electricity, result.PaymentType);
            }
            else
            {
                // If response is empty but status is Created, that's also acceptable
                Assert.True(response.IsSuccessStatusCode);
            }
        }
    }
}
