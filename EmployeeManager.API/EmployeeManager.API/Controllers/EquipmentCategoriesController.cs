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
    }
}
