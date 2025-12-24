using EmployeeManager.API.Data;
using EmployeeManager.API.DTO;
using EmployeeManager.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManager.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DepartmentsController : ControllerBase
    {
        private readonly AppDbContext _appDbContext;

        public DepartmentsController(AppDbContext appDbContext)
        {
            _appDbContext = appDbContext;
        }

        private IQueryable<Department> GetDepartmentQuery()
        {
            return _appDbContext.Departments
                .Include(d => d.DepartmentPositions!)
                    .ThenInclude(dp => dp.Position)
                .Include(d => d.Employees!)
                    .ThenInclude(e => e.Position)
                .AsNoTracking();
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(CancellationToken cancellationToken = default)
        {
            var data = await GetDepartmentQuery()
                .OrderBy(d => d.Name)
                .Select(d => new DepartmentDTO
                {
                    Id = d.Id,
                    Name = d.Name,
                    Positions = d.DepartmentPositions!
                        .Select(dp => new PositionDTO
                        {
                            Id = dp.Position!.Id,
                            Title = dp.Position.Title                            
                        }).ToList(),

                    Employees = d.Employees!.Select(e => new EmployeeDTO
                    {
                        Id = e.Id,
                        FirstName = e.FirstName,
                        LastName = e.LastName,
                        PhoneNumber = e.PhoneNumber,
                        DepartmentId = e.DepartmentId,
                        DepartmentName = d.Name,
                        PositionId = e.PositionId,
                        PositionName = e.Position != null ? e.Position.Title : null
                    }).ToList(),

                    Equipments = d.Equipments!
                        .Select(eq => new EquipmentDTO
                        {
                            Id = eq.Id,
                            Name = eq.Name,
                            SerialNumber = eq.SerialNumber,
                            PurchaseDate = eq.PurchaseDate,
                            Status = eq.Status,
                            Description = eq.Description,
                            CategoryId = eq.CategoryId,
                            CategoryName = eq.Category!.Name,
                            DepartmentId = eq.DepartmentId,
                            DepartmentName = d.Name,
                        }).ToList()
                })
                .ToListAsync(cancellationToken);

            return Ok(data);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken = default)
        {
            var dep = await GetDepartmentQuery()
                .Where(d => d.Id == id)
                .Select(d => new DepartmentDTO
                {
                    Id = d.Id,
                    Name = d.Name,
                    Positions = d.DepartmentPositions!
                        .Select(dp => new PositionDTO
                        {
                            Id = dp.Position!.Id,
                            Title = dp.Position.Title
                        }).ToList(),

                    Employees = d.Employees!.Select(e => new EmployeeDTO
                    {
                        Id = e.Id,
                        FirstName = e.FirstName,
                        LastName = e.LastName,
                        PhoneNumber = e.PhoneNumber,
                        DepartmentId = e.DepartmentId,
                        DepartmentName = d.Name,
                        PositionId = e.PositionId,
                        PositionName = e.Position != null ? e.Position.Title : null
                    }).ToList(),

                    Equipments = d.Equipments!
                        .Select(eq => new EquipmentDTO
                        {
                            Id = eq.Id,
                            Name = eq.Name,
                            SerialNumber = eq.SerialNumber,
                            PurchaseDate = eq.PurchaseDate,
                            Status = eq.Status,
                            Description = eq.Description,
                            CategoryId = eq.CategoryId,
                            CategoryName = eq.Category!.Name,
                            DepartmentId = eq.DepartmentId,
                            DepartmentName = d.Name,
                        }).ToList()
                })
                .FirstOrDefaultAsync(cancellationToken);

            if (dep == null)
                return NotFound(new { message = $"Department with ID {id} not found." });

            return Ok(dep);
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

            var dep = new Department
            {
                Name = depDto.Name,
            };
            _appDbContext.Departments.Add(dep);
            await _appDbContext.SaveChangesAsync(cancellationToken);

            var createdDto = new DepartmentDTO { Id = dep.Id, Name = dep.Name };
            return CreatedAtAction(nameof(GetById), new { id = dep.Id }, createdDto);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] DepartmentDTO depDto, CancellationToken cancellationToken = default)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (string.IsNullOrWhiteSpace(depDto.Name))
            {
                return BadRequest(new { message = "Name is required." });
            }

            var dep = await _appDbContext.Departments.FindAsync(new object[] { id }, cancellationToken);
            if (dep == null)
                return NotFound(new { message = $"Department with ID {id} not found." });

            dep.Name = depDto.Name;

            await _appDbContext.SaveChangesAsync(cancellationToken);

            var updatedDto = new DepartmentDTO { Id = dep.Id, Name = dep.Name };
            return Ok(updatedDto);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken = default)
        {
            var dep = await _appDbContext.Departments
                .Include(d => d.Employees)
                .Include(d => d.Equipments)
                .Include(d => d.DepartmentPositions)
                .FirstOrDefaultAsync(d => d.Id == id, cancellationToken);
                
            if (dep == null)
                return NotFound(new { message = $"Department with ID {id} not found." });

            // Check for dependencies before attempting delete
            if (dep.Employees?.Any() == true)
            {
                return Conflict(new { message = $"Cannot delete department with {dep.Employees.Count} employee(s). Reassign employees first." });
            }
            
            if (dep.Equipments?.Any() == true)
            {
                return Conflict(new { message = $"Cannot delete department with {dep.Equipments.Count} equipment item(s). Reassign equipment first." });
            }
            
            if (dep.DepartmentPositions?.Any() == true)
            {
                return Conflict(new { message = $"Cannot delete department with {dep.DepartmentPositions.Count} position link(s). Remove positions first." });
            }

            try
            {
                _appDbContext.Departments.Remove(dep);
                await _appDbContext.SaveChangesAsync(cancellationToken);
                return NoContent();
            }
            catch (DbUpdateException ex)
            {
                // Conflict if employees or department positions are still linked
                if (ex.InnerException?.Message?.Contains("foreign key") == true || 
                    ex.InnerException?.Message?.Contains("The DELETE statement conflicted with the REFERENCE constraint") == true)
                {
                    return Conflict(new { message = "Cannot delete department with linked records (positions or employees)." });
                }
                return StatusCode(500, new { message = "Error deleting department.", detail = ex.Message });
            }
        }
    }
}