using EmployeeManager.API.Data;
using EmployeeManager.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManager.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FuelIncomesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public FuelIncomesController(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Отримати історію надходжень палива.
        /// Можна фільтрувати за підрозділом та типом палива.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] Guid? departmentId,
            [FromQuery] FuelType? fuelType,
            CancellationToken cancellationToken = default)
        {
            var query = _context.FuelIncomes
                .Include(fs => fs.Department)
                .Include(fs => fs.ReceiverEmployee)
                .AsQueryable();

            if (departmentId.HasValue)
            {
                query = query.Where(fs => fs.DepartmentId == departmentId.Value);
            }

            if (fuelType.HasValue)
            {
                query = query.Where(fs => fs.FuelType == fuelType.Value);
            }

            var items = await query
                .OrderByDescending(fs => fs.TransactionDate)
                .ThenByDescending(fs => fs.CreatedAt)
                .Select(fs => new
                {
                    fs.Id,
                    fs.DepartmentId,
                    DepartmentName = fs.Department != null ? fs.Department.Name : null,
                    fs.ReceiverEmployeeId,
                    ReceiverEmployeeName = fs.ReceiverEmployee != null ? fs.ReceiverEmployee.CallSign : null,
                    fs.FuelType,
                    FuelTypeName = fs.FuelType == FuelType.Gasoline ? "Бензин" : "Дізель",
                    fs.Amount,
                    fs.TransactionDate,
                    fs.CreatedAt
                })
                .ToListAsync(cancellationToken);

            return Ok(items);
        }

        /// <summary>
        /// Додати запис про надходження палива.
        /// Використовується модалкою "Додати паливо" на фронтенді.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] FuelStockEntryCreateRequest request, CancellationToken cancellationToken = default)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var entry = new FuelIncome
            {
                Id = Guid.NewGuid(),
                DepartmentId = request.DepartmentId,
                ReceiverEmployeeId = request.ReceiverEmployeeId,
                FuelType = request.FuelType,
                Amount = request.Amount,
                TransactionDate = request.TransactionDate,
                CreatedAt = DateTime.UtcNow
            };

            _context.FuelIncomes.Add(entry);
            await _context.SaveChangesAsync(cancellationToken);

            // Створюємо транзакцію руху палива (плюс)
            var transaction = new FuelTransaction
            {
                Id = Guid.NewGuid(),
                DepartmentId = entry.DepartmentId,
                Type = entry.FuelType,
                Amount = entry.Amount, // додатнє значення
                RelatedId = entry.Id,
                EntryDate = entry.TransactionDate,
                CreatedAt = DateTime.UtcNow
            };

            _context.FuelTransactions.Add(transaction);
            await _context.SaveChangesAsync(cancellationToken);

            return Ok(entry);
        }

        public class FuelStockEntryCreateRequest
        {
            public Guid DepartmentId { get; set; }
            public Guid? ReceiverEmployeeId { get; set; }
            public FuelType FuelType { get; set; }
            public decimal Amount { get; set; }
            public DateTime TransactionDate { get; set; }
        }
    }
}

