using EmployeeManager.API.Data;
using EmployeeManager.API.DTO;
using EmployeeManager.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace EmployeeManager.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FuelPaymentsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _environment;
        private readonly ILogger<FuelPaymentsController> _logger;

        public FuelPaymentsController(
            AppDbContext context,
            IWebHostEnvironment environment,
            ILogger<FuelPaymentsController> logger)
        {
            _context = context;
            _environment = environment;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] Guid? departmentId,
            [FromQuery] FuelType? fuelType,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            CancellationToken cancellationToken = default)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            var query = _context.FuelPayments
                .Include(p => p.Department)
                .Include(p => p.ResponsibleEmployee)
                .Include(p => p.Equipment)
                .AsQueryable();

            if (departmentId.HasValue)
            {
                query = query.Where(p => p.DepartmentId == departmentId.Value);
            }

            if (fuelType.HasValue)
            {
                query = query.Where(p => p.FuelType == fuelType.Value);
            }

            var totalCount = await query.CountAsync(cancellationToken);

            var payments = await query
                .OrderByDescending(p => p.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new FuelPaymentDTO
                {
                    Id = p.Id,
                    DepartmentId = p.DepartmentId,
                    DepartmentName = p.Department.Name,
                    ResponsibleEmployeeId = p.ResponsibleEmployeeId,
                    ResponsibleEmployeeName = p.ResponsibleEmployee != null ? p.ResponsibleEmployee.CallSign : null,
                    EquipmentId = p.EquipmentId,
                    EquipmentName = p.Equipment.Name,
                    EntryDate = p.EntryDate,
                    PreviousMileage = p.PreviousMileage,
                    CurrentMileage = p.CurrentMileage,
                    PricePerLiter = p.PricePerLiter,
                    FuelType = p.FuelType,
                    FuelTypeName = p.FuelType == FuelType.Gasoline ? "Бензин" : "Дізель",
                    TotalAmount = p.TotalAmount,
                    OdometerImageUrl = p.OdometerImageUrl,
                    CreatedAt = p.CreatedAt
                })
                .ToListAsync(cancellationToken);

            return Ok(new { items = payments, total = totalCount });
        }

        [HttpGet("statistics")]
        public async Task<IActionResult> GetStatistics(
            [FromQuery] Guid? departmentId,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            CancellationToken cancellationToken = default)
        {
            // If dates are not provided, use default range (last 12 months from latest payment)
            if (!startDate.HasValue || !endDate.HasValue)
            {
                var latestPaymentDate = await _context.FuelPayments
                    .OrderByDescending(p => p.EntryDate)
                    .Select(p => p.EntryDate)
                    .FirstOrDefaultAsync(cancellationToken);

                if (latestPaymentDate == default(DateTime))
                {
                    return Ok(new FuelPaymentStatisticsDTO
                    {
                        MonthlyExpenses = new List<FuelPaymentStatisticsDTO.MonthlyDataPoint>(),
                        MonthlyConsumption = new List<FuelPaymentStatisticsDTO.MonthlyDataPoint>()
                    });
                }

                var endMonth = new DateTime(latestPaymentDate.Year, latestPaymentDate.Month, 1);
                startDate = endMonth.AddMonths(-11); // Last 12 months including the latest month
                endDate = endMonth.AddMonths(1); // Exclusive end date (first day of next month)
            }

            // Normalize dates to first day of month for comparison
            var startDateNormalized = new DateTime(startDate.Value.Year, startDate.Value.Month, 1);
            var endDateExclusive = new DateTime(endDate.Value.Year, endDate.Value.Month, 1).AddMonths(1);

            var query = _context.FuelPayments
                .Where(p => p.EntryDate >= startDateNormalized && 
                           p.EntryDate < endDateExclusive);

            if (departmentId.HasValue)
            {
                query = query.Where(p => p.DepartmentId == departmentId.Value);
            }

            var payments = await query
                .OrderBy(p => p.EntryDate)
                .Select(p => new
                {
                    EntryDate = p.EntryDate,
                    TotalAmount = p.TotalAmount,
                    Mileage = p.CurrentMileage - p.PreviousMileage
                })
                .ToListAsync(cancellationToken);

            // Group by month and calculate totals
            var monthlyExpenses = payments
                .GroupBy(p => new { Year = p.EntryDate.Year, Month = p.EntryDate.Month })
                .Select(g => new FuelPaymentStatisticsDTO.MonthlyDataPoint
                {
                    Month = $"{g.Key.Year}-{g.Key.Month:D2}",
                    Value = g.Sum(p => p.TotalAmount)
                })
                .OrderBy(x => x.Month)
                .ToList();

            var monthlyConsumption = payments
                .GroupBy(p => new { Year = p.EntryDate.Year, Month = p.EntryDate.Month })
                .Select(g => new FuelPaymentStatisticsDTO.MonthlyDataPoint
                {
                    Month = $"{g.Key.Year}-{g.Key.Month:D2}",
                    Value = g.Sum(p => p.Mileage)
                })
                .OrderBy(x => x.Month)
                .ToList();

            return Ok(new FuelPaymentStatisticsDTO
            {
                MonthlyExpenses = monthlyExpenses,
                MonthlyConsumption = monthlyConsumption
            });
        }

        [HttpGet("latest/{equipmentId}")]
        public async Task<IActionResult> GetLatest(
            Guid equipmentId,
            CancellationToken cancellationToken = default)
        {
            var latestPayment = await _context.FuelPayments
                .Where(p => p.EquipmentId == equipmentId)
                .OrderByDescending(p => p.EntryDate)
                .ThenByDescending(p => p.CreatedAt)
                .Select(p => new
                {
                    PreviousMileage = p.CurrentMileage,
                    PricePerLiter = p.PricePerLiter
                })
                .FirstOrDefaultAsync(cancellationToken);

            if (latestPayment == null)
            {
                return Ok(new { previousMileage = (decimal?)null, pricePerLiter = (decimal?)null });
            }

            return Ok(new { previousMileage = latestPayment.PreviousMileage, pricePerLiter = latestPayment.PricePerLiter });
        }

        [HttpPost]
        [RequestFormLimits(MultipartBodyLengthLimit = 10485760)] // 10MB
        [RequestSizeLimit(10485760)]
        public async Task<IActionResult> Create(
            [FromForm] IFormFile? odometerImage,
            CancellationToken cancellationToken = default)
        {
            var dto = new FuelPaymentCreateDTO();

            // Parse DepartmentId
            if (Request.Form.TryGetValue("DepartmentId", out var departmentIdStr) && Guid.TryParse(departmentIdStr.ToString(), out var departmentId))
            {
                dto.DepartmentId = departmentId;
            }
            else
            {
                ModelState.AddModelError("DepartmentId", "DepartmentId is required and must be a valid GUID.");
            }

            // Parse ResponsibleEmployeeId (optional)
            if (Request.Form.TryGetValue("ResponsibleEmployeeId", out var responsibleEmployeeIdStr) && !string.IsNullOrEmpty(responsibleEmployeeIdStr))
            {
                if (Guid.TryParse(responsibleEmployeeIdStr.ToString(), out var responsibleEmployeeId))
                {
                    dto.ResponsibleEmployeeId = responsibleEmployeeId;
                }
            }

            // Parse EquipmentId
            if (Request.Form.TryGetValue("EquipmentId", out var equipmentIdStr) && Guid.TryParse(equipmentIdStr.ToString(), out var equipmentId))
            {
                dto.EquipmentId = equipmentId;
            }
            else
            {
                ModelState.AddModelError("EquipmentId", "EquipmentId is required and must be a valid GUID.");
            }

            // Parse EntryDate
            if (Request.Form.TryGetValue("EntryDate", out var entryDateStr) && DateTime.TryParse(entryDateStr.ToString(), out var entryDate))
            {
                dto.EntryDate = entryDate;
            }
            else
            {
                ModelState.AddModelError("EntryDate", "EntryDate is required and must be a valid date.");
            }

            // Parse decimal values
            if (Request.Form.TryGetValue("PreviousMileage", out var previousMileageStr))
            {
                if (decimal.TryParse(previousMileageStr.ToString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var previousMileage))
                {
                    dto.PreviousMileage = previousMileage;
                }
                else
                {
                    ModelState.AddModelError("PreviousMileage", $"The value '{previousMileageStr}' is not valid for PreviousMileage.");
                }
            }
            else
            {
                ModelState.AddModelError("PreviousMileage", "PreviousMileage is required.");
            }

            if (Request.Form.TryGetValue("CurrentMileage", out var currentMileageStr))
            {
                if (decimal.TryParse(currentMileageStr.ToString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var currentMileage))
                {
                    dto.CurrentMileage = currentMileage;
                }
                else
                {
                    ModelState.AddModelError("CurrentMileage", $"The value '{currentMileageStr}' is not valid for CurrentMileage.");
                }
            }
            else
            {
                ModelState.AddModelError("CurrentMileage", "CurrentMileage is required.");
            }

            if (Request.Form.TryGetValue("PricePerLiter", out var pricePerLiterStr))
            {
                if (decimal.TryParse(pricePerLiterStr.ToString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var pricePerLiter))
                {
                    dto.PricePerLiter = pricePerLiter;
                }
                else
                {
                    ModelState.AddModelError("PricePerLiter", $"The value '{pricePerLiterStr}' is not valid for PricePerLiter.");
                }
            }
            else
            {
                ModelState.AddModelError("PricePerLiter", "PricePerLiter is required.");
            }

            // Parse FuelType
            if (Request.Form.TryGetValue("FuelType", out var fuelTypeStr) && Enum.TryParse<FuelType>(fuelTypeStr.ToString(), out var fuelType))
            {
                dto.FuelType = fuelType;
            }
            else
            {
                ModelState.AddModelError("FuelType", "FuelType is required and must be a valid FuelType.");
            }

            if (Request.Form.TryGetValue("TotalAmount", out var totalAmountStr))
            {
                if (decimal.TryParse(totalAmountStr.ToString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var totalAmount))
                {
                    dto.TotalAmount = totalAmount;
                }
                else
                {
                    ModelState.AddModelError("TotalAmount", $"The value '{totalAmountStr}' is not valid for TotalAmount.");
                }
            }
            else
            {
                ModelState.AddModelError("TotalAmount", "TotalAmount is required.");
            }

            // Validate: CurrentMileage should be greater than PreviousMileage
            if (dto.CurrentMileage <= dto.PreviousMileage)
            {
                ModelState.AddModelError("CurrentMileage", "Поточний пробіг не може бути меншим або рівним попередньому.");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Handle image upload
            string? imageUrl = null;
            if (odometerImage != null && odometerImage.Length > 0)
            {
                var uploadsFolder = Path.Combine(_environment.WebRootPath ?? _environment.ContentRootPath, "uploads", "fuel");
                if (!Directory.Exists(uploadsFolder))
                {
                    Directory.CreateDirectory(uploadsFolder);
                }

                var fileName = $"{Guid.NewGuid()}{Path.GetExtension(odometerImage.FileName)}";
                var filePath = Path.Combine(uploadsFolder, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await odometerImage.CopyToAsync(stream, cancellationToken);
                }

                imageUrl = $"/uploads/fuel/{fileName}";
            }

            var payment = new FuelPayment
            {
                Id = Guid.NewGuid(),
                DepartmentId = dto.DepartmentId,
                ResponsibleEmployeeId = dto.ResponsibleEmployeeId,
                EquipmentId = dto.EquipmentId,
                EntryDate = dto.EntryDate,
                PreviousMileage = dto.PreviousMileage,
                CurrentMileage = dto.CurrentMileage,
                PricePerLiter = dto.PricePerLiter,
                FuelType = dto.FuelType,
                TotalAmount = dto.TotalAmount,
                OdometerImageUrl = imageUrl,
                CreatedAt = DateTime.UtcNow
            };

            _context.FuelPayments.Add(payment);
            await _context.SaveChangesAsync(cancellationToken);

            var result = await _context.FuelPayments
                .Include(p => p.Department)
                .Include(p => p.ResponsibleEmployee)
                .Include(p => p.Equipment)
                .Where(p => p.Id == payment.Id)
                .Select(p => new FuelPaymentDTO
                {
                    Id = p.Id,
                    DepartmentId = p.DepartmentId,
                    DepartmentName = p.Department.Name,
                    ResponsibleEmployeeId = p.ResponsibleEmployeeId,
                    ResponsibleEmployeeName = p.ResponsibleEmployee != null ? p.ResponsibleEmployee.CallSign : null,
                    EquipmentId = p.EquipmentId,
                    EquipmentName = p.Equipment.Name,
                    EntryDate = p.EntryDate,
                    PreviousMileage = p.PreviousMileage,
                    CurrentMileage = p.CurrentMileage,
                    PricePerLiter = p.PricePerLiter,
                    FuelType = p.FuelType,
                    FuelTypeName = p.FuelType == FuelType.Gasoline ? "Бензин" : "Дізель",
                    TotalAmount = p.TotalAmount,
                    OdometerImageUrl = p.OdometerImageUrl,
                    CreatedAt = p.CreatedAt
                })
                .FirstOrDefaultAsync(cancellationToken);

            return CreatedAtAction(nameof(GetAll), new { id = payment.Id }, result);
        }
    }
}
