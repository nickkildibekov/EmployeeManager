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

            Department hrDept;
            Department itDept;
            Department financeDept;
            Department salesDept; 

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

            List<Position> allPositions = new List<Position>();
            if (!dbContext.Positions.Any())
            {
                allPositions.AddRange(new List<Position>
                {
                    new Position { Title = "Manager" },
                    new Position { Title = "Senior Analyst"},
                    new Position { Title = "Team Lead" },
                    new Position { Title = "Specialist" },
                    new Position { Title = "Associate"},
                    
                    new Position { Title = "Software Developer"},
                    new Position { Title = "IT Support"},
                    new Position { Title = "Database Admin"},

                    new Position { Title = "Accountant"},
                    new Position { Title = "Recruiter"},
                    new Position { Title = "Budget Analyst"},

                    new Position { Title = "Sales Executive"},
                    new Position { Title = "Marketing Coordinator"},
                    new Position { Title = "Client Relations"},
                    new Position { Title = "Intern"},
                });

                dbContext.Positions.AddRange(allPositions);
                dbContext.SaveChanges();
            }
            else
            {
                allPositions = dbContext.Positions.ToList();
            }

            
            if (!dbContext.DepartmentPositions.Any())
            {
                var departments = new List<Department> { hrDept, itDept, financeDept, salesDept };
                var departmentPositions = new List<DepartmentPosition>();
                int positionCount = allPositions.Count;

                for (int i = 0; i < departments.Count; i++)
                {
                    var currentDept = departments[i];
                    for (int j = 0; j < 10; j++)
                    {
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

            if (!dbContext.Employees.Any())
            {
                List<Employee> allEmployees = new List<Employee>();
                var now = DateTime.Now;

                var availablePositionsMap = dbContext.DepartmentPositions
                    .Include(dp => dp.Position)
                    .GroupBy(dp => dp.DepartmentId)
                    .ToDictionary(g => g.Key, g => g.Select(dp => dp.Position!).ToList());


                Position GetPositionForDept(Department dept, int index)
                {
                    var positions = availablePositionsMap[dept.Id];
                    return positions[index % positions.Count];
                }

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