using EmployeeManager.API.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace EmployeeManager.API.Tests.Integration
{
    public class CustomWebApplicationFactory : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.ConfigureServices(services =>
            {
                // Remove the real database configuration
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));

                if (descriptor != null)
                {
                    services.Remove(descriptor);
                }

                // Remove all DbContext registrations
                var dbContextDescriptors = services.Where(d => 
                    d.ServiceType == typeof(DbContextOptions<AppDbContext>) ||
                    (d.ImplementationType != null && d.ImplementationType.IsAssignableTo(typeof(DbContext))))
                    .ToList();
                
                foreach (var d in dbContextDescriptors)
                {
                    services.Remove(d);
                }

                // Add in-memory database
                services.AddDbContext<AppDbContext>(options =>
                {
                    options.UseInMemoryDatabase("TestDb_" + Guid.NewGuid().ToString());
                });
            });
        }
    }
}
