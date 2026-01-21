using EmployeeManager.API.Data;
using EmployeeManager.API.DTO;
using EmployeeManager.API.Models;
using EmployeeManager.API.Repositories;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace EmployeeManager.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UtilityPaymentsController : ControllerBase
    {
        private readonly IUtilityPaymentRepository _repository;
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _environment;
        private readonly ILogger<UtilityPaymentsController> _logger;

        public UtilityPaymentsController(
            IUtilityPaymentRepository repository,
            AppDbContext context,
            IWebHostEnvironment environment,
            ILogger<UtilityPaymentsController> logger)
        {
            _repository = repository;
            _context = context;
            _environment = environment;
            _logger = logger;
        }

        [HttpGet("latest/{departmentId}/{paymentType}")]
        public async Task<IActionResult> GetLatest(
            Guid departmentId,
            PaymentType paymentType,
            [FromQuery] string? paymentMonth = null,
            CancellationToken cancellationToken = default)
        {
            // Parse payment month or use current month
            DateTime targetMonth;
            if (!string.IsNullOrEmpty(paymentMonth) && DateTime.TryParse(paymentMonth, out var parsedDate))
            {
                targetMonth = new DateTime(parsedDate.Year, parsedDate.Month, 1);
            }
            else
            {
                targetMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
            }

            // Get previous month (month before the target month)
            var previousMonth = targetMonth.AddMonths(-1);
            var previousMonthStart = new DateTime(previousMonth.Year, previousMonth.Month, 1);
            var previousMonthEnd = previousMonthStart.AddMonths(1).AddDays(-1);

            _logger.LogInformation("GetLatest called: departmentId={DepartmentId}, paymentType={PaymentType}, paymentMonth={PaymentMonth}, targetMonth={TargetMonth}, previousMonthStart={PreviousMonthStart}",
                departmentId, paymentType, paymentMonth, targetMonth, previousMonthStart);

            // Get all payments for the previous month
            // Normalize PaymentMonth to first day of month for comparison (handles cases where PaymentMonth might be set to any day in the month)
            var previousPayments = await _context.UtilityPayments
                .Where(p => p.DepartmentId == departmentId &&
                           p.PaymentType == paymentType &&
                           // Check if PaymentMonth falls within the previous month range
                           // This handles both normalized (1st of month) and non-normalized dates
                           p.PaymentMonth >= previousMonthStart &&
                           p.PaymentMonth < previousMonthStart.AddMonths(1))
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new PreviousMonthPaymentDTO
                {
                    Id = p.Id,
                    PreviousValue = p.PreviousValue,
                    CurrentValue = p.CurrentValue,
                    PreviousValueNight = p.PreviousValueNight,
                    CurrentValueNight = p.CurrentValueNight,
                    PricePerUnit = p.PricePerUnit,
                    PricePerUnitNight = p.PricePerUnitNight,
                    PaymentMonth = p.PaymentMonth,
                    CreatedAt = p.CreatedAt,
                    DisplayText = $"{p.PaymentMonth:yyyy-MM-dd} ({p.CreatedAt:yyyy-MM-dd HH:mm})"
                })
                .ToListAsync(cancellationToken);

            // If no payments found, return empty list
            if (previousPayments.Count == 0)
            {
                _logger.LogInformation("No previous payments found for departmentId={DepartmentId}, paymentType={PaymentType}, previousMonthStart={PreviousMonthStart}",
                    departmentId, paymentType, previousMonthStart);
                return Ok(new List<PreviousMonthPaymentDTO>());
            }

            _logger.LogInformation("Found {Count} previous payments for departmentId={DepartmentId}, paymentType={PaymentType}",
                previousPayments.Count, departmentId, paymentType);
            return Ok(previousPayments);
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] Guid? departmentId,
            [FromQuery] PaymentType? paymentType,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            CancellationToken cancellationToken = default)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            var query = _context.UtilityPayments
                .Include(p => p.Department)
                .Include(p => p.ResponsibleEmployee)
                .AsQueryable();

            if (departmentId.HasValue)
            {
                query = query.Where(p => p.DepartmentId == departmentId.Value);
            }

            if (paymentType.HasValue)
            {
                query = query.Where(p => p.PaymentType == paymentType.Value);
            }

            var totalCount = await query.CountAsync(cancellationToken);

            var payments = await query
                .OrderByDescending(p => p.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new UtilityPaymentDTO
                {
                    Id = p.Id,
                    DepartmentId = p.DepartmentId,
                    DepartmentName = p.Department.Name,
                    ResponsibleEmployeeId = p.ResponsibleEmployeeId,
                    ResponsibleEmployeeName = p.ResponsibleEmployee != null ? p.ResponsibleEmployee.CallSign : null,
                    PaymentType = p.PaymentType,
                    PaymentTypeName = p.PaymentType.ToString(),
                    PreviousValue = p.PreviousValue,
                    CurrentValue = p.CurrentValue,
                    PreviousValueNight = p.PreviousValueNight,
                    CurrentValueNight = p.CurrentValueNight,
                    PricePerUnit = p.PricePerUnit,
                    PricePerUnitNight = p.PricePerUnitNight,
                    TotalAmount = p.TotalAmount,
                    BillImageUrl = p.BillImageUrl,
                    PaymentMonth = p.PaymentMonth,
                    CreatedAt = p.CreatedAt
                })
                .ToListAsync(cancellationToken);

            return Ok(new { items = payments, total = totalCount });
        }

        [HttpGet("statistics")]
        public async Task<IActionResult> GetStatistics(
            [FromQuery] PaymentType paymentType,
            [FromQuery] Guid? departmentId,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            CancellationToken cancellationToken = default)
        {
            // If dates are not provided, use default range (last 12 months from latest payment)
            if (!startDate.HasValue || !endDate.HasValue)
            {
                var latestPaymentMonth = await _context.UtilityPayments
                    .Where(p => p.PaymentType == paymentType)
                    .OrderByDescending(p => p.PaymentMonth)
                    .Select(p => p.PaymentMonth)
                    .FirstOrDefaultAsync(cancellationToken);

                if (latestPaymentMonth == default(DateTime))
                {
                    return Ok(new UtilityPaymentStatisticsDTO
                    {
                        MonthlyExpenses = new List<UtilityPaymentStatisticsDTO.MonthlyDataPoint>(),
                        MonthlyConsumption = new List<UtilityPaymentStatisticsDTO.MonthlyDataPoint>()
                    });
                }

                var endMonth = new DateTime(latestPaymentMonth.Year, latestPaymentMonth.Month, 1);
                startDate = endMonth.AddMonths(-11); // Last 12 months including the latest month
                endDate = endMonth.AddMonths(1); // Exclusive end date (first day of next month)
            }

            // Normalize dates to first day of month for comparison
            var startDateNormalized = new DateTime(startDate.Value.Year, startDate.Value.Month, 1);
            var endDateExclusive = new DateTime(endDate.Value.Year, endDate.Value.Month, 1).AddMonths(1);

            _logger.LogInformation("GetStatistics: paymentType={PaymentType}, startDate={StartDate}, endDate={EndDate}, endDateExclusive={EndDateExclusive}",
                paymentType, startDateNormalized, endDate, endDateExclusive);

            var query = _context.UtilityPayments
                .Where(p => p.PaymentType == paymentType && 
                           p.PaymentMonth >= startDateNormalized && 
                           p.PaymentMonth < endDateExclusive);

            if (departmentId.HasValue)
            {
                query = query.Where(p => p.DepartmentId == departmentId.Value);
            }

            var payments = await query
                .OrderBy(p => p.PaymentMonth)
                .Select(p => new
                {
                    p.PaymentMonth,
                    p.TotalAmount,
                    p.PreviousValue,
                    p.CurrentValue,
                    p.PreviousValueNight,
                    p.CurrentValueNight
                })
                .ToListAsync(cancellationToken);

            // Group by month and calculate totals
            var monthlyExpenses = payments
                .GroupBy(p => new { Year = p.PaymentMonth.Year, Month = p.PaymentMonth.Month })
                .Select(g => new UtilityPaymentStatisticsDTO.MonthlyDataPoint
                {
                    Month = $"{g.Key.Year}-{g.Key.Month:D2}",
                    Value = g.Sum(p => p.TotalAmount)
                })
                .OrderBy(x => x.Month)
                .ToList();

            var monthlyConsumption = payments
                .GroupBy(p => new { Year = p.PaymentMonth.Year, Month = p.PaymentMonth.Month })
                .Select(g => new UtilityPaymentStatisticsDTO.MonthlyDataPoint
                {
                    Month = $"{g.Key.Year}-{g.Key.Month:D2}",
                    Value = g.Sum(p => 
                        (p.CurrentValue ?? 0) - (p.PreviousValue ?? 0) +
                        ((p.CurrentValueNight ?? 0) - (p.PreviousValueNight ?? 0))
                    )
                })
                .OrderBy(x => x.Month)
                .ToList();

            return Ok(new UtilityPaymentStatisticsDTO
            {
                MonthlyExpenses = monthlyExpenses,
                MonthlyConsumption = monthlyConsumption
            });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken = default)
        {
            var payment = await _context.UtilityPayments
                .Include(p => p.Department)
                .Include(p => p.ResponsibleEmployee)
                .AsNoTracking()
                .Where(p => p.Id == id)
                .Select(p => new UtilityPaymentDTO
                {
                    Id = p.Id,
                    DepartmentId = p.DepartmentId,
                    DepartmentName = p.Department.Name,
                    ResponsibleEmployeeId = p.ResponsibleEmployeeId,
                    ResponsibleEmployeeName = p.ResponsibleEmployee != null ? p.ResponsibleEmployee.CallSign : null,
                    PaymentType = p.PaymentType,
                    PaymentTypeName = p.PaymentType.ToString(),
                    PreviousValue = p.PreviousValue,
                    CurrentValue = p.CurrentValue,
                    PreviousValueNight = p.PreviousValueNight,
                    CurrentValueNight = p.CurrentValueNight,
                    PricePerUnit = p.PricePerUnit,
                    PricePerUnitNight = p.PricePerUnitNight,
                    TotalAmount = p.TotalAmount,
                    BillImageUrl = p.BillImageUrl,
                    PaymentMonth = p.PaymentMonth,
                    CreatedAt = p.CreatedAt
                })
                .FirstOrDefaultAsync(cancellationToken);

            if (payment == null)
                return NotFound(new { message = $"Payment with ID {id} not found." });

            return Ok(payment);
        }

        [HttpPost]
        [RequestFormLimits(MultipartBodyLengthLimit = 10485760)] // 10MB
        [RequestSizeLimit(10485760)]
        public async Task<IActionResult> Create(
            [FromForm] IFormFile? billImage,
            CancellationToken cancellationToken = default)
        {
            // Read all values manually from FormData to avoid automatic binding issues with decimal values
            var dto = new UtilityPaymentCreateDTO();

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

            // Parse PaymentType
            if (Request.Form.TryGetValue("PaymentType", out var paymentTypeStr) && Enum.TryParse<PaymentType>(paymentTypeStr.ToString(), out var paymentType))
            {
                dto.PaymentType = paymentType;
            }
            else
            {
                ModelState.AddModelError("PaymentType", "PaymentType is required and must be a valid PaymentType.");
            }

            // Manually parse decimal values from FormData strings to handle culture-specific formatting
            // FormData always sends values as strings, and ASP.NET Core may fail to parse them correctly
            // Using InvariantCulture ensures that both "." and "," decimal separators are handled correctly
            if (Request.Form.TryGetValue("PricePerUnit", out var pricePerUnitStr))
            {
                if (decimal.TryParse(pricePerUnitStr.ToString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var pricePerUnit))
                {
                    dto.PricePerUnit = pricePerUnit;
                }
                else
                {
                    ModelState.AddModelError("PricePerUnit", $"The value '{pricePerUnitStr}' is not valid for PricePerUnit.");
                }
            }
            else
            {
                ModelState.AddModelError("PricePerUnit", "PricePerUnit is required.");
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

            if (Request.Form.TryGetValue("PreviousValue", out var previousValueStr) && !string.IsNullOrEmpty(previousValueStr))
            {
                if (decimal.TryParse(previousValueStr.ToString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var previousValue))
                {
                    dto.PreviousValue = previousValue;
                }
            }

            if (Request.Form.TryGetValue("CurrentValue", out var currentValueStr) && !string.IsNullOrEmpty(currentValueStr))
            {
                if (decimal.TryParse(currentValueStr.ToString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var currentValue))
                {
                    dto.CurrentValue = currentValue;
                }
            }

            if (Request.Form.TryGetValue("PreviousValueNight", out var previousValueNightStr) && !string.IsNullOrEmpty(previousValueNightStr))
            {
                if (decimal.TryParse(previousValueNightStr.ToString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var previousValueNight))
                {
                    dto.PreviousValueNight = previousValueNight;
                }
            }

            if (Request.Form.TryGetValue("CurrentValueNight", out var currentValueNightStr) && !string.IsNullOrEmpty(currentValueNightStr))
            {
                if (decimal.TryParse(currentValueNightStr.ToString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var currentValueNight))
                {
                    dto.CurrentValueNight = currentValueNight;
                }
            }

            if (Request.Form.TryGetValue("PricePerUnitNight", out var pricePerUnitNightStr) && !string.IsNullOrEmpty(pricePerUnitNightStr))
            {
                if (decimal.TryParse(pricePerUnitNightStr.ToString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var pricePerUnitNight))
                {
                    dto.PricePerUnitNight = pricePerUnitNight;
                }
            }

            // Parse paymentMonth
            string? paymentMonth = null;
            if (Request.Form.TryGetValue("paymentMonth", out var paymentMonthStr))
            {
                paymentMonth = paymentMonthStr.ToString();
            }

            // Re-validate manually parsed values
            if (dto.PricePerUnit <= 0)
            {
                ModelState.AddModelError("PricePerUnit", "Price per unit must be greater than 0");
            }

            if (dto.TotalAmount < 0)
            {
                ModelState.AddModelError("TotalAmount", "Total amount cannot be negative");
            }

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Validate department exists
            var department = await _context.Departments.FindAsync(new object[] { dto.DepartmentId }, cancellationToken);
            if (department == null)
                return BadRequest(new { message = "Department not found." });

            // Validate responsible employee if provided
            if (dto.ResponsibleEmployeeId.HasValue)
            {
                var employee = await _context.Employees.FindAsync(new object[] { dto.ResponsibleEmployeeId.Value }, cancellationToken);
                if (employee == null)
                    return BadRequest(new { message = "Responsible employee not found." });
            }

            // Validate values
            if (dto.CurrentValue.HasValue && dto.PreviousValue.HasValue && dto.CurrentValue < dto.PreviousValue)
            {
                return BadRequest(new { message = "Current value cannot be less than previous value." });
            }

            if (dto.CurrentValueNight.HasValue && dto.PreviousValueNight.HasValue && dto.CurrentValueNight < dto.PreviousValueNight)
            {
                return BadRequest(new { message = "Current night value cannot be less than previous night value." });
            }

            string? imageUrl = null;

            // Handle file upload
            if (billImage != null && billImage.Length > 0)
            {
                try
                {
                    var uploadsFolder = Path.Combine(_environment.WebRootPath ?? _environment.ContentRootPath, "uploads", "bills");
                    if (!Directory.Exists(uploadsFolder))
                    {
                        Directory.CreateDirectory(uploadsFolder);
                    }

                    var fileName = $"{Guid.NewGuid()}_{billImage.FileName}";
                    var filePath = Path.Combine(uploadsFolder, fileName);

                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        await billImage.CopyToAsync(stream, cancellationToken);
                    }

                    imageUrl = $"/uploads/bills/{fileName}";
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error uploading bill image");
                    return StatusCode(500, new { message = "Error uploading bill image." });
                }
            }

            // Parse payment month or use current month
            DateTime paymentMonthDate;
            if (!string.IsNullOrEmpty(paymentMonth) && DateTime.TryParse(paymentMonth, out var parsedDate))
            {
                paymentMonthDate = new DateTime(parsedDate.Year, parsedDate.Month, 1);
            }
            else
            {
                paymentMonthDate = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
            }

            var payment = new UtilityPayment
            {
                Id = Guid.NewGuid(),
                DepartmentId = dto.DepartmentId,
                ResponsibleEmployeeId = dto.ResponsibleEmployeeId,
                PaymentType = dto.PaymentType,
                PreviousValue = dto.PreviousValue,
                CurrentValue = dto.CurrentValue,
                PreviousValueNight = dto.PreviousValueNight,
                CurrentValueNight = dto.CurrentValueNight,
                PricePerUnit = dto.PricePerUnit,
                PricePerUnitNight = dto.PricePerUnitNight,
                TotalAmount = dto.TotalAmount,
                BillImageUrl = imageUrl,
                PaymentMonth = paymentMonthDate,
                CreatedAt = DateTime.UtcNow
            };

            try
            {
                // Repository.AddAsync already calls SaveChangesAsync internally
                await _repository.AddAsync(payment, cancellationToken);
            }
            catch (DbUpdateException dbEx)
            {
                _logger.LogError(dbEx, "Database error while creating utility payment");
                // Let GlobalExceptionMiddleware handle it - it will return 409 Conflict
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while creating utility payment");
                // Let GlobalExceptionMiddleware handle it - it will return 500 Internal Server Error
                throw;
            }

            var result = await _context.UtilityPayments
                .Include(p => p.Department)
                .Include(p => p.ResponsibleEmployee)
                .Where(p => p.Id == payment.Id)
                .Select(p => new UtilityPaymentDTO
                {
                    Id = p.Id,
                    DepartmentId = p.DepartmentId,
                    DepartmentName = p.Department.Name,
                    ResponsibleEmployeeId = p.ResponsibleEmployeeId,
                    ResponsibleEmployeeName = p.ResponsibleEmployee != null ? p.ResponsibleEmployee.CallSign : null,
                    PaymentType = p.PaymentType,
                    PaymentTypeName = p.PaymentType.ToString(),
                    PreviousValue = p.PreviousValue,
                    CurrentValue = p.CurrentValue,
                    PreviousValueNight = p.PreviousValueNight,
                    CurrentValueNight = p.CurrentValueNight,
                    PricePerUnit = p.PricePerUnit,
                    PricePerUnitNight = p.PricePerUnitNight,
                    TotalAmount = p.TotalAmount,
                    BillImageUrl = p.BillImageUrl,
                    PaymentMonth = p.PaymentMonth,
                    CreatedAt = p.CreatedAt
                })
                .FirstOrDefaultAsync(cancellationToken);

            return CreatedAtAction(nameof(GetById), new { id = payment.Id }, result);
        }
    }
}
