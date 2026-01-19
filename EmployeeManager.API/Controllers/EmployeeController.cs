using EmployeeManager.API.Data;
using EmployeeManager.API.DTO;
using EmployeeManager.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManager.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EmployeesController : ControllerBase
    {
        private readonly AppDbContext _appDbContext;

        public EmployeesController(AppDbContext appDbContext)
        {
            _appDbContext = appDbContext;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] Guid? departmentId, [FromQuery] Guid? positionId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] string? search = null, [FromQuery] string sortBy = "", [FromQuery] string sortOrder = "asc")
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;

            var query = _appDbContext.Employees
                .Include(e => e.Position)
                .Include(e => e.Department)
                .Include(e => e.Specialization)
                .AsQueryable();

            // Filter by department if specified
            if (departmentId.HasValue)
            {
                query = query.Where(e => e.DepartmentId == departmentId.Value);
            }

            // Filter by position if specified
            if (positionId.HasValue)
            {
                query = query.Where(e => e.PositionId == positionId.Value);
            }

            // Search by first name or last name
            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchLower = search.ToLower();
                query = query.Where(e => 
                    (e.FirstName != null && e.FirstName.ToLower().Contains(searchLower)) || 
                    (e.LastName != null && e.LastName.ToLower().Contains(searchLower)));
            }

            var totalCount = await query.CountAsync();

            // Apply sorting
            if (!string.IsNullOrWhiteSpace(sortBy))
            {
                query = sortBy.ToLower() switch
                {
                    "callsign" => sortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase) 
                        ? query.OrderByDescending(e => e.CallSign ?? string.Empty)
                        : query.OrderBy(e => e.CallSign ?? string.Empty),
                    "firstname" => sortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase) 
                        ? query.OrderByDescending(e => e.FirstName ?? string.Empty)
                        : query.OrderBy(e => e.FirstName ?? string.Empty),
                    "lastname" => sortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase)
                        ? query.OrderByDescending(e => e.LastName ?? string.Empty)
                        : query.OrderBy(e => e.LastName ?? string.Empty),
                    "phonenumber" => sortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase)
                        ? query.OrderByDescending(e => e.PhoneNumber)
                        : query.OrderBy(e => e.PhoneNumber),
                    "department" => sortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase)
                        ? query.OrderByDescending(e => e.Department != null ? e.Department.Name : "Reserve")
                        : query.OrderBy(e => e.Department != null ? e.Department.Name : "Reserve"),
                    "position" => sortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase)
                        ? query.OrderByDescending(e => e.Position != null ? e.Position.Title : string.Empty)
                        : query.OrderBy(e => e.Position != null ? e.Position.Title : string.Empty),
                    _ => query.OrderBy(e => e.CallSign ?? string.Empty)
                };
            }
            else
            {
                query = query.OrderBy(e => e.CallSign ?? string.Empty);
            }

            var employees = await query
                .AsNoTracking()
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(e => new EmployeeDTO
                {
                    Id = e.Id,
                    FirstName = e.FirstName,
                    LastName = e.LastName,
                    CallSign = e.CallSign,
                    PhoneNumber = e.PhoneNumber,
                    BirthDate = e.BirthDate,
                    PositionId = e.PositionId,
                    PositionName = e.Position != null ? e.Position.Title : null,
                    DepartmentId = e.DepartmentId,
                        DepartmentName = e.Department != null ? e.Department.Name : "Reserve",
                    SpecializationId = e.SpecializationId,
                    SpecializationName = e.Specialization != null ? e.Specialization.Name : null
                })
                .ToListAsync();

            return Ok(new { items = employees, total = totalCount });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var employee = await _appDbContext.Employees
                .Include(e => e.Position)
                .Include(e => e.Department)
                .Include(e => e.Specialization)
                .AsNoTracking()
                .Where(e => e.Id == id)
                .Select(e => new EmployeeDTO
                {
                    Id = e.Id,
                    FirstName = e.FirstName,
                    LastName = e.LastName,
                    CallSign = e.CallSign,
                    PhoneNumber = e.PhoneNumber,
                    BirthDate = e.BirthDate,
                    PositionId = e.PositionId,
                    PositionName = e.Position != null ? e.Position.Title : null,
                    DepartmentId = e.DepartmentId,
                        DepartmentName = e.Department != null ? e.Department.Name : "Reserve",
                    SpecializationId = e.SpecializationId,
                    SpecializationName = e.Specialization != null ? e.Specialization.Name : null
                })
                .FirstOrDefaultAsync();

            if (employee == null)
                return NotFound();

            return Ok(employee);
        }

        [HttpPost]
        public async Task<IActionResult> Create(EmployeeDTO employeeDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Validate SpecializationId exists
            var specializationExists = await _appDbContext.Specializations
                .AnyAsync(s => s.Id == employeeDto.SpecializationId);
            if (!specializationExists)
            {
                return BadRequest(new { message = "Invalid SpecializationId." });
            }

            // Ensure Reserve department exists
            var reserveDept = await _appDbContext.Departments
                .FirstOrDefaultAsync(d => d.Name == "Reserve" || d.Name == "Резерв" || d.Name == "Global Reserve");
            if (reserveDept == null)
            {
                reserveDept = new Department { Name = "Reserve" };
                _appDbContext.Departments.Add(reserveDept);
                await _appDbContext.SaveChangesAsync();
            }

            // Ensure Unemployed position exists
            var unemployedPosition = await _appDbContext.Positions
                .FirstOrDefaultAsync(p => p.Title == "Unemployed" || p.Title == "Без Посади");
            if (unemployedPosition == null)
            {
                unemployedPosition = new Position { Title = "Unemployed" };
                _appDbContext.Positions.Add(unemployedPosition);
                await _appDbContext.SaveChangesAsync();
            }

            // Set default DepartmentId to Reserve if null
            var departmentId = employeeDto.DepartmentId ?? reserveDept.Id;

            // Set default PositionId to Unemployed if null
            var positionId = employeeDto.PositionId ?? unemployedPosition.Id;

            var employee = new Employee
            {
                FirstName = employeeDto.FirstName,
                LastName = employeeDto.LastName,
                CallSign = employeeDto.CallSign,
                PhoneNumber = employeeDto.PhoneNumber,
                BirthDate = employeeDto.BirthDate,
                PositionId = positionId,
                DepartmentId = departmentId,
                SpecializationId = employeeDto.SpecializationId,
                HireDate = DateTime.UtcNow
            };

            _appDbContext.Employees.Add(employee);
            await _appDbContext.SaveChangesAsync();

            // Reload employee with related data to return complete DTO
            var createdEmployee = await _appDbContext.Employees
                .Include(e => e.Position)
                .Include(e => e.Department)
                .Include(e => e.Specialization)
                .AsNoTracking()
                .Where(e => e.Id == employee.Id)
                .Select(e => new EmployeeDTO
                {
                    Id = e.Id,
                    FirstName = e.FirstName,
                    LastName = e.LastName,
                    CallSign = e.CallSign,
                    PhoneNumber = e.PhoneNumber,
                    BirthDate = e.BirthDate,
                    PositionId = e.PositionId,
                    PositionName = e.Position != null ? e.Position.Title : null,
                    DepartmentId = e.DepartmentId,
                    DepartmentName = e.Department != null ? e.Department.Name : "Reserve",
                    SpecializationId = e.SpecializationId,
                    SpecializationName = e.Specialization != null ? e.Specialization.Name : null
                })
                .FirstOrDefaultAsync();

            if (createdEmployee == null)
                return BadRequest(new { message = "Failed to create employee." });

            return CreatedAtAction(nameof(GetById), new { id = createdEmployee.Id }, createdEmployee);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, EmployeeDTO employeeDto)
        {
            var employee = await _appDbContext.Employees.FindAsync(id);
            if (employee == null)
                return NotFound();

            // Validate SpecializationId exists
            var specializationExists = await _appDbContext.Specializations
                .AnyAsync(s => s.Id == employeeDto.SpecializationId);
            if (!specializationExists)
            {
                return BadRequest(new { message = "Invalid SpecializationId." });
            }

            // Ensure Reserve department exists
            var reserveDept = await _appDbContext.Departments
                .FirstOrDefaultAsync(d => d.Name == "Reserve" || d.Name == "Резерв" || d.Name == "Global Reserve");
            if (reserveDept == null)
            {
                reserveDept = new Department { Name = "Reserve" };
                _appDbContext.Departments.Add(reserveDept);
                await _appDbContext.SaveChangesAsync();
            }

            // Ensure Unemployed position exists
            var unemployedPosition = await _appDbContext.Positions
                .FirstOrDefaultAsync(p => p.Title == "Unemployed" || p.Title == "Без Посади");
            if (unemployedPosition == null)
            {
                unemployedPosition = new Position { Title = "Unemployed" };
                _appDbContext.Positions.Add(unemployedPosition);
                await _appDbContext.SaveChangesAsync();
            }

            // Set default DepartmentId to Reserve if null
            var departmentId = employeeDto.DepartmentId ?? reserveDept.Id;

            // Set default PositionId to Unemployed if null
            var positionId = employeeDto.PositionId ?? unemployedPosition.Id;

            employee.FirstName = employeeDto.FirstName;
            employee.LastName = employeeDto.LastName;
            employee.CallSign = employeeDto.CallSign;
            employee.PhoneNumber = employeeDto.PhoneNumber;
            employee.BirthDate = employeeDto.BirthDate;
            employee.PositionId = positionId;
            employee.DepartmentId = departmentId;
            employee.SpecializationId = employeeDto.SpecializationId;

            _appDbContext.Employees.Update(employee);
            await _appDbContext.SaveChangesAsync();

            // Reload employee with related data to return complete DTO
            var updatedEmployee = await _appDbContext.Employees
                .Include(e => e.Position)
                .Include(e => e.Department)
                .Include(e => e.Specialization)
                .AsNoTracking()
                .Where(e => e.Id == id)
                .Select(e => new EmployeeDTO
                {
                    Id = e.Id,
                    FirstName = e.FirstName,
                    LastName = e.LastName,
                    CallSign = e.CallSign,
                    PhoneNumber = e.PhoneNumber,
                    BirthDate = e.BirthDate,
                    PositionId = e.PositionId,
                    PositionName = e.Position != null ? e.Position.Title : null,
                    DepartmentId = e.DepartmentId,
                    DepartmentName = e.Department != null ? e.Department.Name : "Reserve",
                    SpecializationId = e.SpecializationId,
                    SpecializationName = e.Specialization != null ? e.Specialization.Name : null
                })
                .FirstOrDefaultAsync();

            if (updatedEmployee == null)
                return NotFound(new { message = $"Employee with ID {id} not found after update." });

            return Ok(updatedEmployee);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id, [FromQuery] Guid? departmentId)
        {
            var emp = await _appDbContext.Employees.FindAsync(id);
            if (emp == null)
                return NotFound();

            if (departmentId.HasValue && emp.DepartmentId != departmentId.Value)
            {
                return BadRequest(new { message = $"Employee {id} does not belong to the specified department with id: {departmentId.Value}." });
            }

            try
            {
                // Check if employee is from Reserve department
                var reserveDept = await _appDbContext.Departments
                    .FirstOrDefaultAsync(d => d.Name == "Reserve" || d.Name == "Резерв" || d.Name == "Global Reserve");
                
                if (reserveDept == null)
                {
                    // Create Reserve department if it doesn't exist
                    reserveDept = new Department { Name = "Reserve" };
                    _appDbContext.Departments.Add(reserveDept);
                    await _appDbContext.SaveChangesAsync();
                }

                // If employee is from Reserve, delete permanently
                if (emp.DepartmentId == reserveDept.Id)
                {
                    _appDbContext.Employees.Remove(emp);
                    await _appDbContext.SaveChangesAsync();
                    return NoContent();
                }

                // Otherwise, move employee to Reserve and set position to Unemployed
                var unemployedPosition = await _appDbContext.Positions
                    .FirstOrDefaultAsync(p => p.Title == "Unemployed" || p.Title == "Без Посади");
                
                if (unemployedPosition == null)
                {
                    // Create Unemployed position if it doesn't exist
                    unemployedPosition = new Position { Title = "Unemployed" };
                    _appDbContext.Positions.Add(unemployedPosition);
                    await _appDbContext.SaveChangesAsync();
                }

                emp.DepartmentId = reserveDept.Id;
                emp.PositionId = unemployedPosition.Id;
                await _appDbContext.SaveChangesAsync();
                
                // Return the updated employee
                var updatedEmp = await _appDbContext.Employees
                    .Include(e => e.Position)
                    .Include(e => e.Department)
                    .Include(e => e.Specialization)
                    .AsNoTracking()
                    .Where(e => e.Id == id)
                    .Select(e => new EmployeeDTO
                    {
                        Id = e.Id,
                        FirstName = e.FirstName,
                        LastName = e.LastName,
                        CallSign = e.CallSign,
                        PhoneNumber = e.PhoneNumber,
                        BirthDate = e.BirthDate,
                        PositionId = e.PositionId,
                        PositionName = e.Position != null ? e.Position.Title : null,
                        DepartmentId = e.DepartmentId,
                        DepartmentName = e.Department != null ? e.Department.Name : "Reserve",
                        SpecializationId = e.SpecializationId,
                        SpecializationName = e.Specialization != null ? e.Specialization.Name : null
                    })
                    .FirstOrDefaultAsync();
                
                return Ok(updatedEmp);
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot update employee." });
            }
        }
    }
}