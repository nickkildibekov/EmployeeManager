using EmployeeManager.API.Data;
using EmployeeManager.API.DTO;
using EmployeeManager.API.Models;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace EmployeeManager.API.Tests.Integration
{
    public class EquipmentsApiIntegrationTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;
        private readonly CustomWebApplicationFactory _factory;

        public EquipmentsApiIntegrationTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
            _client = factory.CreateClient();
        }

        private async Task<(Department, EquipmentCategory)> SetupTestData()
        {
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var department = new Department { Name = "Test Department" };
            var category = new EquipmentCategory { Name = "Test Category", Description = "Test Description" };
            
            context.Departments.Add(department);
            context.EquipmentCategories.Add(category);
            await context.SaveChangesAsync();

            return (department, category);
        }

        [Fact]
        public async Task GetAll_ShouldReturnOk_WhenEquipmentsExist()
        {
            // Arrange
            var (department, category) = await SetupTestData();
            
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            
            var equipment = new Equipment
            {
                Name = "Test Equipment",
                SerialNumber = "SN001",
                PurchaseDate = DateTime.UtcNow,
                Status = "Used",
                Measurement = "Unit",
                Amount = 1,
                CategoryId = category.Id,
                DepartmentId = department.Id
            };
            context.Equipments.Add(equipment);
            await context.SaveChangesAsync();

            // Act
            var response = await _client.GetAsync("/api/equipments");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var equipments = await response.Content.ReadFromJsonAsync<object>();
            Assert.NotNull(equipments);
        }

        [Fact]
        public async Task GetById_ShouldReturnOk_WhenEquipmentExists()
        {
            // Arrange
            var (department, category) = await SetupTestData();
            
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            
            var equipment = new Equipment
            {
                Name = "Test Equipment",
                SerialNumber = "SN001",
                PurchaseDate = DateTime.UtcNow,
                Status = "Used",
                Measurement = "Unit",
                Amount = 1,
                CategoryId = category.Id,
                DepartmentId = department.Id
            };
            context.Equipments.Add(equipment);
            await context.SaveChangesAsync();

            // Act
            var response = await _client.GetAsync($"/api/equipments/{equipment.Id}");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var result = await response.Content.ReadFromJsonAsync<EquipmentDTO>();
            Assert.NotNull(result);
            Assert.Equal("Test Equipment", result!.Name);
        }

        [Fact]
        public async Task Create_ShouldReturnCreated_WhenValidData()
        {
            // Arrange
            var (department, category) = await SetupTestData();
            
            var dto = new EquipmentDTO
            {
                Name = "New Equipment",
                SerialNumber = "SN002",
                PurchaseDate = DateTime.UtcNow,
                Status = "Used",
                Measurement = "Unit",
                Amount = 1,
                CategoryId = category.Id,
                DepartmentId = department.Id
            };

            // Act
            var response = await _client.PostAsJsonAsync("/api/equipments", dto);

            // Assert
            Assert.True(response.IsSuccessStatusCode);
            var result = await response.Content.ReadFromJsonAsync<EquipmentDTO>();
            Assert.NotNull(result);
            Assert.Equal("New Equipment", result!.Name);
        }
    }
}
