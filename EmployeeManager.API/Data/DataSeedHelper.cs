using EmployeeManager.API.Models;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManager.API.Data
{
    public class DataSeedHelper
    {
        private readonly AppDbContext dbContext;

        public DataSeedHelper(AppDbContext dbContext)
        {
            this.dbContext = dbContext;
        }

        public void InsertData()
        {
            dbContext.Database.EnsureCreated();

            // Ensure Global Reserve department exists (for unassigned employees/equipment)
            Department globalReserve;
            var reserveDept = dbContext.Departments.FirstOrDefault(d => d.Name == "Global Reserve" || d.Name == "Unassigned");
            if (reserveDept == null)
            {
                globalReserve = new Department { Name = "Global Reserve" };
                dbContext.Departments.Add(globalReserve);
                dbContext.SaveChanges();
            }
            else
            {
                globalReserve = reserveDept;
            }

            // Ensure default Specializations exist
            if (!dbContext.Specializations.Any())
            {
                var defaultSpecializations = new[]
                {
                    new Specialization { Name = "General" },
                    new Specialization { Name = "IT" },
                    new Specialization { Name = "HR" },
                    new Specialization { Name = "Finance" },
                    new Specialization { Name = "Operations" },
                    new Specialization { Name = "Management" }
                };
                dbContext.Specializations.AddRange(defaultSpecializations);
                dbContext.SaveChanges();
            }

            // Ensure default Position exists (for backward compatibility)
            Position unemployedPosition;
            if (!dbContext.Positions.Any())
            {
                unemployedPosition = new Position { Title = "Unemployed" };
                dbContext.Positions.Add(unemployedPosition);
                dbContext.SaveChanges();
            }
            else
            {
                unemployedPosition = dbContext.Positions.FirstOrDefault(p => p.Title == "Unemployed") 
                    ?? dbContext.Positions.First();
            }

            // Link default position to Global Reserve if not already linked
            if (!dbContext.DepartmentPositions.Any(dp => dp.DepartmentId == globalReserve.Id && dp.PositionId == unemployedPosition.Id))
            {
                dbContext.DepartmentPositions.Add(new DepartmentPosition
                {
                    DepartmentId = globalReserve.Id,
                    PositionId = unemployedPosition.Id
                });
                dbContext.SaveChanges();
            }

            // No employees, equipment categories, or equipment are seeded
            // Users will add these manually
        }
    }    
}