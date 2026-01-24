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

            var query = _context.FuelTransactions
                .Include(t => t.Department)
                .AsQueryable();

            if (departmentId.HasValue)
            {
                query = query.Where(t => t.DepartmentId == departmentId.Value);
            }

            if (fuelType.HasValue)
            {
                query = query.Where(t => t.Type == fuelType.Value);
            }

            var totalCount = await query.CountAsync(cancellationToken);

            var transactions = await query
                .OrderByDescending(t => t.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(t => new FuelTransactionDTO
                {
                    Id = t.Id,
                    DepartmentId = t.DepartmentId,
                    DepartmentName = t.Department != null ? t.Department.Name : null,
                    Type = t.Type,
                    FuelTypeName = t.Type == FuelType.Gasoline ? "Бензин" : "Дізель",
                    Amount = t.Amount,
                    RelatedId = t.RelatedId,
                    CreatedAt = t.CreatedAt
                })
                .ToListAsync(cancellationToken);

            return Ok(new { items = transactions, total = totalCount });
        }

        [HttpGet("statistics")]
        public async Task<IActionResult> GetStatistics(
            [FromQuery] Guid? departmentId,
            [FromQuery] FuelType? fuelType,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            CancellationToken cancellationToken = default)
        {
            var txQuery = _context.FuelTransactions.AsQueryable();

            // If dates are not provided, use default range (last 12 months from latest transaction)
            if (!startDate.HasValue || !endDate.HasValue)
            {
                var latestTxDate = await txQuery
                    .OrderByDescending(t => t.CreatedAt)
                    .Select(t => t.CreatedAt)
                    .FirstOrDefaultAsync(cancellationToken);

                if (latestTxDate == default(DateTime))
                {
                    return Ok(new FuelPaymentStatisticsDTO
                    {
                        MonthlyExpenses = new List<FuelPaymentStatisticsDTO.MonthlyDataPoint>(),
                        MonthlyConsumption = new List<FuelPaymentStatisticsDTO.MonthlyDataPoint>()
                    });
                }

                var endMonth = new DateTime(latestTxDate.Year, latestTxDate.Month, 1);
                startDate = endMonth.AddMonths(-11); // Last 12 months including the latest month
                endDate = endMonth.AddMonths(1); // Exclusive end date (first day of next month)
            }

            // Normalize dates to first day of month for comparison
            var startDateNormalized = new DateTime(startDate.Value.Year, startDate.Value.Month, 1);
            var endDateExclusive = new DateTime(endDate.Value.Year, endDate.Value.Month, 1).AddMonths(1);

            txQuery = txQuery.Where(t => t.CreatedAt >= startDateNormalized &&
                                         t.CreatedAt < endDateExclusive);

            if (departmentId.HasValue)
            {
                txQuery = txQuery.Where(t => t.DepartmentId == departmentId.Value);
            }

            List<FuelPaymentStatisticsDTO.MonthlyDataPoint> monthlyGas;
            List<FuelPaymentStatisticsDTO.MonthlyDataPoint> monthlyDiesel;

            // Helper local function to aggregate liters (only negative amounts – витрати)
            // Returns data with Year and Month, formatting happens in memory after query execution
            static async Task<List<FuelPaymentStatisticsDTO.MonthlyDataPoint>> BuildLitersQueryAsync(
                IQueryable<FuelTransaction> query,
                FuelType type,
                CancellationToken cancellationToken)
            {
                var rawData = await query
                    .Where(t => t.Type == type && t.Amount < 0)
                    .GroupBy(t => new { Year = t.CreatedAt.Year, Month = t.CreatedAt.Month })
                    .Select(g => new
                    {
                        g.Key.Year,
                        g.Key.Month,
                        Value = -g.Sum(t => t.Amount) // Amount negative -> liters positive
                    })
                    .OrderBy(x => x.Year)
                    .ThenBy(x => x.Month)
                    .ToListAsync(cancellationToken);

                // Format Month string in memory after query execution
                return rawData.Select(x => new FuelPaymentStatisticsDTO.MonthlyDataPoint
                {
                    Month = $"{x.Year}-{x.Month:D2}",
                    Value = x.Value
                }).ToList();
            }

            if (fuelType.HasValue)
            {
                // Один тип пального: один список з даними, інший порожній
                if (fuelType.Value == FuelType.Gasoline)
                {
                    monthlyGas = await BuildLitersQueryAsync(txQuery, FuelType.Gasoline, cancellationToken);
                    monthlyDiesel = new List<FuelPaymentStatisticsDTO.MonthlyDataPoint>();
                }
                else // Diesel
                {
                    monthlyGas = new List<FuelPaymentStatisticsDTO.MonthlyDataPoint>();
                    monthlyDiesel = await BuildLitersQueryAsync(txQuery, FuelType.Diesel, cancellationToken);
                }
            }
            else
            {
                // Всі типи: Бензин -> MonthlyExpenses, Дизель -> MonthlyConsumption
                monthlyGas = await BuildLitersQueryAsync(txQuery, FuelType.Gasoline, cancellationToken);
                monthlyDiesel = await BuildLitersQueryAsync(txQuery, FuelType.Diesel, cancellationToken);
            }

            return Ok(new FuelPaymentStatisticsDTO
            {
                MonthlyExpenses = monthlyGas,
                MonthlyConsumption = monthlyDiesel
            });
        }

        [HttpGet("latest/{equipmentId}")]
        public async Task<IActionResult> GetLatest(
            Guid equipmentId,
            [FromQuery] FuelType fuelType,
            CancellationToken cancellationToken = default)
        {
            // Визначаємо підрозділ по обладнанню
            var equipment = await _context.Equipments
                .Where(e => e.Id == equipmentId)
                .Select(e => new { e.Id, e.DepartmentId })
                .FirstOrDefaultAsync(cancellationToken);

            if (equipment == null || equipment.DepartmentId == null)
            {
                // Немає обладнання або не прив'язано до підрозділу
                return Ok(new { previousMileage = (decimal?)null, fuelBalance = 0m });
            }

            // Остання витрата по цьому обладнанню (для попереднього пробігу)
            var latestExpense = await _context.FuelExpenses
                .Where(p => p.EquipmentId == equipmentId)
                .OrderByDescending(p => p.EntryDate)
                .ThenByDescending(p => p.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);

            decimal? previousMileage = latestExpense?.CurrentMileage;

            // Баланс по підрозділу та вибраному типу палива
            var fuelBalance = await _context.FuelTransactions
                .Where(t => t.DepartmentId == equipment.DepartmentId && t.Type == fuelType)
                .SumAsync(t => (decimal?)t.Amount, cancellationToken) ?? 0m;

            return Ok(new { previousMileage, fuelBalance });
        }

        /// <summary>
        /// Отримати залишок палива по підрозділу та типу палива.
        /// Не залежить від обладнання.
        /// </summary>
        [HttpGet("balance")]
        public async Task<IActionResult> GetBalance(
            [FromQuery] Guid departmentId,
            [FromQuery] FuelType fuelType,
            CancellationToken cancellationToken = default)
        {
            var fuelBalance = await _context.FuelTransactions
                .Where(t => t.DepartmentId == departmentId && t.Type == fuelType)
                .SumAsync(t => (decimal?)t.Amount, cancellationToken) ?? 0m;

            return Ok(new { fuelBalance });
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

            // Parse FuelType
            if (Request.Form.TryGetValue("FuelType", out var fuelTypeStr) && Enum.TryParse<FuelType>(fuelTypeStr.ToString(), out var fuelType))
            {
                dto.FuelType = fuelType;
            }
            else
            {
                ModelState.AddModelError("FuelType", "FuelType is required and must be a valid FuelType.");
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

            // Отримуємо витрачене паливо (літри) з форми. Воно зберігається лише у FuelTransactions.
            decimal fuelUsed = 0;
            if (Request.Form.TryGetValue("FuelUsed", out var fuelUsedStr) &&
                decimal.TryParse(fuelUsedStr.ToString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var fuelUsedParsed))
            {
                fuelUsed = fuelUsedParsed;
            }

            // Вартість та баланс більше не розраховуються тут.
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
                FuelType = dto.FuelType,
                TotalAmount = dto.TotalAmount,
                OdometerImageUrl = imageUrl,
                CreatedAt = DateTime.UtcNow
            };

            _context.FuelExpenses.Add(payment);
            await _context.SaveChangesAsync(cancellationToken);

            // Створюємо транзакцію руху палива (мінус – витрати)
            var transaction = new FuelTransaction
            {
                Id = Guid.NewGuid(),
                DepartmentId = payment.DepartmentId,
                Type = payment.FuelType,
                Amount = -fuelUsed,
                RelatedId = payment.Id,
                CreatedAt = DateTime.UtcNow
            };

            _context.FuelTransactions.Add(transaction);
            await _context.SaveChangesAsync(cancellationToken);

            var result = await _context.FuelExpenses
                .Include(p => p.Department)
                .Include(p => p.ResponsibleEmployee)
                .Include(p => p.Equipment)
                .Where(p => p.Id == payment.Id)
                .Select(p => new FuelPaymentDTO
                {
                    Id = p.Id,
                    DepartmentId = p.DepartmentId,
                    DepartmentName = p.Department != null ? p.Department.Name : null,
                    ResponsibleEmployeeId = p.ResponsibleEmployeeId,
                    ResponsibleEmployeeName = p.ResponsibleEmployee != null ? p.ResponsibleEmployee.CallSign : null,
                    EquipmentId = p.EquipmentId,
                    EquipmentName = p.Equipment != null ? p.Equipment.Name : null,
                    EntryDate = p.EntryDate,
                    PreviousMileage = p.PreviousMileage,
                    CurrentMileage = p.CurrentMileage,
                    FuelType = p.FuelType,
                    FuelTypeName = p.FuelType == FuelType.Gasoline ? "Бензин" : "Дізель",
                    TotalAmount = p.TotalAmount,
                    OdometerImageUrl = p.OdometerImageUrl,
                    CreatedAt = p.CreatedAt
                })
                .FirstOrDefaultAsync(cancellationToken);

            return CreatedAtAction(nameof(GetAll), new { id = payment.Id }, result);
        }

        [HttpGet("transaction/{relatedId}")]
        public async Task<IActionResult> GetTransactionDetails(
            Guid relatedId,
            CancellationToken cancellationToken = default)
        {
            // Спочатку перевіряємо, чи це витрата (FuelExpense)
            var expenseData = await _context.FuelExpenses
                .Include(p => p.Department)
                .Include(p => p.ResponsibleEmployee)
                .Include(p => p.Equipment)
                .Where(p => p.Id == relatedId)
                .FirstOrDefaultAsync(cancellationToken);

            if (expenseData != null)
            {
                // Отримуємо TransactionId та кількість витраченого палива з пов'язаної транзакції
                var transaction = await _context.FuelTransactions
                    .Where(t => t.RelatedId == relatedId && t.Amount < 0)
                    .Select(t => new { t.Id, t.Amount })
                    .FirstOrDefaultAsync(cancellationToken);

                // Створюємо DTO в пам'яті після отримання даних
                var expense = new FuelPaymentDTO
                {
                    TransactionId = transaction != null && transaction.Id != Guid.Empty ? transaction.Id : Guid.Empty,
                    TransactionType = "Expense",
                    Id = expenseData.Id,
                    DepartmentId = expenseData.DepartmentId,
                    DepartmentName = expenseData.Department?.Name,
                    ResponsibleEmployeeId = expenseData.ResponsibleEmployeeId,
                    ResponsibleEmployeeName = expenseData.ResponsibleEmployee?.CallSign,
                    EquipmentId = expenseData.EquipmentId,
                    EquipmentName = expenseData.Equipment?.Name,
                    EntryDate = expenseData.EntryDate,
                    PreviousMileage = expenseData.PreviousMileage,
                    CurrentMileage = expenseData.CurrentMileage,
                    FuelType = expenseData.FuelType,
                    FuelTypeName = expenseData.FuelType == FuelType.Gasoline ? "Бензин" : "Дізель",
                    TotalAmount = expenseData.TotalAmount,
                    FuelAmount = transaction != null ? -transaction.Amount : 0, // Модуль негативного значення
                    OdometerImageUrl = expenseData.OdometerImageUrl,
                    CreatedAt = expenseData.CreatedAt
                };
                
                return Ok(expense);
            }

            // Якщо не знайдено в витратах, перевіряємо надходження (FuelIncome)
            var incomeData = await _context.FuelIncomes
                .Include(fi => fi.Department)
                .Include(fi => fi.ReceiverEmployee)
                .Where(fi => fi.Id == relatedId)
                .FirstOrDefaultAsync(cancellationToken);

            if (incomeData != null)
            {
                // Отримуємо TransactionId та кількість доданого палива з пов'язаної транзакції
                var transaction = await _context.FuelTransactions
                    .Where(t => t.RelatedId == relatedId && t.Amount > 0)
                    .Select(t => new { t.Id, t.Amount })
                    .FirstOrDefaultAsync(cancellationToken);

                // Створюємо FuelPaymentDTO з даними FuelIncome
                var incomeDto = new FuelPaymentDTO
                {
                    TransactionId = transaction != null && transaction.Id != Guid.Empty ? transaction.Id : Guid.Empty,
                    TransactionType = "Income",
                    Id = incomeData.Id,
                    DepartmentId = incomeData.DepartmentId,
                    DepartmentName = incomeData.Department?.Name,
                    ResponsibleEmployeeId = incomeData.ReceiverEmployeeId,
                    ResponsibleEmployeeName = incomeData.ReceiverEmployee?.CallSign,
                    EquipmentId = Guid.Empty, // FuelIncome не має обладнання
                    EquipmentName = null,
                    EntryDate = incomeData.TransactionDate,
                    PreviousMileage = 0, // FuelIncome не має пробігу
                    CurrentMileage = 0,
                    FuelType = incomeData.FuelType,
                    FuelTypeName = incomeData.FuelType == FuelType.Gasoline ? "Бензин" : "Дізель",
                    TotalAmount = 0, // FuelIncome не має суми
                    FuelAmount = transaction != null ? transaction.Amount : incomeData.Amount, // Кількість доданого палива
                    OdometerImageUrl = null,
                    CreatedAt = incomeData.CreatedAt
                };

                return Ok(incomeDto);
            }

            return NotFound(new { message = "Транзакцію не знайдено" });
        }
    }
}
