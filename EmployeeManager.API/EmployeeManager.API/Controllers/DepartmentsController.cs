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
        public async Task<IActionResult> GetAll()
        {
            var data = await GetDepartmentQuery()
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
                    }).ToList(),

                    Equipments = d.Equipments!
                        .Select(eq => new EquipmentDTO
                        {
                            Id = eq.Id,
                            Name = eq.Name,
                            SerialNumber = eq.SerialNumber,
                            PurchaseDate = eq.PurchaseDate,
                            IsWork = eq.IsWork,
                            Description = eq.Description,
                            CategoryId = eq.CategoryId,
                            CategoryName = eq.Category!.Name,
                            DepartmentId = eq.DepartmentId,
                            DepartmentName = d.Name,
                        }).ToList()
                })
                .ToListAsync();

            return Ok(data);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
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
                        PositionId = e.PositionId
                    }).ToList(),

                    Equipments = d.Equipments!
                        .Select(eq => new EquipmentDTO
                        {
                            Id = eq.Id,
                            Name = eq.Name,
                            SerialNumber = eq.SerialNumber,
                            PurchaseDate = eq.PurchaseDate,
                            IsWork = eq.IsWork,
                            Description = eq.Description,
                            CategoryId = eq.CategoryId,
                            CategoryName = eq.Category!.Name,
                            DepartmentId = eq.DepartmentId,
                            DepartmentName = d.Name,
                        }).ToList()
                })
                .FirstOrDefaultAsync();

            if (dep == null) return NotFound();

            return Ok(dep);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] DepartmentDTO depDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var dep = new Department
            {
                Name = depDto.Name,
            };
            _appDbContext.Departments.Add(dep);
            await _appDbContext.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = dep.Id }, dep);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] DepartmentDTO depDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var dep = await _appDbContext.Departments.FindAsync(id);
            if (dep == null) return NotFound();

            dep.Name = depDto.Name;

            await _appDbContext.SaveChangesAsync();
            return Ok(dep);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var dep = await _appDbContext.Departments.FindAsync(id);
            if (dep == null) return NotFound();

            try
            {
                _appDbContext.Departments.Remove(dep);
                await _appDbContext.SaveChangesAsync();
                return NoContent();
            }
            catch (DbUpdateException ex)
            {
                // Conflict if employees or department positions are still linked
                if (ex.InnerException?.Message?.Contains("foreign key") == true || ex.InnerException?.Message?.Contains("The DELETE statement conflicted with the REFERENCE constraint") == true)
                {
                    return Conflict(new { message = "Cannot delete department with linked records (positions or employees)." });
                }
                throw;
            }
        }
    }
}