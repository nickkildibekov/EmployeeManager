using EmployeeManager.API.Data;
using EmployeeManager.API.Middleware;
using EmployeeManager.API.Models;
using EmployeeManager.API.Repositories;
using EmployeeManager.API.Services;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;

var builder = WebApplication.CreateBuilder(args);

string MyAllowSpecificOrigins = "CORS";

builder.Services.AddCors(options =>
{
    options.AddPolicy(name: MyAllowSpecificOrigins,
                        policy =>
                        {

                            policy.WithOrigins("http://localhost:4200",
                                "http://localhost:65499",
                                "http://localhost:57887", 
                                "http://localhost:50918", 
                                "http://localhost:56251", 
                                "http://localhost:53636",
                                "http://localhost:55250")
                                .AllowAnyHeader()
                                .AllowAnyMethod()
                                .AllowCredentials();
                        });
});


builder.Services.AddControllers();
builder.Services.Configure<IISServerOptions>(options =>
{
    options.MaxRequestBodySize = 10485760; // 10MB
});


builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Register Repositories
builder.Services.AddScoped<IRepository<Department>, DepartmentRepository>();
builder.Services.AddScoped<IDepartmentRepository, DepartmentRepository>();
builder.Services.AddScoped<IRepository<Employee>, EmployeeRepository>();
builder.Services.AddScoped<IEmployeeRepository, EmployeeRepository>();
builder.Services.AddScoped<IRepository<Equipment>, EquipmentRepository>();
builder.Services.AddScoped<IEquipmentRepository, EquipmentRepository>();
builder.Services.AddScoped<IRepository<Position>, PositionRepository>();
builder.Services.AddScoped<IPositionRepository, PositionRepository>();
builder.Services.AddScoped<IRepository<Specialization>, SpecializationRepository>();
builder.Services.AddScoped<ISpecializationRepository, SpecializationRepository>();
builder.Services.AddScoped<IRepository<EquipmentCategory>, EquipmentCategoryRepository>();
builder.Services.AddScoped<IEquipmentCategoryRepository, EquipmentCategoryRepository>();
builder.Services.AddScoped<IRepository<ScheduleEntry>, ScheduleEntryRepository>();
builder.Services.AddScoped<IScheduleEntryRepository, ScheduleEntryRepository>();
builder.Services.AddScoped<IDepartmentPositionRepository, DepartmentPositionRepository>();
builder.Services.AddScoped<IRepository<UtilityPayment>, UtilityPaymentRepository>();
builder.Services.AddScoped<IUtilityPaymentRepository, UtilityPaymentRepository>();

// Register Services
builder.Services.AddScoped<IDepartmentService, DepartmentService>();
builder.Services.AddScoped<IPositionService, PositionService>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddScoped<DataSeedHelper>();

var app = builder.Build();


// Skip migrations and seeding in Testing environment (for integration tests)
if (!app.Environment.EnvironmentName.Equals("Testing", StringComparison.OrdinalIgnoreCase))
{
    using (var scope = app.Services.CreateScope())
    {
        var services = scope.ServiceProvider;
        try
        {
            var context = services.GetRequiredService<AppDbContext>();

            // Suppress pending model changes warning - migrations are handled manually
            await context.Database.MigrateAsync();
            var seeder = services.GetRequiredService<DataSeedHelper>();
            
            await Task.Run(() => seeder.InsertData());
        }
        catch (Exception ex)
        {
            var logger = services.GetRequiredService<ILogger<Program>>();
            logger.LogError(ex, "An error occurred during database migration or seeding.");
        }
    }
}


if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();    
}

// Add global exception handling middleware
app.UseMiddleware<GlobalExceptionMiddleware>();

app.UseHttpsRedirection();

app.UseRouting();

app.UseCors(MyAllowSpecificOrigins);

// Serve static files for uploaded images
app.UseStaticFiles();

app.UseAuthorization();

app.MapControllers();

app.Run();

// Make Program class accessible for integration tests
public partial class Program { }
