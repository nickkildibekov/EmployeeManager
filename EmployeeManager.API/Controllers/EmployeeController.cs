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
        public async Task<IActionResult> GetAll([FromQuery] int? departmentId, [FromQuery] int? positionId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] string? search = null, [FromQuery] string sortBy = "", [FromQuery] string sortOrder = "asc")
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;

            var query = _appDbContext.Employees
                .Include(e => e.Position)
                .Include(e => e.Department)
                .Include(e => e.Specialization)
                .AsQueryable();

            // Filter by department if specified (and > 0)
            if (departmentId.HasValue && departmentId.Value > 0)
            {
                query = query.Where(e => e.DepartmentId == departmentId.Value);
            }

            // Filter by position if specified
            if (positionId.HasValue && positionId.Value > 0)
            {
                query = query.Where(e => e.PositionId == positionId.Value);
            }

            // Search by first name or last name
            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchLower = search.ToLower();
                query = query.Where(e => 
                    e.FirstName.ToLower().Contains(searchLower) || 
                    e.LastName.ToLower().Contains(searchLower));
            }

            var totalCount = await query.CountAsync();

            // Apply sorting
            if (!string.IsNullOrWhiteSpace(sortBy))
            {
                query = sortBy.ToLower() switch
                {
                    "firstname" => sortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase) 
                        ? query.OrderByDescending(e => e.FirstName)
                        : query.OrderBy(e => e.FirstName),
                    "lastname" => sortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase)
                        ? query.OrderByDescending(e => e.LastName)
                        : query.OrderBy(e => e.LastName),
                    "phonenumber" => sortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase)
                        ? query.OrderByDescending(e => e.PhoneNumber)
                        : query.OrderBy(e => e.PhoneNumber),
                    "department" => sortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase)
                        ? query.OrderByDescending(e => e.Department != null ? e.Department.Name : "Reserve")
                        : query.OrderBy(e => e.Department != null ? e.Department.Name : "Reserve"),
                    "position" => sortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase)
                        ? query.OrderByDescending(e => e.Position.Title)
                        : query.OrderBy(e => e.Position.Title),
                    _ => query.OrderBy(e => e.FirstName)
                };
            }
            else
            {
                query = query.OrderBy(e => e.FirstName);
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
                    PhoneNumber = e.PhoneNumber,
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
        public async Task<IActionResult> GetById(int id)
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
                    PhoneNumber = e.PhoneNumber,
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

            var employee = new Employee
            {
                FirstName = employeeDto.FirstName,
                LastName = employeeDto.LastName,
                PhoneNumber = employeeDto.PhoneNumber,
                PositionId = employeeDto.PositionId,
                DepartmentId = employeeDto.DepartmentId,
                SpecializationId = employeeDto.SpecializationId,
                HireDate = DateTime.UtcNow
            };

            _appDbContext.Employees.Add(employee);
            await _appDbContext.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = employee.Id }, employee);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, EmployeeDTO employeeDto)
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

            employee.FirstName = employeeDto.FirstName;
            employee.LastName = employeeDto.LastName;
            employee.PhoneNumber = employeeDto.PhoneNumber;
            employee.PositionId = employeeDto.PositionId;
            employee.DepartmentId = employeeDto.DepartmentId;
            employee.SpecializationId = employeeDto.SpecializationId;

            _appDbContext.Employees.Update(employee);
            await _appDbContext.SaveChangesAsync();

            return Ok(employee);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id, [FromQuery] int? departmentId)
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
                _appDbContext.Employees.Remove(emp);
                await _appDbContext.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete employee with linked records." });
            }

            return NoContent();
        }
    }
}