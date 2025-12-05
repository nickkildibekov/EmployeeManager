using EmployeeManager.API.Data;
using EmployeeManager.API.DTO;
using EmployeeManager.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

// NOTE: PositionUpdateDTO is defined above for brevity in the DTO section.

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

        [HttpGet]
        public async Task<IActionResult> GetAll(int? departmentId)
        {
            var query = _appDbContext.Positions
                .AsQueryable();

            if (departmentId.HasValue)
            {
                // Filter positions that are associated with the given department ID via the join table
                query = query
                    .Where(p => p.DepartmentPositions!
                        .Any(dp => dp.DepartmentId == departmentId.Value));
            }

            var positions = await query
                .AsNoTracking()
                .Select(p => new PositionDTO
                {
                    Id = p.Id,
                    Title = p.Title,
                    Description = p.Description
                })
                .ToListAsync();

            return Ok(positions);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var position = await _appDbContext.Positions
                .AsNoTracking()
                .Where(p => p.Id == id)
                .Select(p => new PositionDTO
                {
                    Id = p.Id,
                    Title = p.Title,
                    Description = p.Description
                })
                .FirstOrDefaultAsync();

            if (position == null)
                return NotFound();

            return Ok(position);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] PositionUpdateDTO positionDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // 1. Create the base Position
            var position = new Position
            {
                Title = positionDto.Title,
                Description = positionDto.Description ?? string.Empty,
            };

            _appDbContext.Positions.Add(position);
            await _appDbContext.SaveChangesAsync(); // Save to get the ID

            // 2. Create the Many-to-Many links
            if (positionDto.DepartmentIds.Any())
            {
                var newLinks = positionDto.DepartmentIds
                    .Select(depId => new DepartmentPosition { DepartmentId = depId, PositionId = position.Id })
                    .ToList();

                _appDbContext.DepartmentPositions.AddRange(newLinks);
                await _appDbContext.SaveChangesAsync();
            }

            return CreatedAtAction(nameof(GetById), new { id = position.Id }, position);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] PositionUpdateDTO model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Fetch position with existing department links
            var pos = await _appDbContext.Positions
                .Include(p => p.DepartmentPositions)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (pos == null)
                return NotFound();

            // 1. Update Position details
            pos.Title = model.Title;
            pos.Description = model.Description ?? string.Empty;

            // 2. Update Many-to-Many links (Synchronization logic)
            var existingLinks = pos.DepartmentPositions?.ToList() ?? new List<DepartmentPosition>();
            var incomingIds = new HashSet<int>(model.DepartmentIds);

            // Remove links that are no longer requested
            var linksToRemove = existingLinks
                .Where(dp => !incomingIds.Contains(dp.DepartmentId))
                .ToList();
            _appDbContext.DepartmentPositions.RemoveRange(linksToRemove);

            // Add new links that don't exist yet
            var existingIds = new HashSet<int>(existingLinks.Select(dp => dp.DepartmentId));
            var linksToAdd = incomingIds
                .Where(depId => !existingIds.Contains(depId))
                .Select(depId => new DepartmentPosition { DepartmentId = depId, PositionId = pos.Id })
                .ToList();
            _appDbContext.DepartmentPositions.AddRange(linksToAdd);

            await _appDbContext.SaveChangesAsync();

            return Ok(pos);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var pos = await _appDbContext.Positions.FindAsync(id);
            if (pos == null)
                return NotFound();

            try
            {
                _appDbContext.Positions.Remove(pos);
                await _appDbContext.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (ex.InnerException?.Message?.Contains("foreign key") == true)
            {
                // Conflict if employees are still linked to this position
                return Conflict(new { message = "Cannot delete position with linked employees." });
            }

            return NoContent();
        }
    }
}