using EmployeeManager.API.Data;
using EmployeeManager.API.DTO;
using EmployeeManager.API.Models;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace EmployeeManager.API.Tests.Integration
{
    public class PositionsApiIntegrationTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;
        private readonly CustomWebApplicationFactory _factory;

        public PositionsApiIntegrationTests(CustomWebApplicationFactory factory)
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
        public async Task GetAll_ShouldReturnOk_WhenPositionsExist()
        {
            // Arrange
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            
            var position = new Position { Title = "Developer" };
            context.Positions.Add(position);
            await context.SaveChangesAsync();

            // Act
            var response = await _client.GetAsync("/api/positions");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var positions = await response.Content.ReadFromJsonAsync<List<PositionDTO>>();
            Assert.NotNull(positions);
            Assert.True(positions!.Count > 0);
        }

        [Fact]
        public async Task GetById_ShouldReturnOk_WhenPositionExists()
        {
            // Arrange
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            
            var position = new Position { Title = "Developer" };
            context.Positions.Add(position);
            await context.SaveChangesAsync();

            // Act
            var response = await _client.GetAsync($"/api/positions/{position.Id}");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var result = await response.Content.ReadFromJsonAsync<PositionDTO>();
            Assert.NotNull(result);
            Assert.Equal("Developer", result!.Title);
        }

        [Fact]
        public async Task Create_ShouldReturnCreated_WhenValidData()
        {
            // Arrange
            var department = await SetupTestData();
            
            var dto = new PositionUpdateDTO
            {
                Title = "New Position",
                DepartmentIds = new List<Guid> { department.Id }
            };

            // Act
            var response = await _client.PostAsJsonAsync("/api/positions", dto);

            // Assert
            Assert.True(response.IsSuccessStatusCode);
            var result = await response.Content.ReadFromJsonAsync<PositionDTO>();
            Assert.NotNull(result);
            Assert.Equal("New Position", result!.Title);
        }
    }
}
