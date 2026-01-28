using EmployeeManager.API.Data;
using EmployeeManager.API.DTO;
using EmployeeManager.API.Models;
using EmployeeManager.API.Repositories;
using EmployeeManager.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManager.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PositionsController : ControllerBase
    {
        private readonly AppDbContext _appDbContext;
        private readonly IPositionService _positionService;
        private readonly IEmployeeRepository _employeeRepository;

        public PositionsController(
            AppDbContext appDbContext,
            IPositionService positionService,
            IEmployeeRepository employeeRepository)
        {
            _appDbContext = appDbContext;
            _positionService = positionService;
            _employeeRepository = employeeRepository;
        }

        [HttpGet("all")]
        public async Task<IActionResult> GetAllPositions(CancellationToken cancellationToken = default)
        {
            var positions = await _positionService.GetAllAsync(null, cancellationToken);
            return Ok(positions);
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] Guid? departmentId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null,
            CancellationToken cancellationToken = default)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            var query = _appDbContext.Positions.AsQueryable();

            if (departmentId.HasValue)
            {
                query = query
                    .Where(p => p.DepartmentPositions!
                        .Any(dp => dp.DepartmentId == departmentId.Value));
            }

            // Search by title
            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchLower = search.ToLower();
                query = query.Where(p => p.Title.ToLower().Contains(searchLower));
            }

            var totalCount = await query.CountAsync(cancellationToken);

            var positions = await query
                .OrderBy(p => p.Title)
                .AsNoTracking()
                .Include(p => p.DepartmentPositions!)
                    .ThenInclude(dp => dp.Department)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new PositionDTO
                {
                    Id = p.Id,
                    Title = p.Title
                })
                .ToListAsync(cancellationToken);

            return Ok(new { items = positions, total = totalCount });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken = default)
        {
            var position = await _positionService.GetByIdAsync(id, cancellationToken);
            if (position == null)
                return NotFound(new { message = $"Position with ID {id} not found." });

            // Load departments for this position
            var deptPositions = await _appDbContext.DepartmentPositions
                .Include(dp => dp.Department)
                .Where(dp => dp.PositionId == id)
                .Select(dp => new DepartmentDTO
                {
                    Id = dp.Department!.Id,
                    Name = dp.Department.Name
                })
                .ToListAsync(cancellationToken);

            position.Departments = deptPositions;
            return Ok(position);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] PositionUpdateDTO positionDto, CancellationToken cancellationToken = default)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (string.IsNullOrWhiteSpace(positionDto.Title))
            {
                return BadRequest(new { message = "Title is required." });
            }

            var positionDtoBase = new PositionDTO { Title = positionDto.Title };
            var created = await _positionService.CreateAsync(positionDtoBase, cancellationToken);

            // Add department links if provided
            if (positionDto.DepartmentIds.Any())
            {
                var newLinks = positionDto.DepartmentIds
                    .Select(depId => new DepartmentPosition { DepartmentId = depId, PositionId = created.Id })
                    .ToList();

                _appDbContext.DepartmentPositions.AddRange(newLinks);
                await _appDbContext.SaveChangesAsync(cancellationToken);
            }

            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] PositionUpdateDTO model, CancellationToken cancellationToken = default)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (string.IsNullOrWhiteSpace(model.Title))
            {
                return BadRequest(new { message = "Title is required." });
            }

            var updated = await _positionService.UpdateAsync(id, model, cancellationToken);
            if (updated == null)
                return NotFound(new { message = $"Position with ID {id} not found." });

            return Ok(updated);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken = default)
        {
            var position = await _positionService.GetByIdAsync(id, cancellationToken);
            if (position == null)
                return NotFound(new { message = $"Position with ID {id} not found." });

            // Prevent deletion of Unemployed (Без Посади) position
            if (position.Title == "Unemployed" || position.Title == "Без Посади")
            {
                return BadRequest(new { message = "Cannot delete the default position 'Unemployed' (Без Посади)." });
            }

            // Find the Unemployed position to reassign employees
            var unemployedPosition = await _appDbContext.Positions
                .FirstOrDefaultAsync(p => p.Title == "Unemployed" || p.Title == "Без Посади", cancellationToken);

            if (unemployedPosition == null)
            {
                return BadRequest(new { message = "Default position 'Unemployed' (Без Посади) not found. Cannot proceed with deletion." });
            }

            try
            {
                // Reassign all employees with this position to Unemployed
                var employeesWithPosition = await _employeeRepository.GetByPositionIdAsync(id, cancellationToken);
                foreach (var emp in employeesWithPosition)
                {
                    emp.PositionId = unemployedPosition.Id;
                }
                await _appDbContext.SaveChangesAsync(cancellationToken);

                var deleted = await _positionService.DeleteAsync(id, cancellationToken);
                if (!deleted)
                    return NotFound(new { message = $"Position with ID {id} not found." });
            }
            catch (DbUpdateException ex)
            {
                return Conflict(new { message = "Error deleting position.", detail = ex.Message });
            }

            return NoContent();
        }
    }
}