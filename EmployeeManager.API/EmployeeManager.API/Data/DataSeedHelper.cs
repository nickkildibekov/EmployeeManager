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
            // Ensure the database is created before seeding
            dbContext.Database.EnsureCreated();

            // 1. Seed Departments
            Department hrDept;
            Department itDept;
            Department financeDept;
            Department salesDept; // Changed from Unemployed to Sales for more realistic data

            if (!dbContext.Departments.Any())
            {
                hrDept = new Department { Name = "Human Resources" };
                itDept = new Department { Name = "IT" };
                financeDept = new Department { Name = "Finances" };
                salesDept = new Department { Name = "Sales" };

                dbContext.Departments.AddRange(hrDept, itDept, financeDept, salesDept);
                dbContext.SaveChanges();
            }
            else
            {
                hrDept = dbContext.Departments.First(d => d.Name == "Human Resources");
                itDept = dbContext.Departments.First(d => d.Name == "IT");
                financeDept = dbContext.Departments.First(d => d.Name == "Finances");
                salesDept = dbContext.Departments.First(d => d.Name == "Sales");
            }

            // 2. Seed a central pool of Positions (No DepartmentId needed anymore)
            List<Position> allPositions = new List<Position>();
            if (!dbContext.Positions.Any())
            {
                // Create 15 generic positions
                allPositions.AddRange(new List<Position>
                {
                    // Common roles
                    new Position { Title = "Manager", Description = "Leads a team." },
                    new Position { Title = "Senior Analyst", Description = "Expert in data evaluation." },
                    new Position { Title = "Team Lead", Description = "Manages project delivery." },
                    new Position { Title = "Specialist", Description = "Focuses on a niche area." },
                    new Position { Title = "Associate", Description = "Entry-level professional." },
                    
                    // Specific roles (IT)
                    new Position { Title = "Software Developer", Description = "Writes and maintains code." },
                    new Position { Title = "IT Support", Description = "Provides technical assistance." },
                    new Position { Title = "Database Admin", Description = "Manages data infrastructure." },

                    // Specific roles (Finance/HR)
                    new Position { Title = "Accountant", Description = "Handles fiscal records." },
                    new Position { Title = "Recruiter", Description = "Sources and hires talent." },
                    new Position { Title = "Budget Analyst", Description = "Forecasts and tracks spending." },

                    // Specific roles (Sales)
                    new Position { Title = "Sales Executive", Description = "Closes major deals." },
                    new Position { Title = "Marketing Coordinator", Description = "Executes marketing campaigns." },
                    new Position { Title = "Client Relations", Description = "Manages customer satisfaction." },
                    new Position { Title = "Intern", Description = "Trainee position." },
                });

                dbContext.Positions.AddRange(allPositions);
                dbContext.SaveChanges();
            }
            else
            {
                allPositions = dbContext.Positions.ToList();
            }

            // 3. Seed DepartmentPosition (The Many-to-Many links)
            // Goal: Each of the 4 departments has 10 positions assigned.
            if (!dbContext.DepartmentPositions.Any())
            {
                var departments = new List<Department> { hrDept, itDept, financeDept, salesDept };
                var departmentPositions = new List<DepartmentPosition>();
                int positionCount = allPositions.Count;

                // Use a rotating index to assign 10 positions to each department, ensuring overlap.
                for (int i = 0; i < departments.Count; i++)
                {
                    var currentDept = departments[i];
                    for (int j = 0; j < 10; j++)
                    {
                        // Use modulo to cycle through available positions
                        var pos = allPositions[(i * 2 + j) % positionCount];

                        departmentPositions.Add(new DepartmentPosition
                        {
                            DepartmentId = currentDept.Id,
                            PositionId = pos.Id
                        });
                    }
                }

                dbContext.DepartmentPositions.AddRange(departmentPositions.DistinctBy(dp => new { dp.DepartmentId, dp.PositionId }));
                dbContext.SaveChanges();
            }

            // 4. Seed Employees
            if (!dbContext.Employees.Any())
            {
                List<Employee> allEmployees = new List<Employee>();
                var now = DateTime.Now;

                // Helper to get the Position IDs available to a specific department
                var availablePositionsMap = dbContext.DepartmentPositions
                    .Include(dp => dp.Position)
                    .GroupBy(dp => dp.DepartmentId)
                    .ToDictionary(g => g.Key, g => g.Select(dp => dp.Position!).ToList());


                // Function to assign an Employee to a valid Position within their Department
                Position GetPositionForDept(Department dept, int index)
                {
                    var positions = availablePositionsMap[dept.Id];
                    return positions[index % positions.Count];
                }

                // Seed HR Employees (10 employees)
                for (int i = 0; i < 10; i++)
                {
                    var pos = GetPositionForDept(hrDept, i);
                    allEmployees.Add(new Employee
                    {
                        FirstName = $"HR_Employee_{i + 1}",
                        LastName = $"Surname_{i + 1}",
                        PhoneNumber = $"111-000-{1000 + i}",
                        HireDate = now.AddDays(-i),
                        PositionId = pos.Id,
                        DepartmentId = hrDept.Id
                    });
                }

                // Seed IT Employees (10 employees)
                for (int i = 0; i < 10; i++)
                {
                    var pos = GetPositionForDept(itDept, i);
                    allEmployees.Add(new Employee
                    {
                        FirstName = $"IT_Worker_{i + 1}",
                        LastName = $"Coder_{i + 1}",
                        PhoneNumber = $"222-000-{2000 + i}",
                        HireDate = now.AddDays(-i),
                        PositionId = pos.Id,
                        DepartmentId = itDept.Id
                    });
                }

                // Seed Finance Employees (10 employees)
                for (int i = 0; i < 10; i++)
                {
                    var pos = GetPositionForDept(financeDept, i);
                    allEmployees.Add(new Employee
                    {
                        FirstName = $"Finance_Pro_{i + 1}",
                        LastName = $"Money_{i + 1}",
                        PhoneNumber = $"333-000-{3000 + i}",
                        HireDate = now.AddDays(-i),
                        PositionId = pos.Id,
                        DepartmentId = financeDept.Id
                    });
                }

                // Seed Sales Employees (10 employees)
                for (int i = 0; i < 10; i++)
                {
                    var pos = GetPositionForDept(salesDept, i);
                    allEmployees.Add(new Employee
                    {
                        FirstName = $"Sales_Rep_{i + 1}",
                        LastName = $"Closer_{i + 1}",
                        PhoneNumber = $"444-000-{4000 + i}",
                        HireDate = now.AddDays(-i),
                        PositionId = pos.Id,
                        DepartmentId = salesDept.Id
                    });
                }

                dbContext.Employees.AddRange(allEmployees);
                dbContext.SaveChanges();
            }
        }
    }
}