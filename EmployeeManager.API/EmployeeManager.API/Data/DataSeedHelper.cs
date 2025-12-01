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
            if (!dbContext.Departments.Any())
            {
                var hr = new Models.Department { Name = "Human Resources" };
                var it = new Models.Department { Name = "IT" };
                var finance = new Models.Department { Name = "Finance" };

                dbContext.Departments.AddRange(hr, it, finance);
                dbContext.SaveChanges(); 
            }

            if (!dbContext.Positions.Any())
            {
                var hrDept = dbContext.Departments.FirstOrDefault(d => d.Name == "Human Resources");
                var itDept = dbContext.Departments.FirstOrDefault(d => d.Name == "IT");
                var financeDept = dbContext.Departments.FirstOrDefault(d => d.Name == "Finance");

                if (hrDept != null && itDept != null && financeDept != null)
                {
                   
                    var manager = new Models.Position { Title = "Manager", DepartmentId = hrDept.Id };
                    var developer = new Models.Position { Title = "Developer", DepartmentId = itDept.Id };
                    var accountant = new Models.Position { Title = "Accountant", DepartmentId = financeDept.Id };

                    dbContext.Positions.AddRange(manager, developer, accountant);
                    dbContext.SaveChanges(); 
                }
            }


            if (!dbContext.Employees.Any())
            {
                var managerPosition = dbContext.Positions.FirstOrDefault(p => p.Title == "Manager");
                var hrDept = dbContext.Departments.FirstOrDefault(d => d.Name == "Human Resources");
                var developerPosition = dbContext.Positions.FirstOrDefault(p => p.Title == "Developer");

                if (managerPosition != null && hrDept != null && developerPosition != null)
                {
                    dbContext.Employees.AddRange(
                        new Models.Employee
                        {
                            FirstName = "John",
                            LastName = "Doe",
                            PhoneNumber = "123-456-7890",
                            HireDate = DateTime.Now,
                            PositionId = managerPosition.Id,    
                            DepartmentId = hrDept.Id            
                        },
                        new Models.Employee
                        {
                            FirstName = "Jane",
                            LastName = "Smith",
                            PhoneNumber = "987-654-3210",
                            HireDate = DateTime.Now,
                            PositionId = developerPosition.Id,  
                            DepartmentId = hrDept.Id            
                        }
                    );
                    dbContext.SaveChanges();
                }
            }
        }

    }
}
