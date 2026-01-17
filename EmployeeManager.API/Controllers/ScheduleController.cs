using EmployeeManager.API.Data;
using EmployeeManager.API.DTO;
using EmployeeManager.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManager.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ScheduleController : ControllerBase
    {
        private readonly AppDbContext _appDbContext;

        public ScheduleController(AppDbContext appDbContext)
        {
            _appDbContext = appDbContext;
        }

        // GET api/Schedule?departmentId=1&startDate=2025-01-01&endDate=2025-01-31&positionId=2&state=OnWork
        [HttpGet]
        public async Task<IActionResult> GetEntries(
            [FromQuery] int? departmentId,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] int? positionId,
            [FromQuery] string? state,
            CancellationToken cancellationToken = default)
        {
            var query = _appDbContext.ScheduleEntries
                .Include(s => s.Employee)
                .ThenInclude(e => e.Position)
                .AsQueryable();

            if (departmentId.HasValue && departmentId.Value > 0)
                query = query.Where(s => s.DepartmentId == departmentId.Value);

            if (startDate.HasValue)
                query = query.Where(s => s.Date >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(s => s.Date <= endDate.Value);

            if (positionId.HasValue && positionId.Value > 0)
                query = query.Where(s => s.Employee != null && s.Employee.PositionId == positionId.Value);

            if (!string.IsNullOrWhiteSpace(state))
                query = query.Where(s => s.State == state);

            var entries = await query
                .AsNoTracking()
                .Select(s => new ScheduleEntryDTO
                {
                    Id = s.Id,
                    EmployeeId = s.EmployeeId,
                    Date = s.Date,
                    Hours = s.Hours,
                    State = s.State,
                    DepartmentId = s.DepartmentId,
                    EmployeeName = s.Employee != null ? $"{s.Employee.FirstName} {s.Employee.LastName}" : null,
                    PositionTitle = s.Employee != null && s.Employee.Position != null ? s.Employee.Position.Title : null
                })
                .ToListAsync(cancellationToken);

            return Ok(entries);
        }

        // POST api/Schedule
        [HttpPost]
        public async Task<IActionResult> CreateOrUpdate([FromBody] ScheduleEntryDTO dto, CancellationToken cancellationToken = default)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Check for existing entry on same date/employee
            var existing = await _appDbContext.ScheduleEntries
                .FirstOrDefaultAsync(s => s.EmployeeId == dto.EmployeeId && s.Date.Date == dto.Date.Date, cancellationToken);

            if (existing != null)
            {
                // Update
                existing.Hours = dto.Hours;
                existing.State = dto.State;
                existing.DepartmentId = dto.DepartmentId;
                _appDbContext.Entry(existing).State = EntityState.Modified;
            }
            else
            {
                // Create
                var entry = new ScheduleEntry
                {
                    EmployeeId = dto.EmployeeId,
                    Date = dto.Date.Date,
                    Hours = dto.Hours,
                    State = dto.State,
                    DepartmentId = dto.DepartmentId
                };
                _appDbContext.ScheduleEntries.Add(entry);
            }

            await _appDbContext.SaveChangesAsync(cancellationToken);
            return Ok(new { message = "Schedule entry saved successfully" });
        }

        // DELETE api/Schedule/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken = default)
        {
            var entry = await _appDbContext.ScheduleEntries.FindAsync(new object[] { id }, cancellationToken);
            if (entry == null)
                return NotFound(new { message = $"Schedule entry {id} not found." });

            _appDbContext.ScheduleEntries.Remove(entry);
            await _appDbContext.SaveChangesAsync(cancellationToken);
            return NoContent();
        }
    }
}
