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

            List<EquipmentCategory> allCategories = new List<EquipmentCategory>();
            if (!dbContext.EquipmentCategories.Any())
            {
                allCategories.AddRange(new List<EquipmentCategory>
                {
                    new EquipmentCategory { Name = "Computing", Description = "Laptops, Desktops, Servers" },
                    new EquipmentCategory { Name = "Peripherals", Description = "Monitors, Keyboards, Mice" },
                    new EquipmentCategory { Name = "Office Furniture", Description = "Chairs, Desks, Storage" },
                    new EquipmentCategory { Name = "Communication", Description = "Phones, Headsets, Webcams" },
                    new EquipmentCategory { Name = "Power & UPS", Description = "Uninterruptible Power Supplies, Power Strips" }
                });

                dbContext.EquipmentCategories.AddRange(allCategories);
                dbContext.SaveChanges();
            }
            else
            {
                allCategories = dbContext.EquipmentCategories.ToList();
            }
            
            if (!dbContext.Equipments.Any())
            {
                var now = DateTime.Now;
                List<Equipment> allEquipment = new List<Equipment>();
                var departments = dbContext.Departments.ToList();

                var categoryLookup = allCategories.ToDictionary(c => c.Name, c => c);
                var deptLookup = departments.ToDictionary(d => d.Name, d => d);

                int GetRandomNumber(int min, int max) => new Random().Next(min, max);

                var computingCategory = categoryLookup["Computing"];
                for (int i = 0; i < GetRandomNumber(5, 11); i++)
                {
                    allEquipment.Add(new Equipment
                    {
                        Name = $"Laptop Pro-{100 + i}",
                        Description = "High-performance employee laptop",
                        SerialNumber = $"LAP-PR-{(1000 + i):D4}",
                        PurchaseDate = now.AddMonths(-GetRandomNumber(3, 30)),
                        IsWork = true,
                        CategoryId = computingCategory.Id,
                        DepartmentId = (i % 2 == 0 ? deptLookup["IT"] : deptLookup["Finances"]).Id
                    });
                }

                var peripheralsCategory = categoryLookup["Peripherals"];
                for (int i = 0; i < GetRandomNumber(5, 11); i++)
                {
                    allEquipment.Add(new Equipment
                    {
                        Name = $"27-inch Monitor-{i + 1}",
                        Description = "Standard external monitor",
                        SerialNumber = $"MON-27-{(2000 + i):D4}",
                        PurchaseDate = now.AddMonths(-GetRandomNumber(3, 30)),
                        IsWork = true,
                        CategoryId = peripheralsCategory.Id,
                        DepartmentId = (i % 2 == 0 ? deptLookup["Sales"] : deptLookup["Human Resources"]).Id
                    });
                }

                var furnitureCategory = categoryLookup["Office Furniture"];
                for (int i = 0; i < GetRandomNumber(5, 11); i++)
                {
                    allEquipment.Add(new Equipment
                    {
                        Name = $"Ergonomic Chair-{i + 1}",
                        Description = "Adjustable ergonomic office chair",
                        SerialNumber = $"CHR-ERG-{(3000 + i):D4}",
                        PurchaseDate = now.AddMonths(-GetRandomNumber(10, 60)),
                        IsWork = true,
                        CategoryId = furnitureCategory.Id,
                        DepartmentId = deptLookup["IT"].Id
                    });
                }

                var commCategory = categoryLookup["Communication"];
                for (int i = 0; i < GetRandomNumber(5, 11); i++)
                {
                    allEquipment.Add(new Equipment
                    {
                        Name = $"VoIP Desk Phone-{i + 1}",
                        Description = "Standard desk phone for communication",
                        SerialNumber = $"PHONE-VOIP-{(4000 + i):D4}",
                        PurchaseDate = now.AddMonths(-GetRandomNumber(6, 40)),
                        IsWork = true,
                        CategoryId = commCategory.Id,
                        DepartmentId = deptLookup["Sales"].Id
                    });
                }

                var powerCategory = categoryLookup["Power & UPS"];
                for (int i = 0; i < GetRandomNumber(5, 11); i++)
                {
                    allEquipment.Add(new Equipment
                    {
                        Name = $"Server Room UPS-{i + 1}",
                        Description = "Uninterruptible Power Supply for server infrastructure",
                        SerialNumber = $"UPS-SRV-{(5000 + i):D4}",
                        PurchaseDate = now.AddMonths(-GetRandomNumber(12, 50)),
                        IsWork = true,
                        CategoryId = powerCategory.Id,
                        DepartmentId = deptLookup["IT"].Id
                    });
                }

                dbContext.Equipments.AddRange(allEquipment);
                dbContext.SaveChanges();
            }
        }
    }    
}