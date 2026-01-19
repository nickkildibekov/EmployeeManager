using EmployeeManager.API.Data;
using EmployeeManager.API.DTO;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace EmployeeManager.API.Tests.Integration
{
    public class DepartmentsApiIntegrationTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;
        private readonly CustomWebApplicationFactory _factory;

        public DepartmentsApiIntegrationTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task GetAll_ShouldReturnOk_WhenDepartmentsExist()
        {
            // Arrange
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            
            // Seed data
            var department = new EmployeeManager.API.Models.Department { Name = "Test Department" };
            context.Departments.Add(department);
            await context.SaveChangesAsync();

            // Act
            var response = await _client.GetAsync("/api/departments");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var departments = await response.Content.ReadFromJsonAsync<List<DepartmentDTO>>();
            Assert.NotNull(departments);
            Assert.True(departments!.Count > 0);
        }

        [Fact]
        public async Task GetById_ShouldReturnOk_WhenDepartmentExists()
        {
            // Arrange
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            
            var department = new EmployeeManager.API.Models.Department { Name = "Test Department" };
            context.Departments.Add(department);
            await context.SaveChangesAsync();

            // Act
            var response = await _client.GetAsync($"/api/departments/{department.Id}");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var result = await response.Content.ReadFromJsonAsync<DepartmentDTO>();
            Assert.NotNull(result);
            Assert.Equal("Test Department", result!.Name);
        }

        [Fact]
        public async Task GetById_ShouldReturnNotFound_WhenDepartmentDoesNotExist()
        {
            // Arrange
            var nonExistentId = Guid.NewGuid();

            // Act
            var response = await _client.GetAsync($"/api/departments/{nonExistentId}");

            // Assert
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task Create_ShouldReturnCreated_WhenValidData()
        {
            // Arrange
            var dto = new DepartmentDTO { Name = "New Department" };

            // Act
            var response = await _client.PostAsJsonAsync("/api/departments", dto);

            // Assert
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            var result = await response.Content.ReadFromJsonAsync<DepartmentDTO>();
            Assert.NotNull(result);
            Assert.Equal("New Department", result!.Name);
            Assert.NotEqual(Guid.Empty, result.Id);
        }

        [Fact]
        public async Task Update_ShouldReturnOk_WhenValidData()
        {
            // Arrange
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            
            var department = new EmployeeManager.API.Models.Department { Name = "Original Name" };
            context.Departments.Add(department);
            await context.SaveChangesAsync();

            var updateDto = new DepartmentDTO { Id = department.Id, Name = "Updated Name" };

            // Act
            var response = await _client.PutAsJsonAsync($"/api/departments/{department.Id}", updateDto);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var result = await response.Content.ReadFromJsonAsync<DepartmentDTO>();
            Assert.NotNull(result);
            Assert.Equal("Updated Name", result!.Name);
        }

        [Fact]
        public async Task Delete_ShouldReturnNoContent_WhenDepartmentExists()
        {
            // Arrange
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            
            var department = new EmployeeManager.API.Models.Department { Name = "To Delete" };
            context.Departments.Add(department);
            await context.SaveChangesAsync();

            // Act
            var response = await _client.DeleteAsync($"/api/departments/{department.Id}");

            // Assert
            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
            
            // Verify deletion
            var getResponse = await _client.GetAsync($"/api/departments/{department.Id}");
            Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
        }
    }
}
