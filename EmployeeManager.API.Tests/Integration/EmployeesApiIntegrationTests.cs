using EmployeeManager.API.Data;
using EmployeeManager.API.DTO;
using EmployeeManager.API.Models;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace EmployeeManager.API.Tests.Integration
{
    public class EmployeesApiIntegrationTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;
        private readonly CustomWebApplicationFactory _factory;

        public EmployeesApiIntegrationTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
            _client = factory.CreateClient();
        }

        private async Task<(Department, Specialization)> SetupTestData()
        {
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var department = new Department { Name = "Test Department" };
            var specialization = new Specialization { Name = "IT" };
            
            context.Departments.Add(department);
            context.Specializations.Add(specialization);
            await context.SaveChangesAsync();

            return (department, specialization);
        }

        [Fact]
        public async Task GetAll_ShouldReturnOk_WhenEmployeesExist()
        {
            // Arrange
            var (department, specialization) = await SetupTestData();
            
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            
            var employee = new Employee
            {
                FirstName = "John",
                LastName = "Doe",
                PhoneNumber = "123456789",
                CallSign = "JD001",
                SpecializationId = specialization.Id,
                DepartmentId = department.Id
            };
            context.Employees.Add(employee);
            await context.SaveChangesAsync();

            // Act
            var response = await _client.GetAsync("/api/employee");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var employees = await response.Content.ReadFromJsonAsync<object>();
            Assert.NotNull(employees);
        }

        [Fact]
        public async Task GetById_ShouldReturnOk_WhenEmployeeExists()
        {
            // Arrange
            var (department, specialization) = await SetupTestData();
            
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            
            var employee = new Employee
            {
                FirstName = "John",
                LastName = "Doe",
                PhoneNumber = "123456789",
                CallSign = "JD001",
                SpecializationId = specialization.Id,
                DepartmentId = department.Id
            };
            context.Employees.Add(employee);
            await context.SaveChangesAsync();

            // Act
            var response = await _client.GetAsync($"/api/employee/{employee.Id}");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var result = await response.Content.ReadFromJsonAsync<EmployeeDTO>();
            Assert.NotNull(result);
            Assert.Equal("John", result!.FirstName);
        }

        [Fact]
        public async Task Create_ShouldReturnCreated_WhenValidData()
        {
            // Arrange
            var (department, specialization) = await SetupTestData();
            
            var dto = new EmployeeDTO
            {
                FirstName = "Jane",
                LastName = "Smith",
                PhoneNumber = "987654321",
                CallSign = "JS001",
                SpecializationId = specialization.Id,
                DepartmentId = department.Id
            };

            // Act
            var response = await _client.PostAsJsonAsync("/api/employee", dto);

            // Assert
            Assert.True(response.IsSuccessStatusCode);
            var result = await response.Content.ReadFromJsonAsync<EmployeeDTO>();
            Assert.NotNull(result);
            Assert.Equal("Jane", result!.FirstName);
        }
    }
}
