using EmployeeManager.API.Models;

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
            
            Department hrDept = null!;
            Department itDept = null!;
            Department financeDept = null!;
            Department unemployedDept = null!;

            if (!dbContext.Departments.Any())
            {
                hrDept = new Department { Name = "Human Resources"};
                itDept = new Department { Name = "IT" };
                financeDept = new Department { Name = "Finances"};
                unemployedDept = new Department { Name = "Unemployed" };

                dbContext.Departments.AddRange(hrDept, itDept, financeDept, unemployedDept);
                dbContext.SaveChanges();
            }
            else
            {
                hrDept = dbContext.Departments.First(d => d.Name == "Human Resources");
                itDept = dbContext.Departments.First(d => d.Name == "IT");
                financeDept = dbContext.Departments.First(d => d.Name == "Finances");
                unemployedDept = dbContext.Departments.First(d => d.Name == "Unemployed");
            }

            List<Position> allPositions = new List<Position>();

            if (!dbContext.Positions.Any())
            {
                allPositions.AddRange(new List<Position>
                {
                    new Position { Title = "HR Manager", DepartmentId = hrDept.Id },
                    new Position { Title = "Recruiter", DepartmentId = hrDept.Id },
                    new Position { Title = "Benefits Specialist", DepartmentId = hrDept.Id },
                    new Position { Title = "Training Coordinator", DepartmentId = hrDept.Id },
                    new Position { Title = "Payroll Administrator", DepartmentId = hrDept.Id }
                });

                allPositions.AddRange(new List<Position>
                {
                    new Position { Title = "Lead Developer", DepartmentId = itDept.Id },
                    new Position { Title = "Software Engineer", DepartmentId = itDept.Id },
                    new Position { Title = "IT Support Analyst", DepartmentId = itDept.Id },
                    new Position { Title = "Database Administrator", DepartmentId = itDept.Id },
                    new Position { Title = "Cloud Architect", DepartmentId = itDept.Id }
                });

                allPositions.AddRange(new List<Position>
                {
                    new Position { Title = "Finance Director", DepartmentId = financeDept.Id },
                    new Position { Title = "Senior Accountant", DepartmentId = financeDept.Id },
                    new Position { Title = "Budget Analyst", DepartmentId = financeDept.Id },
                    new Position { Title = "Bookkeeper", DepartmentId = financeDept.Id },
                    new Position { Title = "Auditor", DepartmentId = financeDept.Id }
                });

                Position spare = new Position { Title = "Spare", DepartmentId = unemployedDept.Id };
                allPositions.Add(spare);

                dbContext.Positions.AddRange(allPositions);
                dbContext.SaveChanges();
            }
            else
            {
                allPositions = dbContext.Positions.ToList();
            }

            if (!dbContext.Employees.Any())
            {
                List<Employee> allEmployees = new List<Employee>();
                var now = DateTime.Now;

                Position GetPositionForDept(Department dept, int index)
                {
                    return allPositions
                        .Where(p => p.DepartmentId == dept.Id)
                        .Skip(index % allPositions.Count(p => p.DepartmentId == dept.Id))
                        .First();
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

                var sparePosition = allPositions.First(p => p.Title == "Spare");
                for (int i = 0; i < 5; i++)
                {
                    allEmployees.Add(new Employee
                    {
                        FirstName = $"Spare_User_{i + 1}",
                        LastName = $"Unassigned_{i + 1}",
                        PhoneNumber = $"444-000-{4000 + i}",
                        HireDate = now.AddDays(-i),
                        PositionId = sparePosition.Id,
                        DepartmentId = unemployedDept.Id
                    });
                }

                dbContext.Employees.AddRange(allEmployees);
                dbContext.SaveChanges();
            }
        }
    }
}