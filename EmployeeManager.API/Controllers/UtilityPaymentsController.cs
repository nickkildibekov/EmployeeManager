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
    public class UtilityPaymentsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _environment;
        private readonly ILogger<UtilityPaymentsController> _logger;

        public UtilityPaymentsController(
            AppDbContext context,
            IWebHostEnvironment environment,
            ILogger<UtilityPaymentsController> logger)
        {
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

            _logger.LogInformation(
                "GetLatest called: departmentId={DepartmentId}, paymentType={PaymentType}, paymentMonth={PaymentMonth}, targetMonth={TargetMonth}, previousMonthStart={PreviousMonthStart}",
                departmentId, paymentType, paymentMonth, targetMonth, previousMonthStart);

            List<PreviousMonthPaymentDTO> previousPayments;

            switch (paymentType)
            {
                case PaymentType.Electricity:
                    previousPayments = await _context.ElectricityPayments
                        .Where(p => p.DepartmentId == departmentId &&
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
                    break;

                case PaymentType.Gas:
                    previousPayments = await _context.GasPayments
                        .Where(p => p.DepartmentId == departmentId &&
                                    p.PaymentMonth >= previousMonthStart &&
                                    p.PaymentMonth < previousMonthStart.AddMonths(1))
                        .OrderByDescending(p => p.CreatedAt)
                        .Select(p => new PreviousMonthPaymentDTO
                        {
                            Id = p.Id,
                            PreviousValue = p.PreviousValue,
                            CurrentValue = p.CurrentValue,
                            PreviousValueNight = null,
                            CurrentValueNight = null,
                            PricePerUnit = p.PricePerUnit,
                            PricePerUnitNight = null,
                            PaymentMonth = p.PaymentMonth,
                            CreatedAt = p.CreatedAt,
                            DisplayText = $"{p.PaymentMonth:yyyy-MM-dd} ({p.CreatedAt:yyyy-MM-dd HH:mm})"
                        })
                        .ToListAsync(cancellationToken);
                    break;

                case PaymentType.Water:
                    previousPayments = await _context.WaterPayments
                        .Where(p => p.DepartmentId == departmentId &&
                                    p.PaymentMonth >= previousMonthStart &&
                                    p.PaymentMonth < previousMonthStart.AddMonths(1))
                        .OrderByDescending(p => p.CreatedAt)
                        .Select(p => new PreviousMonthPaymentDTO
                        {
                            Id = p.Id,
                            PreviousValue = p.PreviousValue,
                            CurrentValue = p.CurrentValue,
                            PreviousValueNight = null,
                            CurrentValueNight = null,
                            PricePerUnit = p.PricePerUnit,
                            PricePerUnitNight = null,
                            PaymentMonth = p.PaymentMonth,
                            CreatedAt = p.CreatedAt,
                            DisplayText = $"{p.PaymentMonth:yyyy-MM-dd} ({p.CreatedAt:yyyy-MM-dd HH:mm})"
                        })
                        .ToListAsync(cancellationToken);
                    break;

                case PaymentType.Rent:
                    previousPayments = await _context.RentPayments
                        .Where(p => p.DepartmentId == departmentId &&
                                    p.PaymentMonth >= previousMonthStart &&
                                    p.PaymentMonth < previousMonthStart.AddMonths(1))
                        .OrderByDescending(p => p.CreatedAt)
                        .Select(p => new PreviousMonthPaymentDTO
                        {
                            Id = p.Id,
                            PreviousValue = null,
                            CurrentValue = null,
                            PreviousValueNight = null,
                            CurrentValueNight = null,
                            PricePerUnit = p.PricePerUnit,
                            PricePerUnitNight = null,
                            PaymentMonth = p.PaymentMonth,
                            CreatedAt = p.CreatedAt,
                            DisplayText = $"{p.PaymentMonth:yyyy-MM-dd} ({p.CreatedAt:yyyy-MM-dd HH:mm})"
                        })
                        .ToListAsync(cancellationToken);
                    break;

                default:
                    previousPayments = new List<PreviousMonthPaymentDTO>();
                    break;
            }

            // If no payments found, return empty list
            if (previousPayments.Count == 0)
            {
                _logger.LogInformation(
                    "No previous payments found for departmentId={DepartmentId}, paymentType={PaymentType}, previousMonthStart={PreviousMonthStart}",
                    departmentId, paymentType, previousMonthStart);
                return Ok(new List<PreviousMonthPaymentDTO>());
            }

            _logger.LogInformation(
                "Found {Count} previous payments for departmentId={DepartmentId}, paymentType={PaymentType}",
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

            if (!paymentType.HasValue)
            {
                return BadRequest(new { message = "PaymentType is required to retrieve utility payments." });
            }

            switch (paymentType.Value)
            {
                case PaymentType.Electricity:
                {
                    var query = _context.ElectricityPayments
                        .Include(p => p.Department)
                        .Include(p => p.ResponsibleEmployee)
                        .AsQueryable();

                    if (departmentId.HasValue)
                    {
                        query = query.Where(p => p.DepartmentId == departmentId.Value);
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
                            PaymentType = PaymentType.Electricity,
                            PaymentTypeName = PaymentType.Electricity.ToString(),
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

                case PaymentType.Gas:
                {
                    var query = _context.GasPayments
                        .Include(p => p.Department)
                        .Include(p => p.ResponsibleEmployee)
                        .AsQueryable();

                    if (departmentId.HasValue)
                    {
                        query = query.Where(p => p.DepartmentId == departmentId.Value);
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
                            PaymentType = PaymentType.Gas,
                            PaymentTypeName = PaymentType.Gas.ToString(),
                            PreviousValue = p.PreviousValue,
                            CurrentValue = p.CurrentValue,
                            PreviousValueNight = null,
                            CurrentValueNight = null,
                            PricePerUnit = p.PricePerUnit,
                            PricePerUnitNight = null,
                            TotalAmount = p.TotalAmount,
                            BillImageUrl = p.BillImageUrl,
                            PaymentMonth = p.PaymentMonth,
                            CreatedAt = p.CreatedAt
                        })
                        .ToListAsync(cancellationToken);

                    return Ok(new { items = payments, total = totalCount });
                }

                case PaymentType.Water:
                {
                    var query = _context.WaterPayments
                        .Include(p => p.Department)
                        .Include(p => p.ResponsibleEmployee)
                        .AsQueryable();

                    if (departmentId.HasValue)
                    {
                        query = query.Where(p => p.DepartmentId == departmentId.Value);
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
                            PaymentType = PaymentType.Water,
                            PaymentTypeName = PaymentType.Water.ToString(),
                            PreviousValue = p.PreviousValue,
                            CurrentValue = p.CurrentValue,
                            PreviousValueNight = null,
                            CurrentValueNight = null,
                            PricePerUnit = p.PricePerUnit,
                            PricePerUnitNight = null,
                            TotalAmount = p.TotalAmount,
                            BillImageUrl = p.BillImageUrl,
                            PaymentMonth = p.PaymentMonth,
                            CreatedAt = p.CreatedAt
                        })
                        .ToListAsync(cancellationToken);

                    return Ok(new { items = payments, total = totalCount });
                }

                case PaymentType.Rent:
                {
                    var query = _context.RentPayments
                        .Include(p => p.Department)
                        .Include(p => p.ResponsibleEmployee)
                        .AsQueryable();

                    if (departmentId.HasValue)
                    {
                        query = query.Where(p => p.DepartmentId == departmentId.Value);
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
                            PaymentType = PaymentType.Rent,
                            PaymentTypeName = PaymentType.Rent.ToString(),
                            PreviousValue = null,
                            CurrentValue = null,
                            PreviousValueNight = null,
                            CurrentValueNight = null,
                            PricePerUnit = p.PricePerUnit,
                            PricePerUnitNight = null,
                            TotalAmount = p.TotalAmount,
                            BillImageUrl = p.BillImageUrl,
                            PaymentMonth = p.PaymentMonth,
                            CreatedAt = p.CreatedAt
                        })
                        .ToListAsync(cancellationToken);

                    return Ok(new { items = payments, total = totalCount });
                }

                default:
                    return BadRequest(new { message = "Unsupported payment type." });
            }
        }

        [HttpGet("statistics")]
        public async Task<IActionResult> GetStatistics(
            [FromQuery] PaymentType paymentType,
            [FromQuery] Guid? departmentId,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            CancellationToken cancellationToken = default)
        {
            // Helper local function for single-zone utilities (Gas, Water, Rent)
            async Task<UtilityPaymentStatisticsDTO> BuildSingleZoneStatisticsAsync<TPayment>(
                IQueryable<TPayment> baseQuery)
                where TPayment : class
            {
                if (!startDate.HasValue || !endDate.HasValue)
                {
                    var latestPaymentMonth = await baseQuery
                        .Select(p => EF.Property<DateTime>(p, nameof(WaterPayment.PaymentMonth)))
                        .OrderByDescending(d => d)
                        .FirstOrDefaultAsync(cancellationToken);

                    if (latestPaymentMonth == default)
                    {
                        return new UtilityPaymentStatisticsDTO
                        {
                            MonthlyExpenses = new List<UtilityPaymentStatisticsDTO.MonthlyDataPoint>(),
                            MonthlyConsumption = new List<UtilityPaymentStatisticsDTO.MonthlyDataPoint>()
                        };
                    }

                    var endMonth = new DateTime(latestPaymentMonth.Year, latestPaymentMonth.Month, 1);
                    startDate = endMonth.AddMonths(-11);
                    endDate = endMonth.AddMonths(1);
                }

                var startDateNormalized = new DateTime(startDate!.Value.Year, startDate.Value.Month, 1);
                var endDateExclusive = new DateTime(endDate!.Value.Year, endDate.Value.Month, 1).AddMonths(1);

                _logger.LogInformation(
                    "GetStatistics (single zone): paymentType={PaymentType}, startDate={StartDate}, endDate={EndDate}, endDateExclusive={EndDateExclusive}",
                    paymentType, startDateNormalized, endDate, endDateExclusive);

                var query = baseQuery.Where(p =>
                    EF.Property<DateTime>(p, nameof(WaterPayment.PaymentMonth)) >= startDateNormalized &&
                    EF.Property<DateTime>(p, nameof(WaterPayment.PaymentMonth)) < endDateExclusive);

                if (departmentId.HasValue)
                {
                    query = query.Where(p =>
                        EF.Property<Guid>(p, nameof(WaterPayment.DepartmentId)) == departmentId.Value);
                }

                var payments = await query
                    .OrderBy(p => EF.Property<DateTime>(p, nameof(WaterPayment.PaymentMonth)))
                    .Select(p => new
                    {
                        PaymentMonth = EF.Property<DateTime>(p, nameof(WaterPayment.PaymentMonth)),
                        TotalAmount = EF.Property<decimal>(p, nameof(WaterPayment.TotalAmount)),
                        PreviousValue = EF.Property<decimal?>(p, nameof(WaterPayment.PreviousValue)),
                        CurrentValue = EF.Property<decimal?>(p, nameof(WaterPayment.CurrentValue))
                    })
                    .ToListAsync(cancellationToken);

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
                            (p.CurrentValue ?? 0) - (p.PreviousValue ?? 0))
                    })
                    .OrderBy(x => x.Month)
                    .ToList();

                return new UtilityPaymentStatisticsDTO
                {
                    MonthlyExpenses = monthlyExpenses,
                    MonthlyConsumption = monthlyConsumption
                };
            }

            switch (paymentType)
            {
                case PaymentType.Electricity:
                {
                    // If dates are not provided, use default range (last 12 months from latest payment)
                    if (!startDate.HasValue || !endDate.HasValue)
                    {
                        var latestPaymentMonth = await _context.ElectricityPayments
                            .OrderByDescending(p => p.PaymentMonth)
                            .Select(p => p.PaymentMonth)
                            .FirstOrDefaultAsync(cancellationToken);

                        if (latestPaymentMonth == default)
                        {
                            return Ok(new UtilityPaymentStatisticsDTO
                            {
                                MonthlyExpenses = new List<UtilityPaymentStatisticsDTO.MonthlyDataPoint>(),
                                MonthlyConsumption = new List<UtilityPaymentStatisticsDTO.MonthlyDataPoint>()
                            });
                        }

                        var endMonth = new DateTime(latestPaymentMonth.Year, latestPaymentMonth.Month, 1);
                        startDate = endMonth.AddMonths(-11);
                        endDate = endMonth.AddMonths(1);
                    }

                    // Normalize dates to first day of month for comparison
                    var startDateNormalized = new DateTime(startDate!.Value.Year, startDate.Value.Month, 1);
                    var endDateExclusive = new DateTime(endDate!.Value.Year, endDate.Value.Month, 1).AddMonths(1);

                    _logger.LogInformation(
                        "GetStatistics (Electricity): paymentType={PaymentType}, startDate={StartDate}, endDate={EndDate}, endDateExclusive={EndDateExclusive}",
                        paymentType, startDateNormalized, endDate, endDateExclusive);

                    var query = _context.ElectricityPayments
                        .Where(p => p.PaymentMonth >= startDateNormalized &&
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
                                ((p.CurrentValueNight ?? 0) - (p.PreviousValueNight ?? 0)))
                        })
                        .OrderBy(x => x.Month)
                        .ToList();

                    return Ok(new UtilityPaymentStatisticsDTO
                    {
                        MonthlyExpenses = monthlyExpenses,
                        MonthlyConsumption = monthlyConsumption
                    });
                }

                case PaymentType.Gas:
                {
                    var stats = await BuildSingleZoneStatisticsAsync(_context.GasPayments.AsQueryable());
                    return Ok(stats);
                }

                case PaymentType.Water:
                {
                    var stats = await BuildSingleZoneStatisticsAsync(_context.WaterPayments.AsQueryable());
                    return Ok(stats);
                }

                case PaymentType.Rent:
                    // Для оренди статистика не рахується
                    return Ok(new UtilityPaymentStatisticsDTO
                    {
                        MonthlyExpenses = new List<UtilityPaymentStatisticsDTO.MonthlyDataPoint>(),
                        MonthlyConsumption = new List<UtilityPaymentStatisticsDTO.MonthlyDataPoint>()
                    });

                default:
                    return BadRequest(new { message = "Unsupported payment type for statistics." });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken = default)
        {
            // Try to find payment in each specialized table
            var electricity = await _context.ElectricityPayments
                .Include(p => p.Department)
                .Include(p => p.ResponsibleEmployee)
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

            if (electricity != null)
            {
                var dto = new UtilityPaymentDTO
                {
                    Id = electricity.Id,
                    DepartmentId = electricity.DepartmentId,
                    DepartmentName = electricity.Department.Name,
                    ResponsibleEmployeeId = electricity.ResponsibleEmployeeId,
                    ResponsibleEmployeeName = electricity.ResponsibleEmployee != null ? electricity.ResponsibleEmployee.CallSign : null,
                    PaymentType = PaymentType.Electricity,
                    PaymentTypeName = PaymentType.Electricity.ToString(),
                    PreviousValue = electricity.PreviousValue,
                    CurrentValue = electricity.CurrentValue,
                    PreviousValueNight = electricity.PreviousValueNight,
                    CurrentValueNight = electricity.CurrentValueNight,
                    PricePerUnit = electricity.PricePerUnit,
                    PricePerUnitNight = electricity.PricePerUnitNight,
                    TotalAmount = electricity.TotalAmount,
                    BillImageUrl = electricity.BillImageUrl,
                    PaymentMonth = electricity.PaymentMonth,
                    CreatedAt = electricity.CreatedAt
                };

                return Ok(dto);
            }

            var gas = await _context.GasPayments
                .Include(p => p.Department)
                .Include(p => p.ResponsibleEmployee)
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

            if (gas != null)
            {
                var dto = new UtilityPaymentDTO
                {
                    Id = gas.Id,
                    DepartmentId = gas.DepartmentId,
                    DepartmentName = gas.Department.Name,
                    ResponsibleEmployeeId = gas.ResponsibleEmployeeId,
                    ResponsibleEmployeeName = gas.ResponsibleEmployee != null ? gas.ResponsibleEmployee.CallSign : null,
                    PaymentType = PaymentType.Gas,
                    PaymentTypeName = PaymentType.Gas.ToString(),
                    PreviousValue = gas.PreviousValue,
                    CurrentValue = gas.CurrentValue,
                    PreviousValueNight = null,
                    CurrentValueNight = null,
                    PricePerUnit = gas.PricePerUnit,
                    PricePerUnitNight = null,
                    TotalAmount = gas.TotalAmount,
                    BillImageUrl = gas.BillImageUrl,
                    PaymentMonth = gas.PaymentMonth,
                    CreatedAt = gas.CreatedAt
                };

                return Ok(dto);
            }

            var water = await _context.WaterPayments
                .Include(p => p.Department)
                .Include(p => p.ResponsibleEmployee)
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

            if (water != null)
            {
                var dto = new UtilityPaymentDTO
                {
                    Id = water.Id,
                    DepartmentId = water.DepartmentId,
                    DepartmentName = water.Department.Name,
                    ResponsibleEmployeeId = water.ResponsibleEmployeeId,
                    ResponsibleEmployeeName = water.ResponsibleEmployee != null ? water.ResponsibleEmployee.CallSign : null,
                    PaymentType = PaymentType.Water,
                    PaymentTypeName = PaymentType.Water.ToString(),
                    PreviousValue = water.PreviousValue,
                    CurrentValue = water.CurrentValue,
                    PreviousValueNight = null,
                    CurrentValueNight = null,
                    PricePerUnit = water.PricePerUnit,
                    PricePerUnitNight = null,
                    TotalAmount = water.TotalAmount,
                    BillImageUrl = water.BillImageUrl,
                    PaymentMonth = water.PaymentMonth,
                    CreatedAt = water.CreatedAt
                };

                return Ok(dto);
            }

            var rent = await _context.RentPayments
                .Include(p => p.Department)
                .Include(p => p.ResponsibleEmployee)
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

            if (rent != null)
            {
                var dto = new UtilityPaymentDTO
                {
                    Id = rent.Id,
                    DepartmentId = rent.DepartmentId,
                    DepartmentName = rent.Department.Name,
                    ResponsibleEmployeeId = rent.ResponsibleEmployeeId,
                    ResponsibleEmployeeName = rent.ResponsibleEmployee != null ? rent.ResponsibleEmployee.CallSign : null,
                    PaymentType = PaymentType.Rent,
                    PaymentTypeName = PaymentType.Rent.ToString(),
                    PreviousValue = null,
                    CurrentValue = null,
                    PreviousValueNight = null,
                    CurrentValueNight = null,
                    PricePerUnit = rent.PricePerUnit,
                    PricePerUnitNight = null,
                    TotalAmount = rent.TotalAmount,
                    BillImageUrl = rent.BillImageUrl,
                    PaymentMonth = rent.PaymentMonth,
                    CreatedAt = rent.CreatedAt
                };

                return Ok(dto);
            }

            return NotFound(new { message = $"Payment with ID {id} not found." });
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

            Guid createdId;
            UtilityPaymentDTO resultDto;

            try
            {
                switch (dto.PaymentType)
                {
                    case PaymentType.Electricity:
                    {
                        var payment = new ElectricityPayment
                        {
                            Id = Guid.NewGuid(),
                            DepartmentId = dto.DepartmentId,
                            ResponsibleEmployeeId = dto.ResponsibleEmployeeId,
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

                        _context.ElectricityPayments.Add(payment);
                        await _context.SaveChangesAsync(cancellationToken);

                        createdId = payment.Id;
                        resultDto = new UtilityPaymentDTO
                        {
                            Id = payment.Id,
                            DepartmentId = payment.DepartmentId,
                            DepartmentName = department.Name,
                            ResponsibleEmployeeId = payment.ResponsibleEmployeeId,
                            ResponsibleEmployeeName = dto.ResponsibleEmployeeId.HasValue
                                ? (await _context.Employees.FindAsync(new object[] { dto.ResponsibleEmployeeId.Value }, cancellationToken))?.CallSign
                                : null,
                            PaymentType = PaymentType.Electricity,
                            PaymentTypeName = PaymentType.Electricity.ToString(),
                            PreviousValue = payment.PreviousValue,
                            CurrentValue = payment.CurrentValue,
                            PreviousValueNight = payment.PreviousValueNight,
                            CurrentValueNight = payment.CurrentValueNight,
                            PricePerUnit = payment.PricePerUnit,
                            PricePerUnitNight = payment.PricePerUnitNight,
                            TotalAmount = payment.TotalAmount,
                            BillImageUrl = payment.BillImageUrl,
                            PaymentMonth = payment.PaymentMonth,
                            CreatedAt = payment.CreatedAt
                        };
                        break;
                    }

                    case PaymentType.Gas:
                    {
                        var payment = new GasPayment
                        {
                            Id = Guid.NewGuid(),
                            DepartmentId = dto.DepartmentId,
                            ResponsibleEmployeeId = dto.ResponsibleEmployeeId,
                            PreviousValue = dto.PreviousValue,
                            CurrentValue = dto.CurrentValue,
                            PricePerUnit = dto.PricePerUnit,
                            TotalAmount = dto.TotalAmount,
                            BillImageUrl = imageUrl,
                            PaymentMonth = paymentMonthDate,
                            CreatedAt = DateTime.UtcNow
                        };

                        _context.GasPayments.Add(payment);
                        await _context.SaveChangesAsync(cancellationToken);

                        createdId = payment.Id;
                        resultDto = new UtilityPaymentDTO
                        {
                            Id = payment.Id,
                            DepartmentId = payment.DepartmentId,
                            DepartmentName = department.Name,
                            ResponsibleEmployeeId = payment.ResponsibleEmployeeId,
                            ResponsibleEmployeeName = dto.ResponsibleEmployeeId.HasValue
                                ? (await _context.Employees.FindAsync(new object[] { dto.ResponsibleEmployeeId.Value }, cancellationToken))?.CallSign
                                : null,
                            PaymentType = PaymentType.Gas,
                            PaymentTypeName = PaymentType.Gas.ToString(),
                            PreviousValue = payment.PreviousValue,
                            CurrentValue = payment.CurrentValue,
                            PreviousValueNight = null,
                            CurrentValueNight = null,
                            PricePerUnit = payment.PricePerUnit,
                            PricePerUnitNight = null,
                            TotalAmount = payment.TotalAmount,
                            BillImageUrl = payment.BillImageUrl,
                            PaymentMonth = payment.PaymentMonth,
                            CreatedAt = payment.CreatedAt
                        };
                        break;
                    }

                    case PaymentType.Water:
                    {
                        var payment = new WaterPayment
                        {
                            Id = Guid.NewGuid(),
                            DepartmentId = dto.DepartmentId,
                            ResponsibleEmployeeId = dto.ResponsibleEmployeeId,
                            PreviousValue = dto.PreviousValue,
                            CurrentValue = dto.CurrentValue,
                            PricePerUnit = dto.PricePerUnit,
                            TotalAmount = dto.TotalAmount,
                            BillImageUrl = imageUrl,
                            PaymentMonth = paymentMonthDate,
                            CreatedAt = DateTime.UtcNow
                        };

                        _context.WaterPayments.Add(payment);
                        await _context.SaveChangesAsync(cancellationToken);

                        createdId = payment.Id;
                        resultDto = new UtilityPaymentDTO
                        {
                            Id = payment.Id,
                            DepartmentId = payment.DepartmentId,
                            DepartmentName = department.Name,
                            ResponsibleEmployeeId = payment.ResponsibleEmployeeId,
                            ResponsibleEmployeeName = dto.ResponsibleEmployeeId.HasValue
                                ? (await _context.Employees.FindAsync(new object[] { dto.ResponsibleEmployeeId.Value }, cancellationToken))?.CallSign
                                : null,
                            PaymentType = PaymentType.Water,
                            PaymentTypeName = PaymentType.Water.ToString(),
                            PreviousValue = payment.PreviousValue,
                            CurrentValue = payment.CurrentValue,
                            PreviousValueNight = null,
                            CurrentValueNight = null,
                            PricePerUnit = payment.PricePerUnit,
                            PricePerUnitNight = null,
                            TotalAmount = payment.TotalAmount,
                            BillImageUrl = payment.BillImageUrl,
                            PaymentMonth = payment.PaymentMonth,
                            CreatedAt = payment.CreatedAt
                        };
                        break;
                    }

                    case PaymentType.Rent:
                    {
                        var payment = new RentPayment
                        {
                            Id = Guid.NewGuid(),
                            DepartmentId = dto.DepartmentId,
                            ResponsibleEmployeeId = dto.ResponsibleEmployeeId,
                            PricePerUnit = dto.PricePerUnit,
                            TotalAmount = dto.TotalAmount,
                            BillImageUrl = imageUrl,
                            PaymentMonth = paymentMonthDate,
                            CreatedAt = DateTime.UtcNow
                        };

                        _context.RentPayments.Add(payment);
                        await _context.SaveChangesAsync(cancellationToken);

                        createdId = payment.Id;
                        resultDto = new UtilityPaymentDTO
                        {
                            Id = payment.Id,
                            DepartmentId = payment.DepartmentId,
                            DepartmentName = department.Name,
                            ResponsibleEmployeeId = payment.ResponsibleEmployeeId,
                            ResponsibleEmployeeName = dto.ResponsibleEmployeeId.HasValue
                                ? (await _context.Employees.FindAsync(new object[] { dto.ResponsibleEmployeeId.Value }, cancellationToken))?.CallSign
                                : null,
                            PaymentType = PaymentType.Rent,
                            PaymentTypeName = PaymentType.Rent.ToString(),
                            PreviousValue = null,
                            CurrentValue = null,
                            PreviousValueNight = null,
                            CurrentValueNight = null,
                            PricePerUnit = payment.PricePerUnit,
                            PricePerUnitNight = null,
                            TotalAmount = payment.TotalAmount,
                            BillImageUrl = payment.BillImageUrl,
                            PaymentMonth = payment.PaymentMonth,
                            CreatedAt = payment.CreatedAt
                        };
                        break;
                    }

                    default:
                        throw new InvalidOperationException($"Unsupported payment type: {dto.PaymentType}");
                }
            }
            catch (DbUpdateException dbEx)
            {
                _logger.LogError(dbEx, "Database error while creating utility payment");
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while creating utility payment");
                throw;
            }

            return CreatedAtAction(nameof(GetById), new { id = createdId }, resultDto);
        }
    }
}
