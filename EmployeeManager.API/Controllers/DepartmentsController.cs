using EmployeeManager.API.DTO;
using EmployeeManager.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManager.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DepartmentsController : ControllerBase
    {
        private readonly IDepartmentService _departmentService;

        public DepartmentsController(IDepartmentService departmentService)
        {
            _departmentService = departmentService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(CancellationToken cancellationToken = default)
        {
            var data = await _departmentService.GetAllAsync(cancellationToken);
            return Ok(data);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken = default)
        {
            var department = await _departmentService.GetByIdAsync(id, cancellationToken);
            if (department == null)
                return NotFound(new { message = $"Department with ID {id} not found." });

            return Ok(department);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] DepartmentDTO depDto, CancellationToken cancellationToken = default)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (string.IsNullOrWhiteSpace(depDto.Name))
            {
                return BadRequest(new { message = "Name is required." });
            }

            var createdDto = await _departmentService.CreateAsync(depDto, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = createdDto.Id }, createdDto);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] DepartmentDTO depDto, CancellationToken cancellationToken = default)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (string.IsNullOrWhiteSpace(depDto.Name))
            {
                return BadRequest(new { message = "Name is required." });
            }

            var updatedDto = await _departmentService.UpdateAsync(id, depDto, cancellationToken);
            if (updatedDto == null)
                return NotFound(new { message = $"Department with ID {id} not found." });

            return Ok(updatedDto);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken = default)
        {
            var department = await _departmentService.GetByIdAsync(id, cancellationToken);
            if (department != null && department.Name == "Reserve")
            {
                return BadRequest(new { message = "Cannot delete the Reserve department." });
            }

            var deleted = await _departmentService.DeleteAsync(id, cancellationToken);
            if (!deleted)
                return NotFound(new { message = $"Department with ID {id} not found." });

            return NoContent();
        }
    }
}