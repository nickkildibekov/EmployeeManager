using EmployeeManager.API.Data;
using EmployeeManager.API.DTO;
using EmployeeManager.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManager.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SpecializationsController : ControllerBase
    {
        private readonly AppDbContext _appDbContext;

        public SpecializationsController(AppDbContext appDbContext)
        {
            _appDbContext = appDbContext;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(CancellationToken cancellationToken = default)
        {
            var specializations = await _appDbContext.Specializations
                .OrderBy(s => s.Name)
                .Select(s => new SpecializationDTO
                {
                    Id = s.Id,
                    Name = s.Name
                })
                .ToListAsync(cancellationToken);

            return Ok(specializations);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken = default)
        {
            var specialization = await _appDbContext.Specializations
                .Where(s => s.Id == id)
                .Select(s => new SpecializationDTO
                {
                    Id = s.Id,
                    Name = s.Name
                })
                .FirstOrDefaultAsync(cancellationToken);

            if (specialization == null)
                return NotFound(new { message = $"Specialization with ID {id} not found." });

            return Ok(specialization);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] SpecializationDTO specializationDto, CancellationToken cancellationToken = default)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (string.IsNullOrWhiteSpace(specializationDto.Name))
            {
                return BadRequest(new { message = "Name is required." });
            }

            var specialization = new Specialization
            {
                Name = specializationDto.Name.Trim()
            };

            _appDbContext.Specializations.Add(specialization);
            await _appDbContext.SaveChangesAsync(cancellationToken);

            var createdDto = new SpecializationDTO { Id = specialization.Id, Name = specialization.Name };
            return CreatedAtAction(nameof(GetById), new { id = specialization.Id }, createdDto);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] SpecializationDTO specializationDto, CancellationToken cancellationToken = default)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (string.IsNullOrWhiteSpace(specializationDto.Name))
            {
                return BadRequest(new { message = "Name is required." });
            }

            var specialization = await _appDbContext.Specializations.FindAsync(new object[] { id }, cancellationToken);
            if (specialization == null)
                return NotFound(new { message = $"Specialization with ID {id} not found." });

            specialization.Name = specializationDto.Name.Trim();
            await _appDbContext.SaveChangesAsync(cancellationToken);

            var updatedDto = new SpecializationDTO { Id = specialization.Id, Name = specialization.Name };
            return Ok(updatedDto);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken = default)
        {
            var specialization = await _appDbContext.Specializations
                .Include(s => s.Employees)
                .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

            if (specialization == null)
                return NotFound(new { message = $"Specialization with ID {id} not found." });

            // Prevent deletion of Intern (Без Спец.) specialization
            if (specialization.Name == "Intern" || specialization.Name == "Без Спец.")
            {
                return BadRequest(new { message = "Cannot delete the default specialization 'Intern' (Без Спец.)." });
            }

            // Find the Intern specialization to reassign employees
            var internSpecialization = await _appDbContext.Specializations
                .FirstOrDefaultAsync(s => s.Name == "Intern" || s.Name == "Без Спец.", cancellationToken);

            if (internSpecialization == null)
            {
                return BadRequest(new { message = "Default specialization 'Intern' (Без Спец.) not found. Cannot proceed with deletion." });
            }

            // Reassign all employees with this specialization to Intern
            if (specialization.Employees?.Any() == true)
            {
                foreach (var employee in specialization.Employees)
                {
                    employee.SpecializationId = internSpecialization.Id;
                }
            }

            _appDbContext.Specializations.Remove(specialization);
            await _appDbContext.SaveChangesAsync(cancellationToken);

            return NoContent();
        }
    }
}
