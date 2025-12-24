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

            Department defaultDept;

            if (!dbContext.Departments.Any())
            {
                defaultDept = new Department { Name = "General" };
                dbContext.Departments.Add(defaultDept);
                dbContext.SaveChanges();
            }
            else
            {
                defaultDept = dbContext.Departments.First();
            }

            Position unemployedPosition;
            if (!dbContext.Positions.Any())
            {
                unemployedPosition = new Position { Id = 16, Title = "Unemployeed" };
                dbContext.Positions.Add(unemployedPosition);
                dbContext.SaveChanges();
            }
            else
            {
                unemployedPosition = dbContext.Positions.FirstOrDefault(p => p.Id == 16) 
                    ?? dbContext.Positions.First();
            }

            if (!dbContext.DepartmentPositions.Any())
            {
                dbContext.DepartmentPositions.Add(new DepartmentPosition
                {
                    DepartmentId = defaultDept.Id,
                    PositionId = unemployedPosition.Id
                });
                dbContext.SaveChanges();
            }

            // No employees, equipment categories, or equipment are seeded
            // Users will add these manually
        }
    }    
}