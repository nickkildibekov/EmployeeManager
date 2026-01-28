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
            [FromQuery] Guid? departmentId,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] Guid? positionId,
            [FromQuery] string? state,
            CancellationToken cancellationToken = default)
        {
            var query = _appDbContext.ScheduleEntries
                .Include(s => s.Employee)
                .ThenInclude(e => e!.Position)
                .Include(s => s.Department)
                .AsQueryable();

            if (departmentId.HasValue)
                query = query.Where(s => s.DepartmentId == departmentId.Value);

            // Filter by date range: include entries that partially overlap with the requested range
            // This allows overnight shifts to be visible even if they only partially fall within the range
            if (startDate.HasValue && endDate.HasValue)
            {
                // Entry overlaps if: (entry.StartTime < endDate) AND (entry.EndTime > startDate)
                query = query.Where(s => s.StartTime < endDate.Value && s.EndTime > startDate.Value);
            }
            else if (startDate.HasValue)
            {
                // Only start date: show entries that start on or after this date
                query = query.Where(s => s.StartTime >= startDate.Value);
            }
            else if (endDate.HasValue)
            {
                // Only end date: show entries that end on or before this date
                query = query.Where(s => s.EndTime <= endDate.Value);
            }

            if (positionId.HasValue)
                query = query.Where(s => s.Employee != null && s.Employee.PositionId == positionId.Value);

            if (!string.IsNullOrWhiteSpace(state))
                query = query.Where(s => s.State == state);

            var entries = await query
                .AsNoTracking()
                .Select(s => new ScheduleEntryDTO
                {
                    Id = s.Id,
                    EmployeeId = s.EmployeeId,
                    StartTime = s.StartTime,
                    EndTime = s.EndTime,
                    Hours = s.Hours,
                    State = s.State,
                    DepartmentId = s.DepartmentId,
                    EmployeeName = s.Employee != null
                        ? $"{(s.Employee.FirstName ?? string.Empty)} {(s.Employee.LastName ?? string.Empty)}"
                        : null,
                    PositionTitle = s.Employee != null && s.Employee.Position != null ? s.Employee.Position.Title : null,
                    DepartmentName = s.Department != null ? s.Department.Name : null
                })
                .ToListAsync(cancellationToken);

            return Ok(entries);
        }

        // GET api/Schedule/timeline - Returns schedule entries formatted for timeline view
        [HttpGet("timeline")]
        public async Task<IActionResult> GetTimeline(
            [FromQuery] Guid? departmentId,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] Guid? positionId,
            [FromQuery] string? state,
            CancellationToken cancellationToken = default)
        {
            // Same logic as GetEntries, but explicitly for timeline view
            return await GetEntries(departmentId, startDate, endDate, positionId, state, cancellationToken);
        }

        // GET api/Schedule/now - Returns employees currently on shift
        [HttpGet("now")]
        public async Task<IActionResult> GetCurrentShifts(CancellationToken cancellationToken = default)
        {
            var now = DateTime.Now;

            var entries = await _appDbContext.ScheduleEntries
                .Include(s => s.Employee)
                .ThenInclude(e => e!.Position)
                .Include(s => s.Department)
                .Where(s => s.StartTime <= now && s.EndTime >= now)
                .AsNoTracking()
                .Select(s => new ScheduleEntryDTO
                {
                    Id = s.Id,
                    EmployeeId = s.EmployeeId,
                    StartTime = s.StartTime,
                    EndTime = s.EndTime,
                    Hours = s.Hours,
                    State = s.State,
                    DepartmentId = s.DepartmentId,
                    EmployeeName = s.Employee != null
                        ? $"{(s.Employee.FirstName ?? string.Empty)} {(s.Employee.LastName ?? string.Empty)}"
                        : null,
                    PositionTitle = s.Employee != null && s.Employee.Position != null ? s.Employee.Position.Title : null,
                    DepartmentName = s.Department != null ? s.Department.Name : null
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

            // Validate EndTime is after StartTime (using absolute timestamp comparison)
            // This allows overnight shifts where EndTime is on the next day
            if (dto.EndTime <= dto.StartTime)
            {
                return BadRequest(new { message = "EndTime must be after StartTime" });
            }

            // Validate Employee exists
            var employeeExists = await _appDbContext.Employees
                .AnyAsync(e => e.Id == dto.EmployeeId, cancellationToken);
            if (!employeeExists)
            {
                return BadRequest(new { message = $"Employee with ID {dto.EmployeeId} does not exist." });
            }

            // Validate Department exists
            var departmentExists = await _appDbContext.Departments
                .AnyAsync(d => d.Id == dto.DepartmentId, cancellationToken);
            if (!departmentExists)
            {
                return BadRequest(new { message = $"Department with ID {dto.DepartmentId} does not exist." });
            }

            // Validate Employee belongs to the specified Department (optional check - can be relaxed if needed)
            var employee = await _appDbContext.Employees
                .FirstOrDefaultAsync(e => e.Id == dto.EmployeeId, cancellationToken);
            if (employee != null && employee.DepartmentId.HasValue && employee.DepartmentId.Value != dto.DepartmentId)
            {
                // This is a warning, but we'll allow it in case employee is temporarily assigned to different department
                // Just log it, don't block the operation
            }

            // Calculate Hours automatically
            var hours = (decimal)(dto.EndTime - dto.StartTime).TotalHours;

            ScheduleEntry? entry;
            if (dto.Id != Guid.Empty)
            {
                // Update existing entry
                entry = await _appDbContext.ScheduleEntries.FindAsync(new object[] { dto.Id }, cancellationToken);
                if (entry == null)
                    return NotFound(new { message = $"Schedule entry {dto.Id} not found." });

                // Validate EmployeeId if it's being changed
                if (entry.EmployeeId != dto.EmployeeId)
                {
                    var newEmployeeExists = await _appDbContext.Employees
                        .AnyAsync(e => e.Id == dto.EmployeeId, cancellationToken);
                    if (!newEmployeeExists)
                    {
                        return BadRequest(new { message = $"Employee with ID {dto.EmployeeId} does not exist." });
                    }
                }

                entry.EmployeeId = dto.EmployeeId;
                entry.StartTime = dto.StartTime;
                entry.EndTime = dto.EndTime;
                entry.Hours = hours; // Automatically calculated
                entry.State = dto.State;
                entry.DepartmentId = dto.DepartmentId;
                _appDbContext.Entry(entry).State = EntityState.Modified;
            }
            else
            {
                // Create new entry
                entry = new ScheduleEntry
                {
                    EmployeeId = dto.EmployeeId,
                    StartTime = dto.StartTime,
                    EndTime = dto.EndTime,
                    Hours = hours, // Automatically calculated
                    State = dto.State,
                    DepartmentId = dto.DepartmentId
                };
                _appDbContext.ScheduleEntries.Add(entry);
            }

            try
            {
                await _appDbContext.SaveChangesAsync(cancellationToken);
                
                // Reload entry to get computed properties
                await _appDbContext.Entry(entry).ReloadAsync(cancellationToken);
                
                // Return the created/updated entry data
                var resultDto = new ScheduleEntryDTO
                {
                    Id = entry.Id,
                    EmployeeId = entry.EmployeeId,
                    StartTime = entry.StartTime,
                    EndTime = entry.EndTime,
                    Hours = entry.Hours,
                    State = entry.State,
                    DepartmentId = entry.DepartmentId
                };
                
                return Ok(new { message = "Schedule entry saved successfully", id = entry.Id, entry = resultDto });
            }
            catch (DbUpdateException dbEx)
            {
                // Log the actual database error for debugging
                var errorMessage = "Cannot complete operation due to database constraint.";
                
                // Try to extract more specific error information
                if (dbEx.InnerException != null)
                {
                    var innerMessage = dbEx.InnerException.Message;
                    if (innerMessage.Contains("FOREIGN KEY"))
                    {
                        if (innerMessage.Contains("EmployeeId") || innerMessage.Contains("Employees"))
                        {
                            errorMessage = $"Employee with ID {dto.EmployeeId} does not exist or cannot be used.";
                        }
                        else if (innerMessage.Contains("DepartmentId") || innerMessage.Contains("Departments"))
                        {
                            errorMessage = $"Department with ID {dto.DepartmentId} does not exist or cannot be used.";
                        }
                    }
                }
                
                return Conflict(new { message = errorMessage });
            }
        }

        // DELETE api/Schedule/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken = default)
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
