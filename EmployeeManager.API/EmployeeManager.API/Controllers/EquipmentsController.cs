using EmployeeManager.API.Data;
using EmployeeManager.API.DTO;
using EmployeeManager.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManager.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EquipmentController : ControllerBase
    {
        private readonly AppDbContext _appDbContext;

        public EquipmentController(AppDbContext appDbContext)
        {
            _appDbContext = appDbContext;
        }

        
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var equipmentList = await _appDbContext.Equipments
                .Include(e => e.Category)
                .Include(e => e.Department)
                .AsNoTracking()
                .Select(e => new EquipmentDTO
                {
                    Id = e.Id,
                    Name = e.Name,
                    SerialNumber = e.SerialNumber,
                    PurchaseDate = e.PurchaseDate,
                    IsWork = e.IsWork,
                    Description = e.Description,
                    CategoryId = e.CategoryId,
                    CategoryName = e.Category != null ? e.Category.Name : string.Empty,
                    DepartmentId = e.DepartmentId,
                    DepartmentName = e.Department != null ? e.Department.Name : string.Empty
                })
                .ToListAsync();

            return Ok(equipmentList);
        }

        
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var equipment = await _appDbContext.Equipments
                .Include(e => e.Category)
                .Include(e => e.Department)
                .AsNoTracking()
                .Where(e => e.Id == id)
                .Select(e => new EquipmentDTO
                {
                    Id = e.Id,
                    Name = e.Name,
                    SerialNumber = e.SerialNumber,
                    PurchaseDate = e.PurchaseDate,
                    IsWork = e.IsWork,
                    Description = e.Description,
                    CategoryId = e.CategoryId,
                    CategoryName = e.Category != null ? e.Category.Name : string.Empty,
                    DepartmentId = e.DepartmentId,
                    DepartmentName = e.Department != null ? e.Department.Name : string.Empty
                })
                .FirstOrDefaultAsync();

            if (equipment == null)
                return NotFound();

            return Ok(equipment);
        }

       
        [HttpPost]
        public async Task<IActionResult> Create(EquipmentDTO equipmentDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (!_appDbContext.EquipmentCategories.Any(c => c.Id == equipmentDto.CategoryId))
            {
                return BadRequest($"Category with ID {equipmentDto.CategoryId} does not exist.");
            }
            if (!_appDbContext.Departments.Any(d => d.Id == equipmentDto.DepartmentId))
            {
                return BadRequest($"Department with ID {equipmentDto.DepartmentId} does not exist.");
            }

            var equipment = new Equipment
            {
                Name = equipmentDto.Name,
                Description = equipmentDto.Description,
                SerialNumber = equipmentDto.SerialNumber,
                PurchaseDate = equipmentDto.PurchaseDate,
                IsWork = equipmentDto.IsWork,
                CategoryId = equipmentDto.CategoryId,
                DepartmentId = equipmentDto.DepartmentId
            };

            _appDbContext.Equipments.Add(equipment);
            await _appDbContext.SaveChangesAsync();

            
            var createdEquipmentDto = await _appDbContext.Equipments
                .Include(e => e.Category)
                .Include(e => e.Department)
                .AsNoTracking()
                .Where(e => e.Id == equipment.Id)
                .Select(e => new EquipmentDTO
                {
                    Id = e.Id,
                    Name = e.Name,
                    SerialNumber = e.SerialNumber,
                    PurchaseDate = e.PurchaseDate,
                    IsWork = e.IsWork,
                    Description = e.Description,
                    CategoryId = e.CategoryId,
                    CategoryName = e.Category != null ? e.Category.Name : string.Empty,
                    DepartmentId = e.DepartmentId,
                    DepartmentName = e.Department != null ? e.Department.Name : string.Empty
                })
                .FirstOrDefaultAsync();

            if (createdEquipmentDto == null)
            {
                return CreatedAtAction(nameof(GetById), new { id = equipment.Id }, equipmentDto);
            }

            return CreatedAtAction(nameof(GetById), new { id = equipment.Id }, createdEquipmentDto);
        }

        
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, EquipmentDTO equipmentDto)
        {
            if (id != equipmentDto.Id)
            {
                return BadRequest("ID mismatch.");
            }

            if (!_appDbContext.EquipmentCategories.Any(c => c.Id == equipmentDto.CategoryId) ||
                !_appDbContext.Departments.Any(d => d.Id == equipmentDto.DepartmentId))
            {
                return BadRequest("Invalid CategoryId or DepartmentId.");
            }

            var equipment = await _appDbContext.Equipments.FindAsync(id);

            if (equipment == null)
            {
                return NotFound();
            }

            equipment.Name = equipmentDto.Name;
            equipment.Description = equipmentDto.Description;
            equipment.SerialNumber = equipmentDto.SerialNumber;
            equipment.PurchaseDate = equipmentDto.PurchaseDate;
            equipment.IsWork = equipmentDto.IsWork;
            equipment.CategoryId = equipmentDto.CategoryId;
            equipment.DepartmentId = equipmentDto.DepartmentId;

            _appDbContext.Entry(equipment).State = EntityState.Modified;

            try
            {
                await _appDbContext.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_appDbContext.Equipments.Any(e => e.Id == id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

       
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id, [FromQuery] int? departmentId)
        {
            var equip = await _appDbContext.Equipments.FindAsync(id);
            if (equip == null)
                return NotFound();

            if (departmentId.HasValue && equip.DepartmentId != departmentId.Value)
            {
                return BadRequest(new { message = $"Equipment {id} does not belong to the specified department with id: {departmentId.Value}." });
            }

            try
            {
                _appDbContext.Equipments.Remove(equip);
                await _appDbContext.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete equipment with linked records." });
            }

            return NoContent();
        }
    }
}