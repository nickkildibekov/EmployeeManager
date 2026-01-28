using EmployeeManager.API.Data;
using EmployeeManager.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManager.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EquipmentCategoriesController : ControllerBase
    {
        private readonly AppDbContext _appDbContext;

        public EquipmentCategoriesController(AppDbContext appDbContext)
        {
            _appDbContext = appDbContext;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(CancellationToken cancellationToken = default)
        {
            var categories = await _appDbContext.EquipmentCategories
                .AsNoTracking()
                .ToListAsync(cancellationToken);

            return Ok(categories);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] EquipmentCategory category, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(category.Name))
            {
                return BadRequest("Category name is required");
            }

            var newCategory = new EquipmentCategory
            {
                Name = category.Name,
                Description = category.Description ?? string.Empty
            };

            _appDbContext.EquipmentCategories.Add(newCategory);
            await _appDbContext.SaveChangesAsync(cancellationToken);

            return Ok(newCategory);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] EquipmentCategory category, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(category.Name))
            {
                return BadRequest("Category name is required");
            }

            var existingCategory = await _appDbContext.EquipmentCategories.FindAsync(new object[] { id }, cancellationToken);
            if (existingCategory == null)
            {
                return NotFound(new { message = $"Category with ID {id} not found." });
            }

            existingCategory.Name = category.Name;
            existingCategory.Description = category.Description ?? string.Empty;

            _appDbContext.Entry(existingCategory).State = EntityState.Modified;
            await _appDbContext.SaveChangesAsync(cancellationToken);

            return Ok(existingCategory);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken = default)
        {
            var category = await _appDbContext.EquipmentCategories
                .Include(c => c.Equipments)
                .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

            if (category == null)
            {
                return NotFound(new { message = $"Category with ID {id} not found." });
            }

            // Check if category is used by any equipment
            if (category.Equipments != null && category.Equipments.Any())
            {
                return Conflict(new { message = "Cannot delete category that is assigned to equipment." });
            }

            try
            {
                _appDbContext.EquipmentCategories.Remove(category);
                await _appDbContext.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete category with linked records." });
            }

            return NoContent();
        }
    }
}
