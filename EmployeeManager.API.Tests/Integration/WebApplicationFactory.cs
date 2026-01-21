using EmployeeManager.API.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace EmployeeManager.API.Tests.Integration
{
    public class CustomWebApplicationFactory : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing"); // Set environment to Testing to skip migrations
            
            // ConfigureServices with (context, services) overload runs AFTER Program.cs ConfigureServices
            // This allows us to properly remove the SqlServer registration and add InMemory
            builder.ConfigureServices((context, services) =>
            {
                // Remove all DbContext-related registrations (EF Core 9 requires removing IDbContextOptionsConfiguration too)
                var contextType = typeof(AppDbContext);
                
                var descriptorsToRemove = services.Where(d =>
                    d.ServiceType == contextType ||
                    d.ServiceType == typeof(DbContextOptions<AppDbContext>) ||
                    (d.ServiceType.IsGenericType &&
                     d.ServiceType.GetGenericTypeDefinition() == typeof(IDbContextOptionsConfiguration<>) &&
                     d.ServiceType.GetGenericArguments()[0] == contextType)
                ).ToList();

                foreach (var descriptor in descriptorsToRemove)
                {
                    services.Remove(descriptor);
                }

                // Add in-memory database with a unique name for each test
                services.AddDbContext<AppDbContext>(options =>
                {
                    options.UseInMemoryDatabase("TestDb_" + Guid.NewGuid().ToString());
                });
            });
        }
    }
}
