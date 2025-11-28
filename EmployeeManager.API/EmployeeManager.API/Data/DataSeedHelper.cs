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
                dbContext.Departments.AddRange(
                    new Models.Department { Name = "Human Resources" },
                    new Models.Department { Name = "IT" },
                    new Models.Department { Name = "Finance" }
                );
                dbContext.SaveChanges();
            }
            if (!dbContext.Positions.Any())
            {
                dbContext.Positions.AddRange(
                    new Models.Position { Title = "Manager", DepartmentId = 1 },
                    new Models.Position { Title = "Developer", DepartmentId = 2 },
                    new Models.Position { Title = "Accountant", DepartmentId = 3 }
                );
                dbContext.SaveChanges();
            }

            if (!dbContext.Employees.Any())
            {
                dbContext.Employees.AddRange(
                    new Models.Employee
                    {
                        FirstName = "John",
                        LastName = "Doe",
                        PhoneNumber = "123-456-7890",
                        HireDate = DateTime.Now,
                        PositionId = 1,
                        DepartmentId = 1
                    },
                    new Models.Employee
                    {
                        FirstName = "Jane",
                        LastName = "Smith",
                        PhoneNumber = "987-654-3210",
                        HireDate = DateTime.Now,
                        PositionId = 2,
                        DepartmentId = 1
                    }
                   
                );

                dbContext.SaveChanges();    
            }

           
        }


    }
}
