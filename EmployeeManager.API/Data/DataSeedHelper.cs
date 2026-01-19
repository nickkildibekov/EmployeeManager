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

            // Ensure Reserve department exists (stored as "Reserve", displayed as "Резерв")
            Department reserve;
            var reserveDept = dbContext.Departments.FirstOrDefault(d => d.Name == "Reserve" || d.Name == "Резерв" || d.Name == "Global Reserve" || d.Name == "Unassigned");
            if (reserveDept == null)
            {
                reserve = new Department { Name = "Reserve" };
                dbContext.Departments.Add(reserve);
                dbContext.SaveChanges();
            }
            else
            {
                reserve = reserveDept;
                // Update name to "Reserve" if it's still old name
                if (reserve.Name == "Резерв" || reserve.Name == "Global Reserve" || reserve.Name == "Unassigned")
                {
                    reserve.Name = "Reserve";
                    dbContext.SaveChanges();
                }
            }

            // Ensure Unemployed position exists (stored as "Unemployed", displayed as "Без Посади")
            Position unemployedPosition;
            var unemployedPos = dbContext.Positions.FirstOrDefault(p => p.Title == "Unemployed" || p.Title == "Без Посади");
            if (unemployedPos == null)
            {
                unemployedPosition = new Position { Title = "Unemployed" };
                dbContext.Positions.Add(unemployedPosition);
                dbContext.SaveChanges();
            }
            else
            {
                unemployedPosition = unemployedPos;
                // Update title to "Unemployed" if it's still Ukrainian
                if (unemployedPosition.Title == "Без Посади")
                {
                    unemployedPosition.Title = "Unemployed";
                    dbContext.SaveChanges();
                }
            }

            // Ensure Intern specialization exists (stored as "Intern", displayed as "Без Спец.")
            Specialization internSpecialization;
            var internSpec = dbContext.Specializations.FirstOrDefault(s => s.Name == "Intern" || s.Name == "Без Спец.");
            if (internSpec == null)
            {
                internSpecialization = new Specialization { Name = "Intern" };
                dbContext.Specializations.Add(internSpecialization);
                dbContext.SaveChanges();
            }
            else
            {
                internSpecialization = internSpec;
                // Update name to "Intern" if it's still Ukrainian
                if (internSpecialization.Name == "Без Спец.")
                {
                    internSpecialization.Name = "Intern";
                    dbContext.SaveChanges();
                }
            }

            // Only Intern specialization is seeded, other specializations should be added manually

            // Link Unemployed position to Reserve if not already linked
            if (!dbContext.DepartmentPositions.Any(dp => dp.DepartmentId == reserve.Id && dp.PositionId == unemployedPosition.Id))
            {
                dbContext.DepartmentPositions.Add(new DepartmentPosition
                {
                    DepartmentId = reserve.Id,
                    PositionId = unemployedPosition.Id
                });
                dbContext.SaveChanges();
            }

            // Assign all employees with null DepartmentId to Reserve department
            var employeesWithoutDepartment = dbContext.Employees.Where(e => e.DepartmentId == null).ToList();
            if (employeesWithoutDepartment.Any())
            {
                foreach (var emp in employeesWithoutDepartment)
                {
                    emp.DepartmentId = reserve.Id;
                    // Set position to Unemployed if not set
                    if (emp.PositionId == null)
                    {
                        emp.PositionId = unemployedPosition.Id;
                    }
                    // Set specialization to Intern if not set or invalid
                    if (emp.SpecializationId == Guid.Empty || !dbContext.Specializations.Any(s => s.Id == emp.SpecializationId))
                    {
                        emp.SpecializationId = internSpecialization.Id;
                    }
                }
                dbContext.SaveChanges();
            }

            // No employees, equipment categories, or equipment are seeded
            // Users will add these manually
        }
    }    
}