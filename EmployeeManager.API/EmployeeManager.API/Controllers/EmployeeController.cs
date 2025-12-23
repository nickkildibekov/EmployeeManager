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
        public async Task<IActionResult> GetAll([FromQuery] int? departmentId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] string? search = null)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;

            var query = _appDbContext.Employees
                .Include(e => e.Position)
                .Include(e => e.Department)
                .AsQueryable();

            // Filter by department if specified (and > 0)
            if (departmentId.HasValue && departmentId.Value > 0)
            {
                query = query.Where(e => e.DepartmentId == departmentId.Value);
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
                    DepartmentName = e.Department != null ? e.Department.Name : string.Empty
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
                .AsNoTracking()
                .Where(e => e.Id == id)
                .Select(e => new EmployeeDTO
                {
                    Id = e.Id,
                    FirstName = e.FirstName,
                    LastName = e.LastName,
                    PhoneNumber = e.PhoneNumber,
                    PositionId = e.PositionId,
                    DepartmentId = e.DepartmentId,
                    DepartmentName = e.Department != null ? e.Department.Name : string.Empty
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

            var employee = new Employee
            {
                FirstName = employeeDto.FirstName,
                LastName = employeeDto.LastName,
                PhoneNumber = employeeDto.PhoneNumber,
                PositionId = employeeDto.PositionId,
                DepartmentId = employeeDto.DepartmentId,
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

            employee.FirstName = employeeDto.FirstName;
            employee.LastName = employeeDto.LastName;
            employee.PhoneNumber = employeeDto.PhoneNumber;
            employee.PositionId = employeeDto.PositionId;
            employee.DepartmentId = employeeDto.DepartmentId;

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