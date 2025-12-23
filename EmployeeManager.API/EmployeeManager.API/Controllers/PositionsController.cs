using EmployeeManager.API.Data;
using EmployeeManager.API.DTO;
using EmployeeManager.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManager.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PositionsController : ControllerBase
    {
        private readonly AppDbContext _appDbContext;

        public PositionsController(AppDbContext appDbContext)
        {
            _appDbContext = appDbContext;
        }

        [HttpGet("all")]
        public async Task<IActionResult> GetAllPositions(CancellationToken cancellationToken = default)
        {
            var positions = await _appDbContext.Positions
                .OrderBy(p => p.Title)
                .AsNoTracking()
                .Select(p => new PositionDTO
                {
                    Id = p.Id,
                    Title = p.Title,
                })
                .ToListAsync(cancellationToken);

            return Ok(positions);
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] int? departmentId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null,
            CancellationToken cancellationToken = default)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            var query = _appDbContext.Positions.AsQueryable();

            if (departmentId.HasValue && departmentId.Value > 0)
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
        public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken = default)
        {
            var position = await _appDbContext.Positions
                .AsNoTracking()
                .Where(p => p.Id == id)
                .Select(p => new PositionDTO
                {
                    Id = p.Id,
                    Title = p.Title,
                })
                .FirstOrDefaultAsync(cancellationToken);

            if (position == null)
                return NotFound(new { message = $"Position with ID {id} not found." });

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

            var position = new Position
            {
                Title = positionDto.Title
            };

            _appDbContext.Positions.Add(position);
            await _appDbContext.SaveChangesAsync(cancellationToken);

            if (positionDto.DepartmentIds.Any())
            {
                var newLinks = positionDto.DepartmentIds
                    .Select(depId => new DepartmentPosition { DepartmentId = depId, PositionId = position.Id })
                    .ToList();

                _appDbContext.DepartmentPositions.AddRange(newLinks);
                await _appDbContext.SaveChangesAsync(cancellationToken);
            }

            var createdDto = new PositionDTO { Id = position.Id, Title = position.Title };
            return CreatedAtAction(nameof(GetById), new { id = position.Id }, createdDto);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] PositionUpdateDTO model, CancellationToken cancellationToken = default)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (string.IsNullOrWhiteSpace(model.Title))
            {
                return BadRequest(new { message = "Title is required." });
            }

            var pos = await _appDbContext.Positions
                .Include(p => p.DepartmentPositions)
                .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

            if (pos == null)
                return NotFound(new { message = $"Position with ID {id} not found." });

            pos.Title = model.Title;

            var existingLinks = pos.DepartmentPositions?.ToList() ?? new List<DepartmentPosition>();
            var incomingIds = new HashSet<int>(model.DepartmentIds);

            var linksToRemove = existingLinks
                .Where(dp => !incomingIds.Contains(dp.DepartmentId))
                .ToList();
            _appDbContext.DepartmentPositions.RemoveRange(linksToRemove);

            var existingIds = new HashSet<int>(existingLinks.Select(dp => dp.DepartmentId));
            var linksToAdd = incomingIds
                .Where(depId => !existingIds.Contains(depId))
                .Select(depId => new DepartmentPosition { DepartmentId = depId, PositionId = pos.Id })
                .ToList();
            _appDbContext.DepartmentPositions.AddRange(linksToAdd);

            await _appDbContext.SaveChangesAsync(cancellationToken);

            var updatedDto = new PositionDTO { Id = pos.Id, Title = pos.Title };
            return Ok(updatedDto);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken = default)
        {
            var pos = await _appDbContext.Positions.FindAsync(new object[] { id }, cancellationToken);
            if (pos == null)
                return NotFound(new { message = $"Position with ID {id} not found." });

            try
            {
                // Update all employees with this position to position 16 (Unemployed)
                var employeesWithPosition = await _appDbContext.Employees
                    .Where(e => e.PositionId == id)
                    .ToListAsync(cancellationToken);

                foreach (var emp in employeesWithPosition)
                {
                    emp.PositionId = 16; // Set to Unemployed position
                }

                _appDbContext.Positions.Remove(pos);
                await _appDbContext.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException ex)
            {
                return Conflict(new { message = "Error deleting position.", detail = ex.Message });
            }

            return NoContent();
        }
    }
}