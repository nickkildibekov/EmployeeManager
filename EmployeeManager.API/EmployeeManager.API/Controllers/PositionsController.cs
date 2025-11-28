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
            var query = _appDbContext.Positions.AsQueryable();

            if (departmentId.HasValue)
                query = query.Where(p => p.DepartmentId == departmentId.Value);

            var positions = await query.AsNoTracking().ToListAsync();

            return Ok(positions);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var position = await _appDbContext.Positions
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == id);

            if (position == null)
                return NotFound();

            return Ok(position);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] PositionDTO positionDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var position = new Position
            {
                Title = positionDto.Title,
                Description = positionDto.Description ?? string.Empty,
                DepartmentId = positionDto.DepartmentId
            };

            _appDbContext.Positions.Add(position);
            await _appDbContext.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = position.Id }, position);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] PositionDTO model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var pos = await _appDbContext.Positions.FindAsync(id);
            if (pos == null)
                return NotFound();

            pos.Title = model.Title;
            pos.Description = model.Description ?? string.Empty;
            pos.DepartmentId = model.DepartmentId;

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
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete position with linked records." });
            }

            return NoContent();
        }
    }
}