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
                    Title = p.Title
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

            var position = new Position
            {
                Title = positionDto.Title
            };

            _appDbContext.Positions.Add(position);
            await _appDbContext.SaveChangesAsync();

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

            var pos = await _appDbContext.Positions
                .Include(p => p.DepartmentPositions)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (pos == null)
                return NotFound();

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
                return Conflict(new { message = "Cannot delete position with linked employees." });
            }

            return NoContent();
        }
    }
}