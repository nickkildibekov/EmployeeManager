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
        public async Task<IActionResult> GetAll(
            [FromQuery] int? departmentId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null,
            [FromQuery] bool? isWork = null,
            CancellationToken cancellationToken = default)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            var query = _appDbContext.Equipments
                .Include(e => e.Category)
                .Include(e => e.Department)
                .AsQueryable();

            // Filter by department if specified
            if (departmentId.HasValue && departmentId.Value > 0)
            {
                query = query.Where(e => e.DepartmentId == departmentId.Value);
            }

            // Search by name or serial number
            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchLower = search.ToLower();
                query = query.Where(e => 
                    e.Name.ToLower().Contains(searchLower) || 
                    e.SerialNumber.ToLower().Contains(searchLower));
            }

            if (isWork.HasValue)
            {
                query = query.Where(e => e.IsWork == isWork.Value);
            }

            var totalCount = await query.CountAsync(cancellationToken);

            var equipmentList = await query
                .OrderBy(e => e.Name)
                .AsNoTracking()
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
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
                .ToListAsync(cancellationToken);

            return Ok(new { items = equipmentList, total = totalCount });
        }

        
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken = default)
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
                .FirstOrDefaultAsync(cancellationToken);

            if (equipment == null)
                return NotFound(new { message = $"Equipment with ID {id} not found." });

            return Ok(equipment);
        }

       
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] EquipmentDTO equipmentDto, CancellationToken cancellationToken = default)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (string.IsNullOrWhiteSpace(equipmentDto.Name) || string.IsNullOrWhiteSpace(equipmentDto.SerialNumber))
            {
                return BadRequest(new { message = "Name and SerialNumber are required." });
            }

            // Check for duplicate serial number
            var existingSerial = await _appDbContext.Equipments
                .AnyAsync(e => e.SerialNumber == equipmentDto.SerialNumber, cancellationToken);
            
            if (existingSerial)
            {
                return Conflict(new { message = $"Equipment with serial number '{equipmentDto.SerialNumber}' already exists." });
            }

            if (!await _appDbContext.EquipmentCategories.AnyAsync(c => c.Id == equipmentDto.CategoryId, cancellationToken))
            {
                return BadRequest(new { message = $"Category with ID {equipmentDto.CategoryId} does not exist." });
            }
            if (!await _appDbContext.Departments.AnyAsync(d => d.Id == equipmentDto.DepartmentId, cancellationToken))
            {
                return BadRequest(new { message = $"Department with ID {equipmentDto.DepartmentId} does not exist." });
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
            await _appDbContext.SaveChangesAsync(cancellationToken);

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
                .FirstOrDefaultAsync(cancellationToken);

            return CreatedAtAction(nameof(GetById), new { id = equipment.Id }, createdEquipmentDto);
        }

        
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] EquipmentDTO equipmentDto, CancellationToken cancellationToken = default)
        {
            if (id != equipmentDto.Id)
            {
                return BadRequest(new { message = "ID mismatch." });
            }

            if (string.IsNullOrWhiteSpace(equipmentDto.Name) || string.IsNullOrWhiteSpace(equipmentDto.SerialNumber))
            {
                return BadRequest(new { message = "Name and SerialNumber are required." });
            }

            // Check for duplicate serial number (excluding current equipment)
            var existingSerial = await _appDbContext.Equipments
                .AnyAsync(e => e.SerialNumber == equipmentDto.SerialNumber && e.Id != id, cancellationToken);
            
            if (existingSerial)
            {
                return Conflict(new { message = $"Another equipment with serial number '{equipmentDto.SerialNumber}' already exists." });
            }

            if (!await _appDbContext.EquipmentCategories.AnyAsync(c => c.Id == equipmentDto.CategoryId, cancellationToken) ||
                !await _appDbContext.Departments.AnyAsync(d => d.Id == equipmentDto.DepartmentId, cancellationToken))
            {
                return BadRequest(new { message = "Invalid CategoryId or DepartmentId." });
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
                await _appDbContext.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await _appDbContext.Equipments.AnyAsync(e => e.Id == id, cancellationToken))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            var updatedDto = await _appDbContext.Equipments
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
                .FirstOrDefaultAsync(cancellationToken);

            return Ok(updatedDto);
        }

       
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id, [FromQuery] int? departmentId, CancellationToken cancellationToken = default)
        {
            var equip = await _appDbContext.Equipments.FindAsync(new object[] { id }, cancellationToken);
            if (equip == null)
                return NotFound(new { message = $"Equipment with ID {id} not found." });

            if (departmentId.HasValue && equip.DepartmentId != departmentId.Value)
            {
                return BadRequest(new { message = $"Equipment {id} does not belong to the specified department with id: {departmentId.Value}." });
            }

            try
            {
                _appDbContext.Equipments.Remove(equip);
                await _appDbContext.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete equipment with linked records." });
            }

            return NoContent();
        }
    }
}