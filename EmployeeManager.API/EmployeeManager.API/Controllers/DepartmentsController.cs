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

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var data = await _appDbContext.Departments
                .Include(d => d.Positions)
                .Include(d => d.Employees)
                .AsNoTracking()
                .ToListAsync();
            return Ok(data);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var dep = await _appDbContext.Departments
                .Include(d => d.Positions)
                .Include(d => d.Employees)
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.Id == id);

            if (dep == null) return NotFound();

            return Ok(dep);
        }

         [HttpPost]
        public async Task<IActionResult> Create( DepartmentDTO depDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var dep = new Department
            {
                Name = depDto.Name,
                Description = depDto.Description ?? string.Empty
            };
            _appDbContext.Departments.Add(dep);
            await _appDbContext.SaveChangesAsync();

            // Return 201 Created with route to new resource
            return Ok(dep);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, DepartmentDTO depDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var dep = await _appDbContext.Departments.FindAsync(id);
            if (dep == null) return NotFound();

            dep.Name = depDto.Name;
            dep.Description = depDto.Description ?? string.Empty;

            await _appDbContext.SaveChangesAsync();
            return Ok(dep);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var dep = await _appDbContext.Departments.FindAsync(id);
            if (dep == null) return NotFound();

            _appDbContext.Departments.Remove(dep);
            await _appDbContext.SaveChangesAsync();
            return Ok();
        }
    }
}

