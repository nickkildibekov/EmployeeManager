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
        public IActionResult Get()
        {
            return Ok(new { message = "Server is running" });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var position = await _appDbContext.Positions
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == id);

            if (position == null)
                return NotFound();

            return Ok(position);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] EmployeeDTO employeeDto)
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
                HireDate = DateTime.Now
            };

            _appDbContext.Employees.Add(employee);
            await _appDbContext.SaveChangesAsync();
         

            if (employee == null) return NotFound();

            return CreatedAtAction(nameof(Get), new { id = employee.Id }, employee);
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
