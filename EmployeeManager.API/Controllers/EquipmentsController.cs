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
            [FromQuery] Guid? departmentId,
            [FromQuery] Guid? categoryId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null,
            [FromQuery] string? status = null,
            [FromQuery] string? measurement = null,
            [FromQuery] string sortBy = "name",
            [FromQuery] string sortOrder = "asc",
            CancellationToken cancellationToken = default)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            var query = _appDbContext.Equipments
                .Include(e => e.Category)
                .Include(e => e.Department)
                .Include(e => e.ResponsibleEmployee)
                .AsQueryable();

            // Filter by department if specified
            if (departmentId.HasValue)
            {
                query = query.Where(e => e.DepartmentId == departmentId.Value);
            }

            // Filter by category if specified
            if (categoryId.HasValue)
            {
                query = query.Where(e => e.CategoryId == categoryId.Value);
            }

            // Search by name or serial number
            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchLower = search.ToLower();
                query = query.Where(e =>
                    (e.Name != null && e.Name.ToLower().Contains(searchLower)) ||
                    (e.SerialNumber != null && e.SerialNumber.ToLower().Contains(searchLower)));
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                var normalizedStatus = status.Trim();
                query = query.Where(e => e.Status == normalizedStatus);
            }

            if (!string.IsNullOrWhiteSpace(measurement))
            {
                var normalizedMeasurement = measurement.Trim();
                query = query.Where(e => e.Measurement == normalizedMeasurement);
            }

            var totalCount = await query.CountAsync(cancellationToken);

            // Apply sorting
            if (!string.IsNullOrWhiteSpace(sortBy))
            {
                query = sortBy.ToLower() switch
                {
                    "name" => sortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase)
                        ? query.OrderByDescending(e => e.Name)
                        : query.OrderBy(e => e.Name),
                    "serialnumber" => sortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase)
                        ? query.OrderByDescending(e => e.SerialNumber)
                        : query.OrderBy(e => e.SerialNumber),
                    "category" => sortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase)
                        ? query.OrderByDescending(e => e.Category != null ? e.Category.Name : string.Empty)
                        : query.OrderBy(e => e.Category != null ? e.Category.Name : string.Empty),
                    "purchasedate" => sortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase)
                        ? query.OrderByDescending(e => e.PurchaseDate)
                        : query.OrderBy(e => e.PurchaseDate),
                    "status" => sortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase)
                        ? query.OrderByDescending(e => e.Status)
                        : query.OrderBy(e => e.Status),
                    "measurement" => sortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase)
                        ? query.OrderByDescending(e => e.Measurement)
                        : query.OrderBy(e => e.Measurement),
                    "amount" => sortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase)
                        ? query.OrderByDescending(e => e.Amount)
                        : query.OrderBy(e => e.Amount),
                    "department" => sortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase)
                        ? query.OrderByDescending(e => e.Department != null ? e.Department.Name : "Warehouse")
                        : query.OrderBy(e => e.Department != null ? e.Department.Name : "Warehouse"),
                    _ => query.OrderBy(e => e.Name)
                };
            }
            else
            {
                query = query.OrderBy(e => e.Name);
            }

            var equipmentList = await query
                .AsNoTracking()
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(e => new EquipmentDTO
                {
                    Id = e.Id,
                    Name = e.Name,
                    SerialNumber = e.SerialNumber,
                    PurchaseDate = e.PurchaseDate,
                    Status = e.Status,
                    Measurement = e.Measurement,
                    Amount = e.Amount,
                    Description = e.Description,
                    CategoryId = e.CategoryId,
                    CategoryName = e.Category != null ? e.Category.Name : string.Empty,
                    DepartmentId = e.DepartmentId,
                    DepartmentName = e.Department != null ? e.Department.Name : "Warehouse",
                    ImageData = e.ImageData
                })
                .ToListAsync(cancellationToken);

            return Ok(new { items = equipmentList, total = totalCount });
        }

        
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken = default)
        {
            var equipment = await _appDbContext.Equipments
                .Include(e => e.Category)
                .Include(e => e.Department)
                .Include(e => e.ResponsibleEmployee)
                .AsNoTracking()
                .Where(e => e.Id == id)
                .Select(e => new EquipmentDTO
                {
                    Id = e.Id,
                    Name = e.Name,
                    SerialNumber = e.SerialNumber,
                    PurchaseDate = e.PurchaseDate,
                    Status = e.Status,
                    Measurement = e.Measurement,
                    Amount = e.Amount,
                    Description = e.Description,
                    CategoryId = e.CategoryId,
                    CategoryName = e.Category != null ? e.Category.Name : string.Empty,
                    DepartmentId = e.DepartmentId,
                    DepartmentName = e.Department != null ? e.Department.Name : "Warehouse",
                    ImageData = e.ImageData,
                    ResponsibleEmployeeId = e.ResponsibleEmployeeId,
                    ResponsibleEmployeeName = e.ResponsibleEmployee != null ? e.ResponsibleEmployee.CallSign : null
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

            if (string.IsNullOrWhiteSpace(equipmentDto.Name))
            {
                return BadRequest(new { message = "Name is required." });
            }

            // Check for duplicate serial number (only if provided)
            if (!string.IsNullOrWhiteSpace(equipmentDto.SerialNumber))
            {
                var existingSerial = await _appDbContext.Equipments
                    .AnyAsync(e => e.SerialNumber == equipmentDto.SerialNumber, cancellationToken);
            
                if (existingSerial)
                {
                    return Conflict(new { message = $"Equipment with serial number '{equipmentDto.SerialNumber}' already exists." });
                }
            }

            if (!await _appDbContext.EquipmentCategories.AnyAsync(c => c.Id == equipmentDto.CategoryId, cancellationToken))
            {
                return BadRequest(new { message = $"Category with ID {equipmentDto.CategoryId} does not exist." });
            }
            
            // Get or create Reserve department
            var reserveDept = await _appDbContext.Departments
                .FirstOrDefaultAsync(d => d.Name == "Reserve" || d.Name == "Резерв" || d.Name == "Global Reserve", cancellationToken);
            
            if (reserveDept == null)
            {
                reserveDept = new Department { Name = "Reserve" };
                _appDbContext.Departments.Add(reserveDept);
                await _appDbContext.SaveChangesAsync(cancellationToken);
            }
            
            // If DepartmentId is not provided, assign to Reserve
            Guid? departmentId = equipmentDto.DepartmentId ?? reserveDept.Id;
            
            // Validate DepartmentId
            if (!await _appDbContext.Departments.AnyAsync(d => d.Id == departmentId.Value, cancellationToken))
            {
                return BadRequest(new { message = $"Department with ID {departmentId.Value} does not exist." });
            }

            // Validate ResponsibleEmployeeId if provided
            if (equipmentDto.ResponsibleEmployeeId.HasValue)
            {
                var employeeExists = await _appDbContext.Employees
                    .AnyAsync(e => e.Id == equipmentDto.ResponsibleEmployeeId.Value, cancellationToken);
                
                if (!employeeExists)
                {
                    return BadRequest(new { message = $"Employee with ID {equipmentDto.ResponsibleEmployeeId.Value} does not exist." });
                }
            }

            var equipment = new Equipment
            {
                Name = equipmentDto.Name,
                Description = equipmentDto.Description,
                SerialNumber = equipmentDto.SerialNumber,
                PurchaseDate = equipmentDto.PurchaseDate,
                Status = equipmentDto.Status,
                Measurement = equipmentDto.Measurement,
                Amount = equipmentDto.Amount,
                ImageData = equipmentDto.ImageData,
                CategoryId = equipmentDto.CategoryId,
                DepartmentId = departmentId,
                ResponsibleEmployeeId = equipmentDto.ResponsibleEmployeeId
            };

            _appDbContext.Equipments.Add(equipment);
            await _appDbContext.SaveChangesAsync(cancellationToken);

            var createdEquipmentDto = await _appDbContext.Equipments
                .Include(e => e.Category)
                .Include(e => e.Department)
                .Include(e => e.ResponsibleEmployee)
                .AsNoTracking()
                .Where(e => e.Id == equipment.Id)
                .Select(e => new EquipmentDTO
                {
                    Id = e.Id,
                    Name = e.Name,
                    SerialNumber = e.SerialNumber,
                    PurchaseDate = e.PurchaseDate,
                    Status = e.Status,
                    Measurement = e.Measurement,
                    Amount = e.Amount,
                    Description = e.Description,
                    CategoryId = e.CategoryId,
                    CategoryName = e.Category != null ? e.Category.Name : string.Empty,
                    DepartmentId = e.DepartmentId,
                    DepartmentName = e.Department != null ? e.Department.Name : "Warehouse",
                    ImageData = e.ImageData,
                    ResponsibleEmployeeId = e.ResponsibleEmployeeId,
                    ResponsibleEmployeeName = e.ResponsibleEmployee != null ? e.ResponsibleEmployee.CallSign : null
                })
                .FirstOrDefaultAsync(cancellationToken);

            return CreatedAtAction(nameof(GetById), new { id = equipment.Id }, createdEquipmentDto);
        }

        
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] EquipmentDTO equipmentDto, CancellationToken cancellationToken = default)
        {
            if (id != equipmentDto.Id)
            {
                return BadRequest(new { message = "ID mismatch." });
            }

            if (string.IsNullOrWhiteSpace(equipmentDto.Name))
            {
                return BadRequest(new { message = "Name is required." });
            }

            // Check for duplicate serial number (excluding current equipment, only if provided)
            if (!string.IsNullOrWhiteSpace(equipmentDto.SerialNumber))
            {
                var existingSerial = await _appDbContext.Equipments
                    .AnyAsync(e => e.SerialNumber == equipmentDto.SerialNumber && e.Id != id, cancellationToken);
            
                if (existingSerial)
                {
                    return Conflict(new { message = $"Another equipment with serial number '{equipmentDto.SerialNumber}' already exists." });
                }
            }

            if (!await _appDbContext.EquipmentCategories.AnyAsync(c => c.Id == equipmentDto.CategoryId, cancellationToken))
            {
                return BadRequest(new { message = $"Category with ID {equipmentDto.CategoryId} does not exist." });
            }
            
            // Get or create Reserve department
            var reserveDept = await _appDbContext.Departments
                .FirstOrDefaultAsync(d => d.Name == "Reserve" || d.Name == "Резерв" || d.Name == "Global Reserve", cancellationToken);
            
            if (reserveDept == null)
            {
                reserveDept = new Department { Name = "Reserve" };
                _appDbContext.Departments.Add(reserveDept);
                await _appDbContext.SaveChangesAsync(cancellationToken);
            }
            
            // If DepartmentId is not provided, assign to Reserve
            Guid? departmentId = equipmentDto.DepartmentId ?? reserveDept.Id;
            
            // Validate DepartmentId
            if (!await _appDbContext.Departments.AnyAsync(d => d.Id == departmentId.Value, cancellationToken))
            {
                return BadRequest(new { message = $"Department with ID {departmentId.Value} does not exist." });
            }

            // Validate ResponsibleEmployeeId if provided
            if (equipmentDto.ResponsibleEmployeeId.HasValue)
            {
                var employeeExists = await _appDbContext.Employees
                    .AnyAsync(e => e.Id == equipmentDto.ResponsibleEmployeeId.Value, cancellationToken);
                
                if (!employeeExists)
                {
                    return BadRequest(new { message = $"Employee with ID {equipmentDto.ResponsibleEmployeeId.Value} does not exist." });
                }
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
            equipment.Status = equipmentDto.Status;
            equipment.Measurement = equipmentDto.Measurement;
            equipment.Amount = equipmentDto.Amount;
            equipment.ImageData = equipmentDto.ImageData;
            equipment.CategoryId = equipmentDto.CategoryId;
            equipment.DepartmentId = departmentId;
            equipment.ResponsibleEmployeeId = equipmentDto.ResponsibleEmployeeId;

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
                .Include(e => e.ResponsibleEmployee)
                .AsNoTracking()
                .Where(e => e.Id == id)
                .Select(e => new EquipmentDTO
                {
                    Id = e.Id,
                    Name = e.Name,
                    SerialNumber = e.SerialNumber,
                    PurchaseDate = e.PurchaseDate,
                    Status = e.Status,
                    Measurement = e.Measurement,
                    Amount = e.Amount,
                    Description = e.Description,
                    CategoryId = e.CategoryId,
                    CategoryName = e.Category != null ? e.Category.Name : string.Empty,
                    DepartmentId = e.DepartmentId,
                    DepartmentName = e.Department != null ? e.Department.Name : "Warehouse",
                    ImageData = e.ImageData,
                    ResponsibleEmployeeId = e.ResponsibleEmployeeId,
                    ResponsibleEmployeeName = e.ResponsibleEmployee != null ? e.ResponsibleEmployee.CallSign : null
                })
                .FirstOrDefaultAsync(cancellationToken);

            return Ok(updatedDto);
        }

       
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id, [FromQuery] Guid? departmentId, CancellationToken cancellationToken = default)
        {
            var equip = await _appDbContext.Equipments.FindAsync(new object[] { id }, cancellationToken);
            if (equip == null)
                return NotFound(new { message = $"Equipment with ID {id} not found." });

            if (departmentId.HasValue && equip.DepartmentId != departmentId.Value)
            {
                return BadRequest(new { message = $"Equipment {id} does not belong to the specified department with id: {departmentId.Value}." });
            }

            // Get or create Reserve department
            var reserveDept = await _appDbContext.Departments
                .FirstOrDefaultAsync(d => d.Name == "Reserve" || d.Name == "Резерв" || d.Name == "Global Reserve", cancellationToken);
            
            if (reserveDept == null)
            {
                reserveDept = new Department { Name = "Reserve" };
                _appDbContext.Departments.Add(reserveDept);
                await _appDbContext.SaveChangesAsync(cancellationToken);
            }

            // If equipment is already in Reserve department, delete it permanently
            if (equip.DepartmentId == reserveDept.Id)
            {
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

            // Otherwise, move equipment to Reserve department instead of deleting
            equip.DepartmentId = reserveDept.Id;
            _appDbContext.Entry(equip).State = EntityState.Modified;

            try
            {
                await _appDbContext.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot move equipment to Reserve department." });
            }

            // Return the updated equipment DTO
            var updatedDto = await _appDbContext.Equipments
                .Include(e => e.Category)
                .Include(e => e.Department)
                .Include(e => e.ResponsibleEmployee)
                .AsNoTracking()
                .Where(e => e.Id == id)
                .Select(e => new EquipmentDTO
                {
                    Id = e.Id,
                    Name = e.Name,
                    SerialNumber = e.SerialNumber,
                    PurchaseDate = e.PurchaseDate,
                    Status = e.Status,
                    Measurement = e.Measurement,
                    Amount = e.Amount,
                    Description = e.Description,
                    CategoryId = e.CategoryId,
                    CategoryName = e.Category != null ? e.Category.Name : string.Empty,
                    DepartmentId = e.DepartmentId,
                    DepartmentName = e.Department != null ? e.Department.Name : "Warehouse",
                    ImageData = e.ImageData,
                    ResponsibleEmployeeId = e.ResponsibleEmployeeId,
                    ResponsibleEmployeeName = e.ResponsibleEmployee != null ? e.ResponsibleEmployee.CallSign : null
                })
                .FirstOrDefaultAsync(cancellationToken);

            return Ok(new { message = "Equipment moved to Reserve department.", equipment = updatedDto });
        }
    }
}
